/**
 * actas.js — Endpoints Grupo 4: Actas individuales (paginadas)
 * 
 * Descarga todas las actas de un distrito para análisis Benford.
 * Pagina hasta agotar (tamaño=15 por página).
 */
import { get } from './client.js';
import { query } from '../config/database.js';
import { AMBITO } from '../config/constants.js';

const TAMANO_PAGINA = 15;

/**
 * Descarga todas las actas de un ubigeo/elección paginando.
 * 
 * @param {string} idUbigeo    - ej: '150101'
 * @param {number} idEleccion
 * @param {number} idAmbito
 * @returns {Promise<Array>}   - Lista de actas
 */
export async function descargarActas(idUbigeo, idEleccion, idAmbito = AMBITO.NACIONAL) {
  const todas = [];
  let pagina = 0;
  let continuar = true;

  while (continuar) {
    try {
      const data = await get('/actas', {
        pagina,
        tamanio: TAMANO_PAGINA,
        idAmbitoGeografico: idAmbito,
        idUbigeo,
      });

      const actas = Array.isArray(data) ? data : data?.actas ?? data?.contenido ?? [];

      if (actas.length === 0) {
        continuar = false;
      } else {
        todas.push(...actas);
        pagina++;

        // Si recibimos menos que el tamaño de página, no hay más páginas
        if (actas.length < TAMANO_PAGINA) {
          continuar = false;
        }
      }
    } catch (err) {
      console.warn(`[Actas] Error en página ${pagina} de ${idUbigeo}: ${err.message}`);
      continuar = false;
    }
  }

  return todas;
}

/**
 * Persiste actas en la BD (idempotente: ignora duplicados).
 * 
 * @param {string} idUbigeo
 * @param {number} idEleccion
 * @param {Array}  actas
 * @returns {number} Cantidad de actas insertadas
 */
export async function persistirActas(idUbigeo, idEleccion, actas) {
  let insertadas = 0;

  for (const acta of actas) {
    const idActaOnpe  = acta.idActa ?? acta.id_acta ?? acta.codigoActa ?? null;
    const numeroMesa  = acta.numeroMesa ?? acta.numero_mesa ?? null;
    const estado      = acta.estado ?? acta.estadoActa ?? null;
    const totalVotos  = parseInt(acta.totalVotos ?? acta.total_votos ?? 0) || null;
    const idAmbito    = acta.idAmbitoGeografico ?? AMBITO.NACIONAL;

    try {
      await query(`
        INSERT INTO actas
          (id_acta_onpe, id_eleccion, id_ubigeo, id_ambito,
           numero_mesa, estado, total_votos, datos_raw)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (id_acta_onpe) DO NOTHING
      `, [idActaOnpe, idEleccion, idUbigeo, idAmbito, numeroMesa, estado, totalVotos, JSON.stringify(acta)]);
      insertadas++;
    } catch {
      // Si id_acta_onpe es null, insertar sin constraint de unicidad
      await query(`
        INSERT INTO actas
          (id_eleccion, id_ubigeo, id_ambito,
           numero_mesa, estado, total_votos, datos_raw)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [idEleccion, idUbigeo, idAmbito, numeroMesa, estado, totalVotos, JSON.stringify(acta)]);
      insertadas++;
    }
  }

  return insertadas;
}
