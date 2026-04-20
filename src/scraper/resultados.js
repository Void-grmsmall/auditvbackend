/**
 * resultados.js — Endpoints Grupo 2: Resultados agregados
 * 
 * Core del scraper. Obtiene totales y participantes por nivel.
 */
import { get } from './client.js';
import { TIPO_FILTRO, AMBITO } from '../config/constants.js';
import { query } from '../config/database.js';

// ─── Fetchers de ONPE ─────────────────────────────────────────────────────

/**
 * Resultados nacionales para una elección.
 */
export async function fetchNacional(idEleccion) {
  const [totales, participantes] = await Promise.all([
    get('resumen-general/totales', { idEleccion, tipoFiltro: TIPO_FILTRO.ELECCION }),
    get('resumen-general/participantes', { idEleccion, tipoFiltro: TIPO_FILTRO.ELECCION }),
  ]);
  console.log('[DEBUG totales]', JSON.stringify(totales).substring(0, 300));
  console.log('[DEBUG participantes]', JSON.stringify(participantes).substring(0, 300));
  return { totales, participantes, nivel: 0, idUbigeo: null };
}

/**
 * Resultados por departamento.
 */
export async function fetchDepartamento(idEleccion, idUbigeoDepartamento, idAmbito = AMBITO.NACIONAL) {
  const [totales, participantes] = await Promise.all([
    get('resumen-general/totales', {
      idEleccion,
      tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_01,
      idAmbitoGeografico: idAmbito,
      idUbigeoDepartamento,
    }),
    get('resumen-general/participantes', {
      idEleccion,
      tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_01,
      idAmbitoGeografico: idAmbito,
      idUbigeoDepartamento,
    }),
  ]);
  return { totales, participantes, nivel: 1, idUbigeo: idUbigeoDepartamento };
}

/**
 * Resultados por provincia.
 */
export async function fetchProvincia(idEleccion, idUbigeoDepartamento, idUbigeoProvincia, idAmbito = AMBITO.NACIONAL) {
  const [totales, participantes] = await Promise.all([
    get('resumen-general/totales', {
      idEleccion,
      tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_02,
      idAmbitoGeografico: idAmbito,
      idUbigeoDepartamento,
      idUbigeoProvincia,
    }),
    get('resumen-general/participantes', {
      idEleccion,
      tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_02,
      idAmbitoGeografico: idAmbito,
      idUbigeoDepartamento,
      idUbigeoProvincia,
    }),
  ]);
  return { totales, participantes, nivel: 2, idUbigeo: idUbigeoProvincia };
}

/**
 * Resultados por distrito.
 */
export async function fetchDistrito(idEleccion, idUbigeoDepartamento, idUbigeoProvincia, idUbigeoDistrito, idAmbito = AMBITO.NACIONAL) {
  const [totales, participantes] = await Promise.all([
    get('resumen-general/totales', {
      idEleccion,
      tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_03,
      idAmbitoGeografico: idAmbito,
      idUbigeoDepartamento,
      idUbigeoProvincia,
      idUbigeoDistrito,
    }),
    get('/resumen-general/participantes', {
      idEleccion,
      tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_03,
      idAmbitoGeografico: idAmbito,
      idUbigeoDepartamento,
      idUbigeoProvincia,
      idUbigeoDistrito,
    }),
  ]);
  return { totales, participantes, nivel: 3, idUbigeo: idUbigeoDistrito };
}

// ─── Persistencia en BD ───────────────────────────────────────────────────

/**
 * Parsea el objeto totales de ONPE (estructura puede variar).
 */
function parsearTotales(totales) {
  return {
    actasContabilizadas:  totales?.actasContabilizadas  ?? totales?.actas_contabilizadas  ?? 0,
    actasTotal:           totales?.actasTotal            ?? totales?.actas_total            ?? 0,
    porcentajeActas:      totales?.porcentajeActas       ?? totales?.porcentaje_actas       ?? 0,
    votosValidos:         totales?.votosValidos          ?? totales?.votos_validos          ?? 0,
    votosBlancos:         totales?.votosBlancos          ?? totales?.votos_blancos          ?? 0,
    votosNulos:           totales?.votosNulos            ?? totales?.votos_nulos            ?? 0,
    votosImpugnados:      totales?.votosImpugnados       ?? totales?.votos_impugnados       ?? 0,
  };
}

/**
 * Persiste un snapshot de resultados en la BD.
 * Retorna el ID del snapshot creado.
 * 
 * @param {number} idEleccion
 * @param {string} tipoFiltro
 * @param {string|null} idUbigeo
 * @param {object} totalesRaw
 * @param {Array} participantesRaw
 * @returns {Promise<bigint>} ID del snapshot insertado
 */
export async function persistirSnapshot(idEleccion, tipoFiltro, idUbigeo, totalesRaw, participantesRaw) {
  const t = parsearTotales(totalesRaw);

  // Insertar snapshot cabecera
  const snapshotRes = await query(`
    INSERT INTO snapshots_totales
      (id_eleccion, tipo_filtro, id_ubigeo,
       actas_contabilizadas, actas_total, porcentaje_actas,
       votos_validos, votos_blancos, votos_nulos, votos_impugnados)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id
  `, [
    idEleccion, tipoFiltro, idUbigeo,
    t.actasContabilizadas, t.actasTotal, t.porcentajeActas,
    t.votosValidos, t.votosBlancos, t.votosNulos, t.votosImpugnados,
  ]);

  const snapshotId = snapshotRes.rows[0].id;

  // Insertar participantes
  const participantes = Array.isArray(participantesRaw)
    ? participantesRaw
    : participantesRaw?.participantes ?? [];

  for (const p of participantes) {
    const idParticipante = p.idParticipante ?? p.id_participante ?? p.id;
    const nombre         = p.nombre ?? p.candidato ?? '';
    const partido        = p.partido ?? p.organizacion ?? '';
    const votos          = parseInt(p.votos ?? p.totalVotos ?? 0) || 0;
    const porcentaje     = parseFloat(p.porcentaje ?? p.porcentajeVoto ?? 0) || 0;

    await query(`
      INSERT INTO snapshots_participantes
        (id_snapshot, id_participante, nombre, partido, votos, porcentaje)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [snapshotId, idParticipante, nombre, partido, votos, porcentaje]);
  }

  return snapshotId;
}
