/**
 * index.js — Express API con WebSocket + Scheduler integrado
 * 
 * Puerto inyectado por Railway como $PORT.
 * El scheduler se inicia automáticamente en producción.
 */
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
import alertasRouter    from './routes/alertas.js';
import actasRouter      from './routes/actas.js';
import estadisticasRouter from './routes/estadisticas.js';
import { query } from '../config/database.js';

const app = express();
const httpServer = createServer(app);

// ── WebSocket ─────────────────────────────────────────────
export const io = new SocketIO(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`[WS] Cliente conectado: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[WS] Desconectado: ${socket.id}`));
});

// ── Middlewares globales ───────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // El frontend React necesita scripts
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH'],
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Rate limiting global
app.use(rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit alcanzado. Intenta en 1 minuto.' },
}));

// Inyectar io en las rutas
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ── Rutas ─────────────────────────────────────────────────
app.use('/api/resultados',   resultadosRouter);
app.use('/api/alertas',      alertasRouter);
app.use('/api/actas',        actasRouter);
app.use('/api/estadisticas', estadisticasRouter);

// Health check
app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// ─── 404 y error handler ──────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.use((err, _req, res, _next) => {
  console.error('[API] Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

// ── Arrancar servidor ─────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000');
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🗳️  AuditaVoto API corriendo en puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}\n`);
});

// ── Iniciar scheduler ─────────────────────────────────────
// En Railway, el scheduler corre en el mismo proceso que la API
import('../scraper/scheduler.js').catch(err => {
  console.error('[Scheduler] No se pudo iniciar el scheduler:', err.message);
});

export default app;
