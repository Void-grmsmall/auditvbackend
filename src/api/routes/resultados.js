/**
 * routes/resultados.js
 * 
 * GET /api/resultados/:idEleccion         → último snapshot nacional
 * GET /api/resultados/:idEleccion/historia → serie temporal
 * GET /api/resultados/:idEleccion/ubigeo/:idUbigeo → resultados por ubigeo
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../../config/database.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 200 });

// ─── GET /api/resultados/:idEleccion ──────────────────────
router.get('/:idEleccion', limiter, async (req, res, next) => {
  const { idEleccion } = req.params;
  const id = parseInt(idEleccion);
  if (isNaN(id)) return res.status(400).json({ error: 'idEleccion debe ser un número' });

  try {
    // Último snapshot nacional para esta elección
    const snapRes = await query(`
      SELECT st.*
      FROM snapshots_totales st
      WHERE st.id_eleccion = $1 AND st.tipo_filtro = 'eleccion'
      ORDER BY st.capturado_en DESC
      LIMIT 1
    `, [id]);

    if (snapRes.rows.length === 0) {
      return res.json({ data: null, mensaje: 'Sin datos aún. El scraper aún no ha ejecutado.' });
    }

    const snapshot = snapRes.rows[0];

    // Participantes de ese snapshot
    const partRes = await query(`
      SELECT * FROM snapshots_participantes
      WHERE id_snapshot = $1
      ORDER BY votos DESC
    `, [snapshot.id]);

    res.json({
      data: {
        snapshot,
        participantes: partRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/resultados/:idEleccion/historia ─────────────
router.get('/:idEleccion/historia', limiter, async (req, res, next) => {
  const { idEleccion } = req.params;
  const { idParticipante, idUbigeo, limit = 100 } = req.query;
  const id = parseInt(idEleccion);
  if (isNaN(id)) return res.status(400).json({ error: 'idEleccion debe ser un número' });

  try {
    let sql, params;

    if (idParticipante) {
      // Serie temporal de votos para un participante específico
      sql = `
        SELECT
          st.capturado_en,
          st.porcentaje_actas,
          COALESCE(st.id_ubigeo, 'NACIONAL') AS ambito,
          sp.votos,
          sp.porcentaje,
          sp.nombre
        FROM snapshots_participantes sp
        JOIN snapshots_totales st ON st.id = sp.id_snapshot
        WHERE st.id_eleccion = $1
          AND sp.id_participante = $2
          AND st.tipo_filtro = $3
        ORDER BY st.capturado_en ASC
        LIMIT $4
      `;
      const tipoFiltro = idUbigeo ? (idUbigeo.endsWith('0000') ? 'ubigeo_nivel_01' : idUbigeo.endsWith('00') ? 'ubigeo_nivel_02' : 'ubigeo_nivel_03') : 'eleccion';
      params = [id, parseInt(idParticipante), tipoFiltro, parseInt(limit)];
    } else {
      // Historia del porcentaje de actas procesadas
      sql = `
        SELECT capturado_en, actas_contabilizadas, actas_total, porcentaje_actas
        FROM snapshots_totales
        WHERE id_eleccion = $1 AND tipo_filtro = 'eleccion'
        ORDER BY capturado_en ASC
        LIMIT $2
      `;
      params = [id, parseInt(limit)];
    }

    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/resultados/:idEleccion/ubigeo/:idUbigeo ─────
router.get('/:idEleccion/ubigeo/:idUbigeo', limiter, async (req, res, next) => {
  const { idEleccion, idUbigeo } = req.params;
  const id = parseInt(idEleccion);
  if (isNaN(id)) return res.status(400).json({ error: 'idEleccion debe ser un número' });

  try {
    const snap = await query(`
      SELECT st.* FROM snapshots_totales st
      WHERE st.id_eleccion = $1 AND st.id_ubigeo = $2
      ORDER BY st.capturado_en DESC LIMIT 1
    `, [id, idUbigeo]);

    if (snap.rows.length === 0) {
      return res.json({ data: null, mensaje: `Sin datos para ubigeo ${idUbigeo}` });
    }

    const snapshot = snap.rows[0];
    const part = await query(
      'SELECT * FROM snapshots_participantes WHERE id_snapshot = $1 ORDER BY votos DESC',
      [snapshot.id]
    );

    res.json({ data: { snapshot, participantes: part.rows } });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/resultados/elecciones ───────────────────────
router.get('/catalogo/elecciones', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM elecciones ORDER BY id');
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

export default router;
