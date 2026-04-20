/**
 * routes/alertas.js
 * 
 * GET  /api/alertas          → lista paginada de alertas
 * PATCH /api/alertas/:id     → marcar como revisada
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../../config/database.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 300 });

// ─── GET /api/alertas ─────────────────────────────────────
router.get('/', limiter, async (req, res, next) => {
  const {
    severidad,
    tipo,
    id_eleccion,
    id_ubigeo,
    no_revisadas,
    limit  = 50,
    offset = 0,
  } = req.query;

  const severidadesValidas = ['baja', 'media', 'alta', 'critica'];
  const tiposValidos = ['votos_bajan', 'benford_anomalia', 'zscore_alto', 'lote_masivo'];

  if (severidad && !severidadesValidas.includes(severidad)) {
    return res.status(400).json({
      error: `severidad inválida. Opciones: ${severidadesValidas.join(', ')}`,
    });
  }
  if (tipo && !tiposValidos.includes(tipo)) {
    return res.status(400).json({
      error: `tipo inválido. Opciones: ${tiposValidos.join(', ')}`,
    });
  }

  const limitNum  = Math.min(parseInt(limit)  || 50, 500);
  const offsetNum = parseInt(offset) || 0;

  try {
    const conditions = ['1=1'];
    const params     = [];

    if (severidad)    { conditions.push(`a.severidad = $${params.length + 1}`);    params.push(severidad); }
    if (tipo)         { conditions.push(`a.tipo = $${params.length + 1}`);          params.push(tipo); }
    if (id_eleccion)  { conditions.push(`a.id_eleccion = $${params.length + 1}`);  params.push(parseInt(id_eleccion)); }
    if (id_ubigeo)    { conditions.push(`a.id_ubigeo = $${params.length + 1}`);    params.push(id_ubigeo); }
    if (no_revisadas === 'true') { conditions.push('a.revisada = FALSE'); }

    const where = conditions.join(' AND ');

    const [dataRes, countRes] = await Promise.all([
      query(`
        SELECT a.*, e.nombre AS nombre_eleccion, u.nombre AS nombre_ubigeo
        FROM alertas a
        LEFT JOIN elecciones e ON e.id = a.id_eleccion
        LEFT JOIN ubigeos     u ON u.id_ubigeo = a.id_ubigeo
        WHERE ${where}
        ORDER BY a.generada_en DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limitNum, offsetNum]),
      query(`SELECT COUNT(*) AS total FROM alertas a WHERE ${where}`, params),
    ]);

    res.json({
      data: dataRes.rows,
      meta: {
        total:  parseInt(countRes.rows[0].total),
        limit:  limitNum,
        offset: offsetNum,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/alertas/:id ───────────────────────────────
router.patch('/:id', async (req, res, next) => {
  const { id } = req.params;
  const idNum = parseInt(id);
  if (isNaN(idNum)) return res.status(400).json({ error: 'id debe ser un número' });

  try {
    const result = await query(
      'UPDATE alertas SET revisada = TRUE WHERE id = $1 RETURNING *',
      [idNum]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;
