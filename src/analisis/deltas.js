/**
 * deltas.js — Detección de votos que bajan entre snapshots
 * 
 * Un candidato NO puede perder votos entre dos snapshots consecutivos.
 * Si lo hace, es matemáticamente imposible y se genera una alerta CRÍTICA.
 */
import { query } from '../config/database.js';

/**
 * Para cada elección y ámbito, compara el último snapshot con el anterior.
 * Genera alertas de tipo 'votos_bajan' si detecta deltas negativos.
 */
export async function detectarAnomalias() {
  console.log('[Deltas] Analizando anomalías...');

  // Obtener todos los pares de snapshots (actual, anterior) por elección y ubigeo
  const pares = await query(`
    WITH ranked AS (
      SELECT
        id,
        id_eleccion,
        tipo_filtro,
        id_ubigeo,
        capturado_en,
        LAG(id) OVER (PARTITION BY id_eleccion, tipo_filtro, id_ubigeo ORDER BY capturado_en) AS id_anterior
      FROM snapshots_totales
    )
    SELECT r.id AS id_actual, r.id_anterior, r.id_eleccion, r.tipo_filtro, r.id_ubigeo
    FROM ranked r
    WHERE r.id_anterior IS NOT NULL
    ORDER BY r.capturado_en DESC
    LIMIT 500
  `);

  let alertasGeneradas = 0;

  for (const par of pares.rows) {
    const { id_actual, id_anterior, id_eleccion, id_ubigeo } = par;

    // Comparar participantes entre snapshot actual y anterior
const comparacion = await query(`
  SELECT
    curr.id_participante,
    COALESCE(NULLIF(curr.nombre, ''), curr.partido, 'Participante ' || curr.id_participante::text) AS nombre,
    prev.votos AS votos_anterior,
    curr.votos AS votos_actual,
    (curr.votos - prev.votos) AS delta
  FROM snapshots_participantes curr
  JOIN snapshots_participantes prev
    ON prev.id_snapshot = $2
    AND prev.id_participante = curr.id_participante
  WHERE curr.id_snapshot = $1
    AND (curr.votos - prev.votos) < 0
`, [id_actual, id_anterior]);

    for (const row of comparacion.rows) {
      // Verificar que no existe ya una alerta para este par exacto de valores
      const yaExiste = await query(`
        SELECT id FROM alertas
        WHERE tipo = 'votos_bajan'
          AND id_eleccion = $1
          AND id_participante = $2
          AND id_ubigeo IS NOT DISTINCT FROM $3
          AND valor_anterior = $4::text
          AND valor_actual   = $5::text
        LIMIT 1
      `, [id_eleccion, row.id_participante, id_ubigeo,
          String(row.votos_anterior), String(row.votos_actual)]);

      if (yaExiste.rows.length > 0) continue;

      await query(`
        INSERT INTO alertas
          (tipo, severidad, id_eleccion, id_participante, nombre_participante,
           id_ubigeo, valor_anterior, valor_actual, diferencia, descripcion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        'votos_bajan',
        'critica',
        id_eleccion,
        row.id_participante,
        row.nombre,
        id_ubigeo,
        row.votos_anterior,
        row.votos_actual,
        row.delta,
        `🚨 ${row.nombre} PERDIÓ ${Math.abs(row.delta)} votos en ubigeo ${id_ubigeo ?? 'NACIONAL'}. ` +
        `Anterior: ${row.votos_anterior.toLocaleString()}, Actual: ${row.votos_actual.toLocaleString()}.`,
      ]);

      alertasGeneradas++;
      console.warn(
        `[Deltas] 🚨 ALERTA CRÍTICA: ${row.nombre} Δvotos=${row.delta} ` +
        `en elección ${id_eleccion}, ubigeo ${id_ubigeo ?? 'NACIONAL'}`
      );
    }
  }

  if (alertasGeneradas > 0) {
    console.warn(`[Deltas] ⚠ ${alertasGeneradas} alertas de votos negativos generadas.`);
  } else {
    console.log('[Deltas] ✓ Sin anomalías de deltas negativos.');
  }
}
