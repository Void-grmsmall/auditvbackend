/**
 * index.js — Orquestador principal del scraper
 * 
 * Secuencia de scraping:
 * 1. Obtener proceso activo y elecciones
 * 2. Por cada elección: nacional → departamentos → provincias → distritos
 * 3. Persistir snapshots
 * 4. Descargar actas de distritos (para Benford)
 * 5. Detectar anomalías y generar alertas
 */
import 'dotenv/config';
import { obtenerProcesoActivo, obtenerElecciones } from './proceso.js';
import { obtenerDepartamentos, obtenerProvincias, obtenerDistritos } from './ubigeos.js';
import { fetchNacional, fetchDepartamento, fetchProvincia, fetchDistrito, persistirSnapshot } from './resultados.js';
import { descargarActas, persistirActas } from './actas.js';
import { detectarAnomalias } from '../analisis/deltas.js';
import { query } from '../config/database.js';
import { ONPE_ID_PROCESO, ONPE_ELECCIONES, TIPO_FILTRO, AMBITO, NOMBRE_ELECCION } from '../config/constants.js';

/**
 * Garantiza que el proceso y elecciones están registrados en BD.
 */
async function sincronizarCatalogos(idProceso, elecciones) {
  // Upsert proceso
  await query(`
    INSERT INTO procesos (id, nombre, activo)
    VALUES ($1, $2, TRUE)
    ON CONFLICT (id) DO UPDATE SET activo = TRUE
  `, [idProceso, `Proceso Electoral ${idProceso}`]);

  // Upsert elecciones
  for (const e of elecciones) {
    const id     = e.idEleccion ?? e.id;
    const nombre = e.nombre ?? NOMBRE_ELECCION[id] ?? `Elección ${id}`;
    await query(`
      INSERT INTO elecciones (id, id_proceso, nombre)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO NOTHING
    `, [id, idProceso, nombre]);
  }
}

/**
 * Ciclo de scraping para una elección específica.
 * Sólo descarga el nivel NACIONAL para ser eficiente en ciclos frecuentes.
 * El árbol completo (dptos/provincias/distritos) se hace en el ciclo profundo.
 */
async function scrapearEleccion(idEleccion) {
  console.log(`  [${idEleccion}] Scraping nivel nacional...`);

  try {
    const { totales, participantes } = await fetchNacional(idEleccion);
    const snapshotId = await persistirSnapshot(
      idEleccion,
      TIPO_FILTRO.ELECCION,
      null,
      totales,
      participantes
    );
    console.log(`  [${idEleccion}] ✓ Snapshot nacional #${snapshotId}`);
    return snapshotId;
  } catch (err) {
    console.error(`  [${idEleccion}] ✗ Error nivel nacional: ${err.message}`);
    return null;
  }
}

/**
 * Ciclo profundo: descarga resultados a nivel departamento, provincia y distrito.
 * Más lento; se puede ejecutar con menor frecuencia.
 */
export async function scrapearArbolCompleto(idEleccion) {
  console.log(`[Árbol] Iniciando scraping completo para elección ${idEleccion}...`);

  const departamentos = await obtenerDepartamentos(idEleccion);
  for (const dpto of departamentos) {
    const idDpto = dpto.idUbigeoDepartamento || dpto.idUbigeo;

    try {
      const { totales, participantes } = await fetchDepartamento(idEleccion, idDpto);
      await persistirSnapshot(idEleccion, TIPO_FILTRO.UBIGEO_NIVEL_01, idDpto, totales, participantes);
    } catch (err) {
      console.warn(`  ⚠ Dpto ${idDpto}: ${err.message}`);
    }

    const provincias = await obtenerProvincias(idEleccion, idDpto);
    for (const prov of provincias) {
      const idProv = prov.idUbigeoProvincia || prov.idUbigeo;

      try {
        const { totales, participantes } = await fetchProvincia(idEleccion, idDpto, idProv);
        await persistirSnapshot(idEleccion, TIPO_FILTRO.UBIGEO_NIVEL_02, idProv, totales, participantes);
      } catch (err) {
        console.warn(`  ⚠ Prov ${idProv}: ${err.message}`);
      }

      const distritos = await obtenerDistritos(idEleccion, idProv);
      for (const dist of distritos) {
        const idDist = dist.idUbigeoDistrito || dist.idUbigeo;

        try {
          const { totales, participantes } = await fetchDistrito(idEleccion, idDpto, idProv, idDist);
          await persistirSnapshot(idEleccion, TIPO_FILTRO.UBIGEO_NIVEL_03, idDist, totales, participantes);

          // Descargar actas de cada distrito para Benford
          const actas = await descargarActas(idDist, idEleccion);
          if (actas.length > 0) {
            await persistirActas(idDist, idEleccion, actas);
          }
        } catch (err) {
          console.warn(`  ⚠ Dist ${idDist}: ${err.message}`);
        }
      }
    }
  }

  console.log(`[Árbol] Finalizó árbol de elección ${idEleccion}.`);
}

/**
 * Ciclo principal de scraping (ejecutado por el scheduler cada 5 min).
 * Solo hace nivel nacional para ser rápido.
 */
export async function ejecutarScraping() {
  const inicio = Date.now();
  console.log(`\n[Scraper] ─── Ciclo iniciado ${new Date().toISOString()} ───`);

  try {
    // 1. Obtener proceso activo
    const proceso = await obtenerProcesoActivo();
    const idProceso = proceso?.idProceso ?? proceso?.id ?? ONPE_ID_PROCESO;
    console.log('[DEBUG] proceso raw:', JSON.stringify(proceso));
    console.log('[DEBUG] idProceso usado:', idProceso);

    // 2. Obtener elecciones activas
    const eleccionesRaw = await obtenerElecciones(idProceso);
    const elecciones = eleccionesRaw.length > 0 ? eleccionesRaw : ONPE_ELECCIONES.map(id => ({ id }));

    // 3. Sincronizar catálogos en BD
    await sincronizarCatalogos(idProceso, elecciones);

    // 4. Scrapear nivel nacional para cada elección
    const idsEleccion = elecciones.map(e => e.idEleccion ?? e.id);
    for (const idEleccion of idsEleccion) {
      await scrapearEleccion(idEleccion);
    }

    // 5. Detectar anomalías en los snapshots recién creados
    await detectarAnomalias();

    const duracion = ((Date.now() - inicio) / 1000).toFixed(1);
    console.log(`[Scraper] ─── Ciclo finalizado en ${duracion}s ───\n`);

  } catch (err) {
    console.error('[Scraper] Error fatal en ciclo:', err.message);
    // No relanzar para que el scheduler continúe
  }
}

// Ejecución directa (node src/scraper/index.js)
// Guarda específica: solo ejecutar si el script principal es ESTE archivo del scraper
const __scraperFile = new URL(import.meta.url).pathname;
const __mainScript  = process.argv[1]?.replace(/\\/g, '/');
if (__mainScript && __scraperFile.endsWith(__mainScript.replace(/.*src/, 'src'))) {
  ejecutarScraping().then(() => process.exit(0)).catch(console.error);
}
