/**
 * zscore.js — Detección de outliers por Z-score
 * 
 * Para cada candidato, calcula la distribución de sus porcentajes
 * a nivel distrito. Distritos con |Z| > 3 se marcan como atípicos.
 */
import { query } from '../config/database.js';
import { ZSCORE_UMBRAL } from '../config/constants.js';

/**
 * Calcula media y desviación estándar muestral.
 * @param {number[]} arr
 */
function estadisticos(arr) {
  const n = arr.length;
  if (n < 2) return { media: arr[0] ?? 0, desviacion: 0 };

  const media = arr.reduce((a, b) => a + b, 0) / n;
  const varianza = arr.reduce((s, x) => s + Math.pow(x - media, 2), 0) / (n - 1);
  return { media, desviacion: Math.sqrt(varianza) };
}

/**
 * Calcula z-scores para un array de { idUbigeo, porcentaje }.
 * @param {Array<{idUbigeo: string, porcentaje: number}>} datos
 * @param {number} umbral
 * @returns {Array<{idUbigeo, porcentaje, zscore, esOutlier, media, desviacion}>}
 */
export function calcularZScores(datos, umbral = ZSCORE_UMBRAL) {
  if (datos.length < 5) {
    return datos.map(d => ({ ...d, zscore: null, esOutlier: false, razon: 'Muestra < 5' }));
  }

  const porcentajes = datos.map(d => d.porcentaje);
  const { media, desviacion } = estadisticos(porcentajes);

  return datos.map(d => {
    const zscore = desviacion > 0 ? (d.porcentaje - media) / desviacion : 0;
    return {
      ...d,
      media:      Math.round(media * 10000) / 10000,
      desviacion: Math.round(desviacion * 10000) / 10000,
      zscore:     Math.round(zscore * 1000000) / 1000000,
      esOutlier:  Math.abs(zscore) > umbral,
    };
  });
}

/**
 * Ejecuta Z-score sobre el último snapshot de una elección y genera alertas.
 * @param {number} idEleccion
 */
export async function ejecutarZScoreGlobal(idEleccion) {
  console.log(`[Z-score] Analizando elección ${idEleccion}...`);

  // Último snapshot nacional
  const ultimoSnap = await query(`
    SELECT id FROM snapshots_totales
    WHERE id_eleccion = $1 AND tipo_filtro = 'ubigeo_nivel_03'
    ORDER BY capturado_en DESC LIMIT 1
  `, [idEleccion]);

  if (ultimoSnap.rows.length === 0) {
    console.log(`[Z-score] Sin snapshots de nivel_03 para elección ${idEleccion}.`);
    return;
  }

  // Por cada participante, obtener porcentajes por distrito
  const participantes = await query(`
    SELECT DISTINCT id_participante, nombre
    FROM snapshots_participantes
    WHERE id_snapshot = $1
  `, [ultimoSnap.rows[0].id]);

  let alertasGeneradas = 0;

  for (const part of participantes.rows) {
    const datos = await query(`
      SELECT sp.id_participante, st.id_ubigeo, sp.porcentaje
      FROM snapshots_participantes sp
      JOIN snapshots_totales st ON st.id = sp.id_snapshot
      WHERE st.id_eleccion = $1
        AND st.tipo_filtro = 'ubigeo_nivel_03'
        AND sp.id_participante = $2
        AND sp.porcentaje IS NOT NULL
      ORDER BY st.capturado_en DESC
    `, [idEleccion, part.id_participante]);

    if (datos.rows.length < 5) continue;

    const input = datos.rows.map(r => ({
      idUbigeo:   r.id_ubigeo,
      porcentaje: parseFloat(r.porcentaje),
    }));

    const resultados = calcularZScores(input);
    const outliers   = resultados.filter(r => r.esOutlier);

    for (const o of outliers) {
      await query(`
        INSERT INTO alertas
          (tipo, severidad, id_eleccion, id_participante, nombre_participante,
           id_ubigeo, valor_actual, descripcion)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `, [
        'zscore_alto',
        Math.abs(o.zscore) > 5 ? 'alta' : 'media',
        idEleccion,
        part.id_participante,
        part.nombre,
        o.idUbigeo,
        o.zscore,
        `Z-score=${o.zscore.toFixed(2)} para ${part.nombre} en ubigeo ${o.idUbigeo}. ` +
        `Porcentaje: ${o.porcentaje.toFixed(2)}% (media: ${o.media.toFixed(2)}%, σ: ${o.desviacion.toFixed(2)}%)`,
      ]);
      alertasGeneradas++;
    }
  }

  console.log(`[Z-score] ✓ ${alertasGeneradas} outliers detectados en elección ${idEleccion}.`);
}
