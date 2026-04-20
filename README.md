# AuditaVoto — ONPE 2026 🇵🇪

Sistema de auditoría electoral ciudadana que consume en tiempo real los datos públicos de la ONPE para las Elecciones Generales 2026. Implementa un motor estadístico con Ley de Benford y Z-score para la detección automatizada de anomalías en el escrutinio.

## 🚀 Despliegue en Railway (Recomendado)

AuditaVoto está diseñado para un despliegue sin fricciones (sin necesidad de infraestructura local o Docker) directamente en Railway.

1. Haz **Fork** de este repositorio.
2. En [Railway](https://railway.app), crea un nuevo proyecto: **Deploy from GitHub repo**.
3. Añade el plugin de **PostgreSQL** a tu entorno en Railway.
4. Las variables de entorno principales se configurarán solas (Railway inyecta `PORT` y `DATABASE_URL` automáticamente).
5. Configura las siguientes variables opcionales si lo deseas:
   - `ONPE_ID_PROCESO=2` (Configurado para EG2026)
   - `SCRAPING_INTERVALO=5` (Cada cuántos minutos se actualiza, por defecto 5)
6. Ejecuta las migraciones por primera vez. En la pestaña de *Variables* de tu servicio agregas un *Start Command* temporal o lo corres desde la CLI de Railway:
   `node src/migrations/run.js`

¡Y listo! El scraper arrancará automáticamente junto con la API, y el frontend estará disponible en la ruta raíz si configuraste la build estática, o puedes desplegar `frontend/` de manera separada en Vercel/Netlify.

## 🛠️ Desarrollo Local

Si deseas correr todo localmente sin Docker, solo necesitas **Node.js (v20+)** y **PostgreSQL (v15+)**.

1. Instala pnpm de forma global: `npm i -g pnpm`
2. Instala dependencias en el backend y frontend:
   ```bash
   pnpm install
   cd frontend && pnpm install
   ```
3. Configura el `.env` (copia de `.env.example` y pon tu `DATABASE_URL` local).
4. Corre las migraciones de base de datos:
   ```bash
   pnpm run migrate
   ```
5. Levanta el backend (Puerto 3000 por defecto):
   ```bash
   pnpm run dev
   ```
6. En otra terminal, levanta el frontend:
   ```bash
   cd frontend && pnpm dev
   ```

El dashboard de React estará disponible en `http://localhost:5173`.

## ⚙️ Arquitectura

- **Backend / Scraper**: `Node.js + Express`, `node-cron`, `pg` (driver nativo). El scraper y la API viven en el mismo proceso para facilitar el despliegue económico en PaaS como Railway.
- **Base de Datos**: `PostgreSQL` para series de tiempo, modelado atómico inmutable, e índices GIN/BTree pesados para analítica en tiempo real.
- **Frontend**: `React + Vite` con `Zustand` (estado), `React-Query` (cacheo y polling de datos), y `Recharts` (gráficos estadísticos). 

## ⚖️ Marco Legal y Limitaciones
- **Ley N° 29733:** No se recopila, almacena ni distribuye información personal de votantes. Solo totales agregados y actas numéricas.
- **Rate Limit Conservador:** Scraper ajustado a intervalos espaciados con retardos fijos para no saturar los endpoints gubernamentales, respondiendo a HTTP 429 con Exponential Backoff.
