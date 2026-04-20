/**
 * benford.js — Análisis de Ley de Benford (1er dígito)
 * 
 * Verifica si los totales de votos por mesa siguen la distribución esperada.
 * Se aplica sobre datos de actas individuales por ubigeo.
 * 
 * SUPUESTOS:
 * - Mínimo 100 actas para que el test sea significativo
 * - chi² > 15.51 con 8 gdl implica p < 0.05 → anomalía estadística
 */
import { query } from '../config/database.js';
import { BENFORD_UMBRAL_CHI2 } from '../config/constants.js';

// Frecuencias esperadas según la Ley de Benford (primer dígito 1-9)
export const BENFORD_ESPERADO = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

/**
 * Extrae el primer dígito significativo de un número positivo.
 * @param {number} n
 * @returns {number|null} 1-9 o null si no aplica
 */
export function primerDigito(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  const str = String(Math.floor(Math.abs(n)));
  const d = parseInt(str[0]);
  return d >= 1 ? d : null;
}

/**
 * Calcula el estadístico chi-cuadrado de Benford.
 * 
 * @param {number[]} valores - Array de totales de votos
 * @param {number} umbral    - Mínimo de muestras requeridas
 * @returns {{ chi2, anomalia, distribucion, n }}
 */
export function analizarBenford(valores, umbral = 100) {
  const conteos = new Array(9).fill(0);
  let nValidos = 0;

  for (const v of valores) {
    const d = primerDigito(v);
    if (d !== null) {
      conteos[d - 1]++;
      nValidos++;
    }
  }

  if (nValidos < umbral) {
    return {
      chi2:        null,
      anomalia:    false,
      n:           nValidos,
      rechazo:     `Muestra insuficiente: ${nValidos} < ${umbral}`,
      distribucion: null,
    };
  }

  // chi² = Σ (observado - esperado)² / esperado
  let chi2 = 0;
  const distribucion = conteos.map((obs, i) => {
    const esperado = BENFORD_ESPERADO[i] * nValidos;
    chi2 += Math.pow(obs - esperado, 2) / esperado;
    return {
      digito:    i + 1,
      observado: obs / nValidos,
      esperado:  BENFORD_ESPERADO[i],
      conteo:    obs,
    };
  });

  chi2 = Math.round(chi2 * 10000) / 10000;

  return {
    chi2,
    n: nValidos,
    anomalia:     chi2 > umbral,
    distribucion,
    rechazo:      chi2 > BENFORD_UMBRAL_CHI2
      ? `chi²=${chi2} > umbral ${BENFORD_UMBRAL_CHI2} → p < 0.05`
      : null,
  };
}

/**
 * Ejecuta análisis Benford para un ubigeo+elección usando actas en BD.
 */
export async function analizarBenfordDB(idUbigeo, idEleccion) {
  const res = await query(`
    SELECT total_votos FROM actas
    WHERE id_ubigeo = $1 AND id_eleccion = $2
      AND total_votos IS NOT NULL AND total_votos > 0
  `, [idUbigeo, idEleccion]);

  const valores = res.rows.map(r => parseInt(r.total_votos));
  return analizarBenford(valores, BENFORD_UMBRAL_CHI2 > 15 ? 100 : 50);
}

/**
 * Genera alertas de Benford para todos los ubigeos con suficientes actas.
 */
export async function ejecutarBenfordGlobal(idEleccion) {
  console.log(`[Benford] Analizando elección ${idEleccion}...`);

  // Ubigeos con al menos 100 actas
  const ubigeos = await query(`
    SELECT id_ubigeo, COUNT(*) AS n
    FROM actas
    WHERE id_eleccion = $1 AND total_votos IS NOT NULL
    GROUP BY id_ubigeo
    HAVING COUNT(*) >= 100
  `, [idEleccion]);

  let anomalias = 0;

  for (const { id_ubigeo, n } of ubigeos.rows) {
    const resultado = await analizarBenfordDB(id_ubigeo, idEleccion);

    if (resultado.anomalia) {
      anomalias++;
      await query(`
        INSERT INTO alertas
          (tipo, severidad, id_eleccion, id_ubigeo, valor_actual, descripcion)
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT DO NOTHING
      `, [
        'benford_anomalia',
        'alta',
        idEleccion,
        id_ubigeo,
        resultado.chi2,
        `Benford: chi²=${resultado.chi2} (n=${resultado.n}) en ubigeo ${id_ubigeo}. ${resultado.rechazo}`,
      ]);
    }
  }

  console.log(`[Benford] ✓ ${ubigeos.rows.length} ubigeos analizados, ${anomalias} anomalías.`);
}
