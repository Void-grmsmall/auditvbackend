/**
 * scheduler.js — Scheduler de scraping con node-cron
 * 
 * Ejecuta el scraper cada N minutos (configurable con SCRAPING_INTERVALO).
 * Usar `node src/scraper/scheduler.js` para arrancar en modo standalone.
 * En producción (Railway), se arranca junto con la API desde src/api/index.js.
 */
import 'dotenv/config';
import cron from 'node-cron';
import { ejecutarScraping } from './index.js';

const INTERVALO = parseInt(process.env.SCRAPING_INTERVALO || '5');
const expresion = `*/${INTERVALO} * * * *`;

console.log(`[Scheduler] Iniciado. Scraping cada ${INTERVALO} minutos.`);
console.log(`[Scheduler] Expresión cron: "${expresion}"`);

// Mutex para evitar ejecuciones solapadas
let corriendo = false;

cron.schedule(expresion, async () => {
  if (corriendo) {
    console.warn('[Scheduler] Ciclo anterior aún en ejecución, omitiendo tick.');
    return;
  }
  corriendo = true;
  try {
    await ejecutarScraping();
  } finally {
    corriendo = false;
  }
}, { timezone: 'America/Lima' });

// Ejecutar inmediatamente al arrancar
console.log('[Scheduler] Ejecutando ciclo inicial...');
ejecutarScraping().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Scheduler] SIGTERM recibido, cerrando...');
  process.exit(0);
});
