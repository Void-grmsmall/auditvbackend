/**
 * proceso.js — Endpoints Grupo 0: Proceso electoral activo
 * 
 * Obtiene el proceso activo y las elecciones disponibles.
 */
import { get } from './client.js';

/**
 * Obtiene el proceso electoral activo.
 * GET /proceso/proceso-electoral-activo
 * @returns {{ idProceso: number, nombre: string }}
 */
export async function obtenerProcesoActivo() {
  const data = await get('proceso/proceso-electoral-activo');
  return data;
}

/**
 * Obtiene todas las elecciones de un proceso.
 * GET /proceso/{idProceso}/elecciones
 * @param {number} idProceso
 * @returns {Array<{ id, nombre, tipo }>}
 */
export async function obtenerElecciones(idProceso) {
  const data = await get(`proceso/${idProceso}/elecciones`);
  return Array.isArray(data) ? data : data?.elecciones ?? [];
}

/**
 * Obtiene elecciones activas con metadata completa.
 * GET /resumen-general/elecciones?activo=1&idProceso=2&tipoFiltro=eleccion
 * @param {number} idProceso
 * @returns {Array}
 */
export async function obtenerEleccionesActivas(idProceso) {
  const data = await get('resumen-general/elecciones', {
    activo: 1,
    idProceso,
    tipoFiltro: 'eleccion',
  });
  return Array.isArray(data) ? data : data?.elecciones ?? [];
}

/**
 * Obtiene los distritos electorales (para senado/diputados).
 * GET /distrito-electoral/distritos
 * @returns {Array}
 */
export async function obtenerDistritosElectorales() {
  const data = await get('distrito-electoral/distritos');
  return Array.isArray(data) ? data : data?.distritos ?? [];
}
