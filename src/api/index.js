import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import resultadosRouter from './routes/resultados.js';
import alertasRouter from './routes/alertas.js';
import actasRouter from './routes/actas.js';
import estadisticasRouter from './routes/estadisticas.js';
import { query } from '../config/database.js';

const app = express();
app.set('trust proxy', 1); // Confiar en el primer proxy (Railway)
const httpServer = createServer(app);

export const io = new SocketIO(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] },
  transports: ['polling', 'websocket'], // 👈 polling primero como fallback
  allowUpgrades: true,
});

io.on('connection', (socket) => {
  console.log(`[WS] Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[WS] Desconectado: ${socket.id}`));
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST', 'PATCH'] }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));
app.use(rateLimit({
  windowMs: 60_000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Rate limit alcanzado. Intenta en 1 minuto.' },
}));
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api/resultados', resultadosRouter);
app.use('/api/alertas', alertasRouter);
app.use('/api/actas', actasRouter);
app.use('/api/estadisticas', estadisticasRouter);

// ✅ Health check corregido
app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }  // ✅ cierra catch
});   // ✅ cierra app.get

app.use((_req, res) => res.status(404).json({ error: 'Endpoint no encontrado' }));
app.use((err, _req, res, _next) => {
  console.error('[API] Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

const PORT = parseInt(process.env.PORT || '3000');

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const runJsPath = path.join(__dirname, '../migrations/run.js');
  console.log('[API] Ejecutando migraciones SQL...');
  execSync(`node "${runJsPath}"`, { stdio: 'inherit' });
} catch (error) {
  console.error('[API] ❌ Las migraciones fallaron. Deteniendo inicio.');
  process.exit(1);
}

// ✅ '0.0.0.0' para que Railway pueda alcanzar el servidor
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🗳️ AuditaVoto API corriendo en puerto ${PORT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);
});

import('../scraper/scheduler.js').catch(err => {
  console.error('[Scheduler] No se pudo iniciar:', err.message);
});

export default app;