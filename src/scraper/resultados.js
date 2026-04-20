/**
 * resultados.js — Endpoints Grupo 2: Resultados agregados
 */
import { get } from './client.js';
import { TIPO_FILTRO, AMBITO } from '../config/constants.js';
import { query } from '../config/database.js';

// ─── Fetchers de ONPE ─────────────────────────────────────────────────────

export async function fetchNacional(idEleccion) {
  const [totales, participantes] = await Promise.all([
    get('resumen-general/totales', { idEleccion, tipoFiltro: TIPO_FILTRO.ELECCION }),
    get('resumen-general/participantes', { idEleccion, tipoFiltro: TIPO_FILTRO.ELECCION }),
  ]);
  console.log('[DEBUG totales]', JSON.stringify(totales).substring(0, 300));
  console.log('[DEBUG participantes]', JSON.stringify(participantes).substring(0, 300));
  return { totales, participantes, nivel: 0, idUbigeo: null };
}

export async function fetchDepartamento(idEleccion, idUbigeoDepartamento, idAmbito = AMBITO.NACIONAL) {
  const [totales, participantes] = await Promise.all([
    get('resumen-general/totales', { idEleccion, tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_01, idAmbitoGeografico: idAmbito, idUbigeoDepartamento }),
    get('resumen-general/participantes', { idEleccion, tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_01, idAmbitoGeografico: idAmbito, idUbigeoDepartamento }),
  ]);
  return { totales, participantes, nivel: 1, idUbigeo: idUbigeoDepartamento };
}

export async function fetchProvincia(idEleccion, idUbigeoDepartamento, idUbigeoProvincia, idAmbito = AMBITO.NACIONAL) {
  const [totales, participantes] = await Promise.all([
    get('resumen-general/totales', { idEleccion, tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_02, idAmbitoGeografico: idAmbito, idUbigeoDepartamento, idUbigeoProvincia }),
    get('resumen-general/participantes', { idEleccion, tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_02, idAmbitoGeografico: idAmbito, idUbigeoDepartamento, idUbigeoProvincia }),
  ]);
  return { totales, participantes, nivel: 2, idUbigeo: idUbigeoProvincia };
}

export async function fetchDistrito(idEleccion, idUbigeoDepartamento, idUbigeoProvincia, idUbigeoDistrito, idAmbito = AMBITO.NACIONAL) {
  const [totales, participantes] = await Promise.all([
    get('resumen-general/totales', { idEleccion, tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_03, idAmbitoGeografico: idAmbito, idUbigeoDepartamento, idUbigeoProvincia, idUbigeoDistrito }),
    get('resumen-general/participantes', { idEleccion, tipoFiltro: TIPO_FILTRO.UBIGEO_NIVEL_03, idAmbitoGeografico: idAmbito, idUbigeoDepartamento, idUbigeoProvincia, idUbigeoDistrito }),
  ]);
  return { totales, participantes, nivel: 3, idUbigeo: idUbigeoDistrito };
}

// ─── Persistencia en BD ───────────────────────────────────────────────────

/**
 * Desenvuelve el wrapper { success, data } que devuelve la ONPE.
 */
function unwrap(raw) {
  return raw?.data ?? raw;
}

function parsearTotales(totalesRaw) {
  const d = unwrap(totalesRaw);
  return {
    actasContabilizadas: d?.contabilizadas        ?? d?.actasContabilizadas  ?? d?.actas_contabilizadas  ?? 0,
    actasTotal:          d?.totalActas             ?? d?.actasTotal           ?? d?.actas_total           ?? 0,
    porcentajeActas:     d?.actasContabilizadas    ?? d?.porcentajeActas      ?? d?.porcentaje_actas      ?? 0,
    votosValidos:        d?.votosValidos           ?? d?.votos_validos        ?? 0,
    votosBlancos:        d?.votosBlancos           ?? d?.votos_blancos        ?? 0,
    votosNulos:          d?.votosNulos             ?? d?.votos_nulos          ?? 0,
    votosImpugnados:     d?.votosImpugnados        ?? d?.votos_impugnados     ?? 0,
  };
}

export async function persistirSnapshot(idEleccion, tipoFiltro, idUbigeo, totalesRaw, participantesRaw) {
  const t = parsearTotales(totalesRaw);

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

  // Desenvuelve participantes: soporta { data: [...] }, [...], o ""
  const rawData = unwrap(participantesRaw);
  const participantes = Array.isArray(rawData) ? rawData : [];

for (const p of participantes) {
    const idParticipante = p.codigoAgrupacionPolitica ?? p.idParticipante ?? p.id_participante ?? p.id ?? null;
    const partido        = p.nombreAgrupacionPolitica ?? p.partido        ?? p.organizacion    ?? '';
    const nombre         = p.nombreCandidato ?? p.nombre ?? p.candidato ?? partido; // ← usa partido como fallback
    const votos          = parseInt(p.totalVotosValidos ?? p.votos        ?? p.totalVotos      ?? 0) || 0;
    const porcentaje     = parseFloat(p.porcentajeVotosValidos ?? p.porcentaje ?? p.porcentajeVoto ?? 0) || 0;

    await query(`
      INSERT INTO snapshots_participantes
        (id_snapshot, id_participante, nombre, partido, votos, porcentaje)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [snapshotId, idParticipante, nombre, partido, votos, porcentaje]);
}

  return snapshotId;
}
