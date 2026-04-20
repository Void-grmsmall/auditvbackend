/**
 * run.js — Ejecuta las migraciones SQL en orden
 * Uso: node src/migrations/run.js
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

const migrations = [
  '001_crear_tablas.sql',
  '002_indices.sql',
];

async function run() {
  const client = await pool.connect();
  try {
    for (const file of migrations) {
      const sql = readFileSync(join(__dirname, file), 'utf8');
      console.log(`Aplicando migración: ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file} aplicada`);
    }
    console.log('\n✅ Todas las migraciones aplicadas correctamente.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
