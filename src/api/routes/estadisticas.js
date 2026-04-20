/**
 * routes/estadisticas.js
 * 
 * GET /api/estadisticas/benford/:idEleccion/:idUbigeo → análisis Benford
 * GET /api/estadisticas/zscore/:idEleccion            → outliers Z-score
 * GET /api/estadisticas/export/alertas.csv            → exportar CSV
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../../config/database.js';
import { analizarBenfordDB } from '../../analisis/benford.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 50 });

// ─── Benford ──────────────────────────────────────────────
router.get('/benford/:idEleccion/:idUbigeo', limiter, async (req, res, next) => {
  const { idEleccion, idUbigeo } = req.params;
  const id = parseInt(idEleccion);
  if (isNaN(id)) return res.status(400).json({ error: 'idEleccion inválido' });

  try {
    const resultado = await analizarBenfordDB(idUbigeo, id);
    res.json({ data: resultado });
  } catch (err) {
    next(err);
  }
});

// ─── Benford nacional (sin ubigeo específico) ─────────────
router.get('/benford/:idEleccion', limiter, async (req, res, next) => {
  const { idEleccion } = req.params;
  const id = parseInt(idEleccion);
  if (isNaN(id)) return res.status(400).json({ error: 'idEleccion inválido' });

  try {
    // Obtener todos los totales de actas para esta elección
    const res_ = await query(`
      SELECT total_votos FROM actas
      WHERE id_eleccion = $1 AND total_votos IS NOT NULL AND total_votos > 0
    `, [id]);

    const { analizarBenford } = await import('../../analisis/benford.js');
    const valores = res_.rows.map(r => parseInt(r.total_votos));
    const resultado = analizarBenford(valores);

    res.json({ data: resultado, n_actas: valores.length });
  } catch (err) {
    next(err);
  }
});

// ─── Z-score ──────────────────────────────────────────────
router.get('/zscore/:idEleccion', limiter, async (req, res, next) => {
  const { idEleccion } = req.params;
  const id = parseInt(idEleccion);
  if (isNaN(id)) return res.status(400).json({ error: 'idEleccion inválido' });

  try {
    // Obtener outliers desde alertas
    const result = await query(`
      SELECT * FROM alertas
      WHERE tipo = 'zscore_alto' AND id_eleccion = $1
      ORDER BY ABS(valor_actual) DESC
      LIMIT 100
    `, [id]);

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── Resumen general ──────────────────────────────────────
router.get('/resumen/:idEleccion', async (req, res, next) => {
  const { idEleccion } = req.params;
  const id = parseInt(idEleccion);
  if (isNaN(id)) return res.status(400).json({ error: 'idEleccion inválido' });

  try {
    const [alertasCount, actasCount, snapshotsCount, ultimoSnap] = await Promise.all([
      query('SELECT COUNT(*) AS total, tipo, severidad FROM alertas WHERE id_eleccion = $1 GROUP BY tipo, severidad', [id]),
      query('SELECT COUNT(*) AS total FROM actas WHERE id_eleccion = $1', [id]),
      query('SELECT COUNT(*) AS total FROM snapshots_totales WHERE id_eleccion = $1', [id]),
      query(`
        SELECT porcentaje_actas, actas_contabilizadas, actas_total, capturado_en
        FROM snapshots_totales
        WHERE id_eleccion = $1 AND tipo_filtro = 'eleccion'
        ORDER BY capturado_en DESC LIMIT 1
      `, [id]),
    ]);

    res.json({
      data: {
        alertas_por_tipo: alertasCount.rows,
        total_actas_en_bd: parseInt(actasCount.rows[0]?.total ?? 0),
        total_snapshots: parseInt(snapshotsCount.rows[0]?.total ?? 0),
        ultimo_snapshot: ultimoSnap.rows[0] ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Export CSV de alertas ────────────────────────────────
router.get('/export/alertas.csv', rateLimit({ windowMs: 60_000, max: 10 }), async (_req, res, next) => {
  try {
    const result = await query(`
      SELECT a.*, e.nombre AS eleccion, u.nombre AS ubigeo_nombre
      FROM alertas a
      LEFT JOIN elecciones e ON e.id = a.id_eleccion
      LEFT JOIN ubigeos    u ON u.id_ubigeo = a.id_ubigeo
      ORDER BY a.generada_en DESC
    `);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="alertas_auditavoto.csv"');

    // BOM para Excel en Windows
    res.write('\uFEFF');
    res.write('id,tipo,severidad,eleccion,participante,ubigeo,valor_anterior,valor_actual,diferencia,descripcion,generada_en\n');

    for (const row of result.rows) {
      const line = [
        row.id, row.tipo, row.severidad,
        `"${(row.eleccion || '').replace(/"/g, '""')}"`,
        `"${(row.nombre_participante || '').replace(/"/g, '""')}"`,
        row.id_ubigeo || '',
        row.valor_anterior ?? '',
        row.valor_actual ?? '',
        row.diferencia ?? '',
        `"${(row.descripcion || '').replace(/"/g, '""')}"`,
        row.generada_en,
      ].join(',');
      res.write(line + '\n');
    }

    res.end();
  } catch (err) {
    next(err);
  }
});

export default router;
