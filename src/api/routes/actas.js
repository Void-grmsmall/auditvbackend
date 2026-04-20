/**
 * routes/actas.js
 * 
 * GET /api/actas/:idUbigeo?idEleccion=10 → actas de un distrito (paginado)
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../../config/database.js';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 100 });

router.get('/:idUbigeo', limiter, async (req, res, next) => {
  const { idUbigeo } = req.params;
  const { idEleccion, limit = 50, offset = 0 } = req.query;

  if (!idEleccion) {
    return res.status(400).json({ error: 'idEleccion es requerido como query param' });
  }

  const limitNum  = Math.min(parseInt(limit)  || 50, 500);
  const offsetNum = parseInt(offset) || 0;

  try {
    const [dataRes, countRes] = await Promise.all([
      query(`
        SELECT id, id_acta_onpe, numero_mesa, estado, total_votos, capturado_en
        FROM actas
        WHERE id_ubigeo = $1 AND id_eleccion = $2
        ORDER BY numero_mesa ASC
        LIMIT $3 OFFSET $4
      `, [idUbigeo, parseInt(idEleccion), limitNum, offsetNum]),
      query(
        'SELECT COUNT(*) AS total FROM actas WHERE id_ubigeo = $1 AND id_eleccion = $2',
        [idUbigeo, parseInt(idEleccion)]
      ),
    ]);

    res.json({
      data: dataRes.rows,
      meta: {
        idUbigeo,
        idEleccion: parseInt(idEleccion),
        total:  parseInt(countRes.rows[0].total),
        limit:  limitNum,
        offset: offsetNum,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
