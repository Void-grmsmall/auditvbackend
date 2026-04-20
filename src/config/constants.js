/**
 * constants.js — Constantes globales del sistema
 * Endpoints ONPE reales mapeados el 19/04/2026
 */

export const ONPE_BASE_URL =
  process.env.ONPE_BASE_URL ||
  'https://resultadoelectoral.onpe.gob.pe/presentacion-backend';

export const ONPE_ID_PROCESO = parseInt(process.env.ONPE_ID_PROCESO || '2');

// IDs de elección activos en EG2026
export const ONPE_ELECCIONES = (process.env.ONPE_ELECCIONES || '10,12,13,14,15')
  .split(',')
  .map(Number);

// Nombres amigables de cada elección
export const NOMBRE_ELECCION = {
  10: 'Presidente y Vicepresidentes',
  12: 'Senado',
  13: 'Diputados',
  14: 'Diputados (variante)',
  15: 'Parlamento Andino',
};

// Delay mínimo entre requests ONPE (1100ms = < 1 req/seg)
export const REQUEST_DELAY_MS = parseInt(process.env.ONPE_REQUEST_DELAY_MS || '1100');
export const MAX_RETRIES       = parseInt(process.env.ONPE_MAX_RETRIES || '3');
export const TIMEOUT_MS        = parseInt(process.env.ONPE_TIMEOUT_MS || '15000');

// Umbrales estadísticos
export const BENFORD_UMBRAL_CHI2 = parseFloat(process.env.BENFORD_UMBRAL_CHI2 || '15.51');
export const ZSCORE_UMBRAL       = parseFloat(process.env.ZSCORE_UMBRAL || '3.0');

// Tipos de ámbito geográfico ONPE
export const AMBITO = {
  NACIONAL:   1,
  EXTRANJERO: 2,
};

// Tipos de filtro para los endpoints de resultados
export const TIPO_FILTRO = {
  ELECCION:            'eleccion',
  DISTRITO_ELECTORAL:  'distrito_electoral',
  UBIGEO_NIVEL_01:     'ubigeo_nivel_01',   // Departamento
  UBIGEO_NIVEL_02:     'ubigeo_nivel_02',   // Provincia
  UBIGEO_NIVEL_03:     'ubigeo_nivel_03',   // Distrito
  AMBITO_GEOGRAFICO:   'ambito_geografico', // Para mapa de calor
};

// User-Agent respetuoso
export const USER_AGENT =
  'AuditaVoto/1.0 Citizen-Audit-Tool (auditoria@auditavoto.pe)';
