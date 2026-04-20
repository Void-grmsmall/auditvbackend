/**
 * client.js — HTTP Client con rate limiting y retry para ONPE
 * 
 * Todas las llamadas al portal ONPE pasan por aquí.
 * Garantiza respetar el rate limit de 1 req/seg.
 */
import axios from 'axios';
import { ONPE_BASE_URL, REQUEST_DELAY_MS, MAX_RETRIES, TIMEOUT_MS, USER_AGENT } from '../config/constants.js';

console.log('[CLIENT] ONPE_BASE_URL en uso:', ONPE_BASE_URL); // ← agrega esta línea

// Instancia axios configurada
const http = axios.create({
  baseURL: ONPE_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
    'Accept-Language': 'es-PE,es;q=0.9',
    'Origin': 'https://resultadoelectoral.onpe.gob.pe',
    'Referer': 'https://resultadoelectoral.onpe.gob.pe/',
  },
});

// Log de todas las respuestas en modo debug
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const url    = err.config?.url;
    console.error(`[ONPE] HTTP ${status} en ${url}: ${err.message}`);
    return Promise.reject(err);
  }
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * GET con delay y retry exponencial.
 * 
 * @param {string} endpoint - Relativo a ONPE_BASE_URL
 * @param {object} params   - Query params
 * @returns {Promise<any>}  - Payload JSON de ONPE
 */
export async function get(endpoint, params = {}) {
  // Delay fijo antes de cada request
  await sleep(REQUEST_DELAY_MS);

  let lastError;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await http.get(endpoint, { params });
      return res.data;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;

      // No reintentar en errores de cliente (salvo 429)
      if (status && status !== 429 && status < 500) {
        break;
      }

      // Respetar Retry-After si ONPE lo envía
      if (status === 429) {
        const retryAfter = parseInt(err.response?.headers?.['retry-after'] || '60');
        console.warn(`[ONPE] Rate limit alcanzado. Esperando ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
      } else {
        const backoff = Math.pow(2, attempt) * 1000;
        console.warn(`[ONPE] Intento ${attempt + 1}/${MAX_RETRIES} fallido para ${endpoint}. Esperando ${backoff}ms...`);
        await sleep(backoff);
      }
    }
  }

  throw new Error(
    `[ONPE] Falló después de ${MAX_RETRIES} intentos: ${endpoint} — ${lastError?.message}`
  );
}
