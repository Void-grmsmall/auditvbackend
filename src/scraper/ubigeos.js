/**
 * ubigeos.js — Endpoints Grupo 1: Catálogos geográficos
 */
import { get } from './client.js';
import { AMBITO } from '../config/constants.js';

/**
 * Obtiene todos los departamentos para una elección.
 * @param {number} idEleccion
 * @param {number} idAmbito - 1=nacional, 2=extranjero
 */
export async function obtenerDepartamentos(idEleccion, idAmbito = AMBITO.NACIONAL) {
  const data = await get('ubigeos/departamentos', {
    idEleccion,
    idAmbitoGeografico: idAmbito,
  });
  return Array.isArray(data) ? data : data?.departamentos ?? [];
}

/**
 * Obtiene provincias de un departamento.
 * @param {number} idEleccion
 * @param {string} idUbigeoDepartamento - ej: '150000'
 * @param {number} idAmbito
 */
export async function obtenerProvincias(idEleccion, idUbigeoDepartamento, idAmbito = AMBITO.NACIONAL) {
  const data = await get('ubigeos/provincias', {
    idEleccion,
    idAmbitoGeografico: idAmbito,
    idUbigeoDepartamento,
  });
  return Array.isArray(data) ? data : data?.provincias ?? [];
}

/**
 * Obtiene distritos de una provincia.
 * @param {number} idEleccion
 * @param {string} idUbigeoProvincia - ej: '150100'
 * @param {number} idAmbito
 */
export async function obtenerDistritos(idEleccion, idUbigeoProvincia, idAmbito = AMBITO.NACIONAL) {
  const data = await get('ubigeos/distritos', {
    idEleccion,
    idAmbitoGeografico: idAmbito,
    idUbigeoProvincia,
  });
  return Array.isArray(data) ? data : data?.distritos ?? [];
}

/**
 * Construye el árbol geográfico completo para una elección.
 * Devuelve lista plana de todos los distritos con su jerarquía.
 * 
 * @param {number} idEleccion
 * @returns {Array<{ idUbigeo, nombre, nivel, idPadre, idDpto, idProvincia }>}
 */
export async function construirArbolGeografico(idEleccion) {
  console.log(`[Ubigeos] Construyendo árbol geográfico para elección ${idEleccion}...`);
  const resultado = [];

  const departamentos = await obtenerDepartamentos(idEleccion);
  console.log(`  → ${departamentos.length} departamentos`);

  for (const dpto of departamentos) {
    const idDpto = dpto.idUbigeoDepartamento || dpto.idUbigeo || dpto.codigo;
    const nombreDpto = dpto.nombre || dpto.descripcion;

    resultado.push({
      idUbigeo: idDpto,
      nombre:   nombreDpto,
      nivel:    1,
      idPadre:  null,
    });

    try {
      const provincias = await obtenerProvincias(idEleccion, idDpto);
      for (const prov of provincias) {
        const idProv = prov.idUbigeoProvincia || prov.idUbigeo || prov.codigo;
        const nombreProv = prov.nombre || prov.descripcion;

        resultado.push({
          idUbigeo: idProv,
          nombre:   nombreProv,
          nivel:    2,
          idPadre:  idDpto,
        });

        try {
          const distritos = await obtenerDistritos(idEleccion, idProv);
          for (const dist of distritos) {
            const idDist = dist.idUbigeoDistrito || dist.idUbigeo || dist.codigo;
            const nombreDist = dist.nombre || dist.descripcion;
            resultado.push({
              idUbigeo: idDist,
              nombre:   nombreDist,
              nivel:    3,
              idPadre:  idProv,
            });
          }
        } catch (err) {
          console.warn(`  ⚠ No se pudieron obtener distritos de ${nombreProv}: ${err.message}`);
        }
      }
    } catch (err) {
      console.warn(`  ⚠ No se pudieron obtener provincias de ${nombreDpto}: ${err.message}`);
    }
  }

  console.log(`  → Total ubigeos cargados: ${resultado.length}`);
  return resultado;
}
