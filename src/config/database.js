/**
 * database.js — Pool de conexiones PostgreSQL
 */
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida. Configura la variable de entorno.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en cliente idle:', err.message);
});

/**
 * Ejecuta una query con parámetros. Usa el pool directamente.
 * @param {string} sql
 * @param {Array} params
 */
export async function query(sql, params = []) {
  const start = Date.now();
  try {
    const result = await pool.query(sql, params);
    const ms = Date.now() - start;
    if (ms > 1000) {
      console.warn(`[DB] Query lenta (${ms}ms): ${sql.substring(0, 80)}...`);
    }
    return result;
  } catch (err) {
    console.error('[DB] Error en query:', err.message, '\nSQL:', sql);
    throw err;
  }
}

/**
 * Obtiene un cliente del pool para transacciones.
 */
export function getClient() {
  return pool.connect();
}

export { pool };
export default pool;
