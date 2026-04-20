# AuditaVoto — Plan de Implementación Técnica Completo

> **Para agentes de código:** Este documento es la fuente de verdad. Cada sección incluye comandos exactos, estructuras de archivos precisas, código completo y criterios de aceptación verificables. Ejecutar en orden estricto. No omitir ningún paso.

---

## Índice

- [Stack tecnológico](#stack-tecnológico)
- [Estructura de directorios](#estructura-de-directorios)
- [Sprint 0 — Entorno y datos históricos](#sprint-0--entorno-y-datos-históricos)
- [Fase 1 — Esquema PostgreSQL](#fase-1--esquema-postgresql)
- [Fase 2 — Scraper y Scheduler](#fase-2--scraper-y-scheduler)
- [Fase 3 — Motor estadístico](#fase-3--motor-estadístico)
- [Fase 4 — API REST](#fase-4--api-rest)
- [Fase 5 — Frontend React](#fase-5--frontend-react)
- [Fase 6 — QA y observabilidad](#fase-6--qa-y-observabilidad)
- [Fase 7 — Despliegue Docker](#fase-7--despliegue-docker)

---

## Stack tecnológico

| Capa | Tecnología | Versión mínima |
|---|---|---|
| Runtime backend | Node.js | 20.x LTS |
| Package manager | pnpm | 9.x |
| Base de datos | PostgreSQL | 15.x |
| Caché | Redis | 7.x |
| ORM/Query builder | pg (node-postgres) | 8.x |
| HTTP cliente | axios | 1.x |
| Scheduler | node-cron | 3.x |
| Validación | zod | 3.x |
| Logging | pino | 8.x |
| API framework | Express | 4.x |
| WebSocket | socket.io | 4.x |
| Frontend bundler | Vite | 5.x |
| Frontend framework | React | 18.x |
| State management | Zustand | 4.x |
| Server state | @tanstack/react-query | 5.x |
| Gráficos | recharts | 2.x |
| Mapas | leaflet + react-leaflet | 1.9.x |
| Testing backend | vitest + supertest | latest |
| Testing E2E | Playwright | latest |
| Contenedores | Docker + Docker Compose | 24.x |
| CI/CD | GitHub Actions | — |
| Migraciones BD | node-pg-migrate | 6.x |

---

## Estructura de directorios

El agente debe crear esta estructura completa antes de empezar cualquier fase.

```
auditavoto/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── packages/
│   ├── collector/                  # Scraper + scheduler
│   │   ├── src/
│   │   │   ├── onpe.client.js
│   │   │   ├── onpe.parser.js
│   │   │   ├── snapshot.service.js
│   │   │   ├── alert.service.js
│   │   │   └── scheduler.js
│   │   ├── tests/
│   │   ├── package.json
│   │   └── .env.example
│   ├── api/                        # Express REST + WebSocket
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── snapshots.js
│   │   │   │   ├── resultados.js
│   │   │   │   ├── historico.js
│   │   │   │   ├── alertas.js
│   │   │   │   ├── auditoria.js
│   │   │   │   └── export.js
│   │   │   ├── middleware/
│   │   │   │   ├── rateLimit.js
│   │   │   │   ├── validate.js
│   │   │   │   └── errorHandler.js
│   │   │   ├── services/
│   │   │   │   ├── db.js
│   │   │   │   ├── cache.js
│   │   │   │   └── socket.js
│   │   │   └── app.js
│   │   ├── tests/
│   │   ├── package.json
│   │   └── .env.example
│   ├── stats/                      # Motor estadístico
│   │   ├── src/
│   │   │   ├── deltas.js
│   │   │   ├── benford.js
│   │   │   ├── zscore.js
│   │   │   └── correlacion.js
│   │   ├── tests/
│   │   └── package.json
│   └── frontend/                   # React + Vite
│       ├── src/
│       │   ├── components/
│       │   ├── views/
│       │   │   ├── Dashboard.jsx
│       │   │   ├── MonitorTemporal.jsx
│       │   │   ├── MapaElectoral.jsx
│       │   │   └── PanelAuditoria.jsx
│       │   ├── store/
│       │   │   └── useStore.js
│       │   ├── hooks/
│       │   │   ├── useSnapshots.js
│       │   │   ├── useAlertas.js
│       │   │   └── useSocket.js
│       │   ├── lib/
│       │   │   └── api.js
│       │   └── main.jsx
│       ├── public/
│       │   └── geojson/
│       │       └── peru-ubigeos.geojson
│       ├── package.json
│       └── vite.config.js
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_materialized_views.sql
│   │   ├── 003_indexes.sql
│   │   └── 004_functions.sql
│   └── seeds/
│       └── import-historical.js
├── deploy/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── nginx.conf
│   └── .env.example
├── docs/
│   ├── metodologia-estadistica.md
│   ├── endpoints.md
│   └── arquitectura.md
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## Sprint 0 — Entorno y datos históricos

**Duración estimada:** 2–3 días  
**Objetivo:** Tener el repositorio inicializado, la base de datos con datos reales de EG2021 y todos los endpoints ONPE documentados. Sin esto, ninguna fase posterior puede validarse.

---

### Paso 0.1 — Inicializar el monorepo

```bash
# Crear directorio raíz
mkdir auditavoto && cd auditavoto

# Inicializar git
git init
git branch -M main

# Crear archivo .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.env.local
.DS_Store
*.log
coverage/
.nyc_output/
EOF

# Instalar pnpm globalmente si no está disponible
npm install -g pnpm@latest

# Inicializar workspace
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

# package.json raíz
cat > package.json << 'EOF'
{
  "name": "auditavoto",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "db:migrate": "node database/migrations/run.js",
    "db:seed": "node database/seeds/import-historical.js"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
EOF

# Crear estructura completa de directorios
mkdir -p packages/{collector,api,stats,frontend}/src
mkdir -p packages/{collector,api,stats}/tests
mkdir -p database/{migrations,seeds}
mkdir -p deploy docs
mkdir -p packages/frontend/public/geojson
mkdir -p packages/api/src/{routes,middleware,services}
mkdir -p packages/collector/src
mkdir -p packages/stats/src
```

---

### Paso 0.2 — Levantar PostgreSQL y Redis con Docker

Crear el archivo de infraestructura de desarrollo:

```yaml
# deploy/docker-compose.dev.yml
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    container_name: auditavoto_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: auditavoto
      POSTGRES_USER: auditavoto
      POSTGRES_PASSWORD: auditavoto_dev_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U auditavoto"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: auditavoto_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
```

```bash
# Levantar solo base de datos e infraestructura
docker compose -f deploy/docker-compose.dev.yml up -d

# Verificar que están corriendo
docker compose -f deploy/docker-compose.dev.yml ps

# Esperar a que postgres esté listo (health check)
until docker exec auditavoto_postgres pg_isready -U auditavoto; do
  echo "Esperando PostgreSQL..."
  sleep 2
done
echo "PostgreSQL listo."
```

---

### Paso 0.3 — Variables de entorno

```bash
# deploy/.env.example — copiar como .env en la raíz del proyecto
cat > deploy/.env.example << 'EOF'
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=auditavoto
POSTGRES_USER=auditavoto
POSTGRES_PASSWORD=auditavoto_dev_pass
DATABASE_URL=postgresql://auditavoto:auditavoto_dev_pass@localhost:5432/auditavoto

# Redis
REDIS_URL=redis://localhost:6379

# ONPE
ONPE_BASE_URL=https://resultadoelectoral.onpe.gob.pe
ONPE_HISTORICO_URL=https://resultadoshistorico.onpe.gob.pe
ONPE_REQUEST_DELAY_MS=1100
ONPE_MAX_RETRIES=3
ONPE_TIMEOUT_MS=15000

# Collector
POLL_INTERVAL_CRON=*/5 * * * *
ALERT_THRESHOLD_SPEED_VOTES_PER_MIN=50000
ALERT_THRESHOLD_BATCH_ACTAS_PCT=5

# API
API_PORT=3001
API_CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# Stats
BENFORD_MIN_MESAS=100
ZSCORE_THRESHOLD=3.0
EOF

cp deploy/.env.example .env
```

> **IMPORTANTE para el agente:** Nunca commitear el archivo `.env`. Solo commitear `.env.example`.

---

### Paso 0.4 — Descargar datos históricos EG2021

```bash
# Instalar dependencias del seed
cd database/seeds
npm init -y
npm install axios csv-parse pg dotenv

# Crear script de descarga y normalización
cat > import-historical.js << 'EOF'
/**
 * import-historical.js
 * 
 * Descarga los resultados de EG2021 desde resultadoshistorico.onpe.gob.pe,
 * los normaliza al modelo interno y los inserta en PostgreSQL
 * como snapshots sintéticos espaciados 5 minutos.
 * 
 * Uso: node import-historical.js
 */

require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const axios = require('axios');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const HISTORICO_BASE = process.env.ONPE_HISTORICO_URL || 'https://resultadoshistorico.onpe.gob.pe';

// URLs de datasets históricos EG2021 (verificar en el portal si cambian)
const DATASETS = {
  presidencial: `${HISTORICO_BASE}/api/resultados/EG2021/presidencial`,
  congresistas: `${HISTORICO_BASE}/api/resultados/EG2021/congresistas`,
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'AuditaVoto/1.0 (auditoria-ciudadana@example.com)',
          'Accept': 'application/json',
        },
      });
      return response.data;
    } catch (err) {
      console.error(`Error en intento ${i + 1} para ${url}: ${err.message}`);
      if (i < retries - 1) await sleep(2000 * (i + 1));
    }
  }
  throw new Error(`Falló después de ${retries} intentos: ${url}`);
}

async function insertSnapshotSintetico(client, datos, tipoEleccion, offsetMinutos) {
  // Crear timestamp sintético retrocediendo desde ahora
  const timestamp = new Date(Date.now() - offsetMinutos * 60 * 1000);
  
  const snapshotResult = await client.query(
    `INSERT INTO snapshots (timestamp, fuente, tipo_eleccion, actas_procesadas, actas_total, es_historico)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING id`,
    [timestamp, 'ONPE_HISTORICO_EG2021', tipoEleccion, datos.actasProcesadas, datos.actasTotal]
  );
  
  const snapshotId = snapshotResult.rows[0].id;
  
  for (const resultado of datos.resultados) {
    // Upsert candidato
    const candidatoResult = await client.query(
      `INSERT INTO candidatos (nombre_completo, partido, tipo_eleccion)
       VALUES ($1, $2, $3)
       ON CONFLICT (nombre_completo, tipo_eleccion) DO UPDATE SET partido = EXCLUDED.partido
       RETURNING id`,
      [resultado.candidato, resultado.partido, tipoEleccion]
    );
    const candidatoId = candidatoResult.rows[0].id;
    
    // Upsert ubigeo
    await client.query(
      `INSERT INTO ubigeos (codigo, region, provincia, distrito)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (codigo) DO NOTHING`,
      [resultado.ubigeo, resultado.region, resultado.provincia, resultado.distrito]
    );
    
    // Insertar votos del snapshot
    await client.query(
      `INSERT INTO votos_snapshot (snapshot_id, candidato_id, ubigeo_codigo, votos, porcentaje, actas_contabilizadas)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [snapshotId, candidatoId, resultado.ubigeo, resultado.votos, resultado.porcentaje, resultado.actasMesa]
    );
  }
  
  return snapshotId;
}

async function main() {
  console.log('Iniciando importación de datos históricos EG2021...');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const [tipo, url] of Object.entries(DATASETS)) {
      console.log(`Descargando ${tipo}...`);
      
      let datos;
      try {
        datos = await fetchWithRetry(url);
      } catch (err) {
        console.warn(`No se pudo descargar ${tipo}: ${err.message}`);
        console.warn('Usando datos de muestra locales si existen...');
        
        const localPath = path.join(__dirname, `../fixtures/eg2021-${tipo}.json`);
        if (fs.existsSync(localPath)) {
          datos = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        } else {
          console.error(`No hay datos locales para ${tipo}. Omitiendo.`);
          continue;
        }
      }
      
      await sleep(1100); // Respetar rate limit ONPE
      
      // Insertar como snapshot sintético (offset 0 = "estado final" de EG2021)
      const snapshotId = await insertSnapshotSintetico(client, datos, tipo, 0);
      console.log(`Snapshot ${snapshotId} creado para ${tipo} con ${datos.resultados?.length || 0} registros`);
    }
    
    await client.query('COMMIT');
    console.log('Importación completada exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error durante importación:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
EOF
```

---

### Paso 0.5 — Mapear endpoints ONPE en vivo

El agente debe ejecutar el siguiente proceso manual (no automatizable) y documentar los resultados:

1. Abrir `https://resultadoelectoral.onpe.gob.pe` en Chrome
2. Abrir DevTools → pestaña Network → filtrar por Fetch/XHR
3. Navegar por resultados de cada tipo de elección
4. Registrar **cada URL**, método, headers y estructura de respuesta

Crear `docs/endpoints.md` con el siguiente formato:

```markdown
# Endpoints ONPE documentados

Fecha de relevamiento: [FECHA]
Portal: https://resultadoelectoral.onpe.gob.pe

## Endpoint 1: Resultados presidenciales
- URL: [URL exacta]
- Método: GET
- Params: tipo_eleccion, ubigeo
- Respuesta: { actas_procesadas, actas_total, resultados: [...] }
- Estructura exacta del JSON:
  {
    "actas_procesadas": 123456,
    "actas_total": 234567,
    "resultados": [
      {
        "candidato": "APELLIDO APELLIDO, NOMBRE",
        "partido": "NOMBRE PARTIDO",
        "ubigeo": "010101",
        "votos": 12345,
        "porcentaje": 23.45
      }
    ]
  }

## Endpoint 2: Resultados por congresistas
[...]

## robots.txt
[Copiar contenido literal del robots.txt]

## Notas de rate limiting
[Observaciones sobre respuestas 429, tiempos de respuesta, etc.]
```

---

### Criterios de aceptación Sprint 0

- [ ] `docker compose -f deploy/docker-compose.dev.yml ps` muestra postgres y redis en estado `healthy`
- [ ] `psql $DATABASE_URL -c "\dt"` conecta sin error
- [ ] `docs/endpoints.md` tiene al menos 2 endpoints documentados con estructura JSON completa
- [ ] El archivo `.env` existe en la raíz y tiene todas las variables de `deploy/.env.example`

---

## Fase 1 — Esquema PostgreSQL

**Duración estimada:** 2–3 días  
**Prerequisito:** Sprint 0 completado y PostgreSQL corriendo.

---

### Paso 1.1 — Instalar node-pg-migrate

```bash
# En la raíz del proyecto
pnpm add -D node-pg-migrate pg dotenv -w

# Agregar scripts al package.json raíz
# (editar package.json manualmente o con jq)
```

Actualizar `package.json` raíz con:

```json
{
  "scripts": {
    "db:migrate": "node-pg-migrate up --migrations-dir database/migrations",
    "db:migrate:down": "node-pg-migrate down --migrations-dir database/migrations",
    "db:migrate:create": "node-pg-migrate create --migrations-dir database/migrations"
  }
}
```

---

### Paso 1.2 — Migración 001: Esquema principal

```sql
-- database/migrations/001_initial_schema.sql

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TABLA: snapshots
-- Cada fila = una foto del estado del conteo en un momento dado
-- ============================================================
CREATE TABLE snapshots (
    id              BIGSERIAL PRIMARY KEY,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fuente          VARCHAR(100) NOT NULL DEFAULT 'ONPE_LIVE',
    tipo_eleccion   VARCHAR(50) NOT NULL,    -- 'presidencial', 'congresistas', 'parlamento_andino'
    actas_procesadas INTEGER NOT NULL DEFAULT 0,
    actas_total      INTEGER NOT NULL DEFAULT 0,
    porcentaje_avance NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN actas_total > 0 
             THEN ROUND((actas_procesadas::NUMERIC / actas_total) * 100, 2)
             ELSE 0 
        END
    ) STORED,
    es_historico    BOOLEAN NOT NULL DEFAULT FALSE,
    duracion_ms     INTEGER,                 -- Cuánto tardó el scraper en este ciclo
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE snapshots IS 'Registro temporal de cada ciclo de scraping. NUNCA actualizar filas, solo insertar.';

-- ============================================================
-- TABLA: partidos
-- ============================================================
CREATE TABLE partidos (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(200) NOT NULL UNIQUE,
    siglas      VARCHAR(20),
    color_hex   CHAR(7),                     -- '#FF0000'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: candidatos
-- ============================================================
CREATE TABLE candidatos (
    id              SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(300) NOT NULL,
    partido_id      INTEGER REFERENCES partidos(id),
    tipo_eleccion   VARCHAR(50) NOT NULL,    -- 'presidencial', 'congresistas'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (nombre_completo, tipo_eleccion)
);

COMMENT ON COLUMN candidatos.nombre_completo IS 'Formato ONPE: APELLIDO APELLIDO, NOMBRE';

-- ============================================================
-- TABLA: ubigeos
-- Catálogo completo de divisiones político-administrativas del Perú
-- ============================================================
CREATE TABLE ubigeos (
    codigo      CHAR(6) PRIMARY KEY,         -- '150101' = Lima, Lima, Lima
    region      VARCHAR(100) NOT NULL,
    provincia   VARCHAR(100) NOT NULL,
    distrito    VARCHAR(100) NOT NULL,
    lat         NUMERIC(10, 7),
    lng         NUMERIC(10, 7),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN ubigeos.codigo IS 'Código INEI de 6 dígitos: 2 región + 2 provincia + 2 distrito';

-- ============================================================
-- TABLA: votos_snapshot
-- EL NÚCLEO DEL SISTEMA. Una fila por (candidato × ubigeo × snapshot).
-- NUNCA hacer UPDATE aquí. Solo INSERT.
-- ============================================================
CREATE TABLE votos_snapshot (
    id                  BIGSERIAL PRIMARY KEY,
    snapshot_id         BIGINT NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    candidato_id        INTEGER NOT NULL REFERENCES candidatos(id),
    ubigeo_codigo       CHAR(6) NOT NULL REFERENCES ubigeos(codigo),
    votos               INTEGER NOT NULL CHECK (votos >= 0),
    porcentaje          NUMERIC(7, 4),
    actas_contabilizadas INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE votos_snapshot IS 
'Preserva el historial completo. Nunca actualizar. Comparar snapshot N con N-1 para detectar deltas negativos.';

-- ============================================================
-- TABLA: alertas
-- Anomalías detectadas automáticamente por el motor estadístico
-- ============================================================
CREATE TABLE alertas (
    id              BIGSERIAL PRIMARY KEY,
    tipo            VARCHAR(50) NOT NULL,
    -- Tipos válidos:
    -- 'VOTOS_NEGATIVOS'    → Δvotos < 0 (imposible matemáticamente)
    -- 'VELOCIDAD_INUSUAL'  → Δvotos/Δt > umbral configurado
    -- 'LOTE_MASIVO'        → salto de actas > 5% en un intervalo
    -- 'BENFORD_ANOMALIA'   → p-valor test Benford < 0.05
    -- 'ZSCORE_OUTLIER'     → |Z| > 3.0 en un distrito
    severidad       VARCHAR(20) NOT NULL CHECK (severidad IN ('CRITICA', 'ALTA', 'MEDIA', 'INFO')),
    snapshot_id     BIGINT REFERENCES snapshots(id),
    candidato_id    INTEGER REFERENCES candidatos(id),
    ubigeo_codigo   CHAR(6) REFERENCES ubigeos(codigo),
    descripcion     TEXT NOT NULL,
    valor_anterior  NUMERIC,                 -- Para VOTOS_NEGATIVOS: votos en snapshot N-1
    valor_actual    NUMERIC,                 -- Para VOTOS_NEGATIVOS: votos en snapshot N
    delta_valor     NUMERIC,                 -- valor_actual - valor_anterior
    metadata        JSONB,                   -- Datos adicionales según el tipo
    revisada        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN alertas.tipo IS 
'VOTOS_NEGATIVOS | VELOCIDAD_INUSUAL | LOTE_MASIVO | BENFORD_ANOMALIA | ZSCORE_OUTLIER';

-- ============================================================
-- TABLA: benford_results
-- Resultados del test Benford por candidato y snapshot
-- ============================================================
CREATE TABLE benford_results (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT NOT NULL REFERENCES snapshots(id),
    candidato_id    INTEGER NOT NULL REFERENCES candidatos(id),
    nivel           VARCHAR(20) NOT NULL CHECK (nivel IN ('provincia', 'departamento')),
    n_muestras      INTEGER NOT NULL,        -- Cantidad de distritos/provincias analizados
    chi2_statistic  NUMERIC(12, 6) NOT NULL,
    p_value         NUMERIC(10, 8) NOT NULL,
    es_anomalia     BOOLEAN GENERATED ALWAYS AS (p_value < 0.05) STORED,
    distribucion_observada  JSONB,           -- {"0": 0.12, "1": 0.23, ..., "9": 0.08}
    distribucion_esperada   JSONB,           -- Distribución teórica de Benford
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (snapshot_id, candidato_id, nivel)
);

-- ============================================================
-- TABLA: zscore_results
-- Resultados del análisis de outliers Z-score por distrito
-- ============================================================
CREATE TABLE zscore_results (
    id              BIGSERIAL PRIMARY KEY,
    snapshot_id     BIGINT NOT NULL REFERENCES snapshots(id),
    candidato_id    INTEGER NOT NULL REFERENCES candidatos(id),
    ubigeo_codigo   CHAR(6) NOT NULL REFERENCES ubigeos(codigo),
    porcentaje      NUMERIC(7, 4) NOT NULL,
    media_nacional  NUMERIC(7, 4) NOT NULL,
    desv_estandar   NUMERIC(7, 4) NOT NULL,
    zscore          NUMERIC(10, 6) NOT NULL,
    es_outlier      BOOLEAN GENERATED ALWAYS AS (ABS(zscore) > 3.0) STORED,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (snapshot_id, candidato_id, ubigeo_codigo)
);
```

---

### Paso 1.3 — Migración 002: Índices críticos

```sql
-- database/migrations/002_indexes.sql

-- Índice compuesto principal para series temporales (el más usado)
CREATE INDEX CONCURRENTLY idx_votos_candidato_ubigeo_snapshot
    ON votos_snapshot (candidato_id, ubigeo_codigo, snapshot_id DESC);

-- Para queries de "último estado por candidato"
CREATE INDEX CONCURRENTLY idx_votos_snapshot_candidato
    ON votos_snapshot (snapshot_id DESC, candidato_id);

-- Para alertas críticas (dashboard principal)
CREATE INDEX CONCURRENTLY idx_alertas_severidad_tipo
    ON alertas (severidad, tipo, created_at DESC)
    WHERE revisada = FALSE;

-- Para series temporales de snapshots
CREATE INDEX CONCURRENTLY idx_snapshots_timestamp
    ON snapshots (timestamp DESC, tipo_eleccion);

-- Para búsqueda de candidatos por nombre
CREATE INDEX CONCURRENTLY idx_candidatos_nombre_trgm
    ON candidatos USING GIN (nombre_completo gin_trgm_ops);

-- Para Benford: buscar anomalías rápido
CREATE INDEX CONCURRENTLY idx_benford_anomalias
    ON benford_results (candidato_id, snapshot_id DESC)
    WHERE es_anomalia = TRUE;
```

---

### Paso 1.4 — Migración 003: Vista materializada y funciones

```sql
-- database/migrations/003_views_and_functions.sql

-- ============================================================
-- VISTA MATERIALIZADA: resultados_actuales
-- Estado más reciente de votos por candidato y ubigeo.
-- Se refresca cada 5 minutos sincronizado con el scheduler.
-- ============================================================
CREATE MATERIALIZED VIEW resultados_actuales AS
WITH ultimo_snapshot AS (
    SELECT id, tipo_eleccion, actas_procesadas, actas_total, timestamp
    FROM snapshots
    WHERE id = (SELECT MAX(id) FROM snapshots WHERE tipo_eleccion = s.tipo_eleccion)
    FROM snapshots s
    GROUP BY tipo_eleccion
),
ranked AS (
    SELECT
        vs.candidato_id,
        vs.ubigeo_codigo,
        vs.votos,
        vs.porcentaje,
        vs.actas_contabilizadas,
        vs.snapshot_id,
        s.timestamp,
        s.tipo_eleccion,
        ROW_NUMBER() OVER (
            PARTITION BY vs.candidato_id, vs.ubigeo_codigo, s.tipo_eleccion
            ORDER BY vs.snapshot_id DESC
        ) AS rn
    FROM votos_snapshot vs
    JOIN snapshots s ON s.id = vs.snapshot_id
)
SELECT
    r.candidato_id,
    c.nombre_completo,
    c.tipo_eleccion,
    p.nombre AS partido,
    p.color_hex,
    r.ubigeo_codigo,
    u.region,
    u.provincia,
    u.distrito,
    r.votos,
    r.porcentaje,
    r.actas_contabilizadas,
    r.snapshot_id AS ultimo_snapshot_id,
    r.timestamp AS ultima_actualizacion
FROM ranked r
JOIN candidatos c ON c.id = r.candidato_id
LEFT JOIN partidos p ON p.id = c.partido_id
JOIN ubigeos u ON u.codigo = r.ubigeo_codigo
WHERE r.rn = 1;

-- Índice en la vista materializada
CREATE UNIQUE INDEX idx_resultados_actuales_pk
    ON resultados_actuales (candidato_id, ubigeo_codigo);

CREATE INDEX idx_resultados_actuales_tipo
    ON resultados_actuales (tipo_eleccion, votos DESC);

-- ============================================================
-- FUNCIÓN: calcular_delta_votos
-- Calcula Δvotos entre el snapshot actual y el anterior para un candidato+ubigeo.
-- Devuelve NULL si no hay snapshot anterior.
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_delta_votos(
    p_candidato_id INTEGER,
    p_ubigeo_codigo CHAR(6),
    p_snapshot_id_actual BIGINT
) RETURNS TABLE (
    votos_anterior INTEGER,
    votos_actual INTEGER,
    delta INTEGER,
    es_negativo BOOLEAN
) AS $$
DECLARE
    v_snapshot_anterior_id BIGINT;
BEGIN
    -- Encontrar el snapshot inmediatamente anterior para el mismo tipo de elección
    SELECT vs_prev.snapshot_id INTO v_snapshot_anterior_id
    FROM votos_snapshot vs_prev
    JOIN snapshots s_prev ON s_prev.id = vs_prev.snapshot_id
    JOIN snapshots s_actual ON s_actual.id = p_snapshot_id_actual
    WHERE vs_prev.candidato_id = p_candidato_id
      AND vs_prev.ubigeo_codigo = p_ubigeo_codigo
      AND s_prev.tipo_eleccion = s_actual.tipo_eleccion
      AND vs_prev.snapshot_id < p_snapshot_id_actual
    ORDER BY vs_prev.snapshot_id DESC
    LIMIT 1;
    
    IF v_snapshot_anterior_id IS NULL THEN
        RETURN; -- No hay snapshot anterior, no calcular
    END IF;
    
    RETURN QUERY
    SELECT
        prev.votos AS votos_anterior,
        curr.votos AS votos_actual,
        (curr.votos - prev.votos) AS delta,
        (curr.votos - prev.votos) < 0 AS es_negativo
    FROM votos_snapshot curr
    JOIN votos_snapshot prev ON prev.candidato_id = p_candidato_id
        AND prev.ubigeo_codigo = p_ubigeo_codigo
        AND prev.snapshot_id = v_snapshot_anterior_id
    WHERE curr.candidato_id = p_candidato_id
      AND curr.ubigeo_codigo = p_ubigeo_codigo
      AND curr.snapshot_id = p_snapshot_id_actual;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

### Paso 1.5 — Script para ejecutar migraciones

```javascript
// database/migrations/run.js
require('dotenv').config({ path: '../../.env' });
const { execSync } = require('child_process');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: DATABASE_URL no definida en .env');
  process.exit(1);
}

const files = [
  '001_initial_schema.sql',
  '002_indexes.sql',
  '003_views_and_functions.sql',
];

for (const file of files) {
  console.log(`Aplicando migración: ${file}`);
  try {
    execSync(`psql "${dbUrl}" -f "${__dirname}/${file}"`, { stdio: 'inherit' });
    console.log(`✓ ${file} aplicada`);
  } catch (err) {
    console.error(`✗ Error en ${file}:`, err.message);
    process.exit(1);
  }
}

console.log('\nTodas las migraciones aplicadas correctamente.');
```

```bash
# Ejecutar migraciones
node database/migrations/run.js

# Verificar tablas creadas
psql $DATABASE_URL -c "\dt"
# Debe mostrar: snapshots, partidos, candidatos, ubigeos, votos_snapshot, alertas, benford_results, zscore_results
```

---

### Criterios de aceptación Fase 1

- [ ] `psql $DATABASE_URL -c "\dt"` lista las 8 tablas
- [ ] `psql $DATABASE_URL -c "\di"` lista al menos 8 índices incluyendo `idx_votos_candidato_ubigeo_snapshot`
- [ ] `psql $DATABASE_URL -c "SELECT * FROM resultados_actuales LIMIT 1"` no arroja error
- [ ] `psql $DATABASE_URL -c "SELECT calcular_delta_votos(1, '150101', 1)"` no arroja error

---

## Fase 2 — Scraper y Scheduler

**Duración estimada:** 3–4 días  
**Prerequisito:** Fase 1 completada. Endpoints ONPE documentados en `docs/endpoints.md`.

---

### Paso 2.1 — Inicializar el paquete collector

```bash
cd packages/collector

cat > package.json << 'EOF'
{
  "name": "@auditavoto/collector",
  "version": "1.0.0",
  "type": "module",
  "main": "src/scheduler.js",
  "scripts": {
    "dev": "node --watch src/scheduler.js",
    "start": "node src/scheduler.js",
    "test": "vitest run"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "node-cron": "^3.0.3",
    "pg": "^8.11.0",
    "pino": "^8.16.0",
    "pino-pretty": "^10.2.0",
    "zod": "^3.22.0",
    "dotenv": "^16.3.0",
    "p-limit": "^5.0.0",
    "p-retry": "^6.2.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
EOF

pnpm install
```

---

### Paso 2.2 — onpe.client.js

```javascript
// packages/collector/src/onpe.client.js

import axios from 'axios';
import pRetry from 'p-retry';
import pino from 'pino';
import { setTimeout as sleep } from 'timers/promises';

const logger = pino({ name: 'onpe.client' });

const BASE_URL = process.env.ONPE_BASE_URL || 'https://resultadoelectoral.onpe.gob.pe';
const DELAY_MS = parseInt(process.env.ONPE_REQUEST_DELAY_MS || '1100');
const TIMEOUT_MS = parseInt(process.env.ONPE_TIMEOUT_MS || '15000');
const MAX_RETRIES = parseInt(process.env.ONPE_MAX_RETRIES || '3');

// Instancia axios con configuración base
const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'User-Agent': 'AuditaVoto/1.0 Citizen-Audit-Tool (contacto@auditavoto.pe)',
    'Accept': 'application/json',
    'Accept-Language': 'es-PE,es;q=0.9',
  },
});

// Interceptor de respuesta: log de cada llamada
httpClient.interceptors.response.use(
  (response) => {
    logger.info({
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      duration: Date.now() - response.config.metadata?.startTime,
    }, 'ONPE request successful');
    return response;
  },
  (error) => {
    logger.error({
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    }, 'ONPE request failed');
    return Promise.reject(error);
  }
);

// Interceptor de request: anotar timestamp de inicio
httpClient.interceptors.request.use((config) => {
  config.metadata = { startTime: Date.now() };
  return config;
});

/**
 * Hace un GET al endpoint ONPE con retry automático y rate limiting.
 * Garantiza al menos DELAY_MS entre llamadas consecutivas.
 * 
 * @param {string} endpoint - Ruta relativa, e.g. '/api/resultados/presidencial'
 * @param {object} params - Query params
 * @returns {Promise<object>} - Datos JSON parseados
 */
export async function fetchOnpe(endpoint, params = {}) {
  // Delay fijo antes de cada request para no estresar los servidores ONPE
  await sleep(DELAY_MS);
  
  return pRetry(
    async () => {
      const response = await httpClient.get(endpoint, { params });
      return response.data;
    },
    {
      retries: MAX_RETRIES,
      factor: 2,
      minTimeout: 2000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        logger.warn(
          { attempt: error.attemptNumber, retriesLeft: error.retriesLeft, endpoint },
          'Retry intento fallido'
        );
        
        // Si ONPE devuelve 429, respetar Retry-After
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          logger.warn({ retryAfter }, 'Rate limit alcanzado, esperando...');
          return sleep(retryAfter * 1000);
        }
      },
    }
  );
}

/**
 * Obtiene resultados presidenciales nacionales
 */
export async function fetchResultadosPresidencial() {
  // ACTUALIZAR ESTE ENDPOINT con el valor exacto de docs/endpoints.md
  return fetchOnpe('/api/resultados/presidencial');
}

/**
 * Obtiene resultados presidenciales por ubigeo
 * @param {string} ubigeo - Código de 6 dígitos
 */
export async function fetchResultadosByUbigeo(tipoEleccion, ubigeo) {
  return fetchOnpe(`/api/resultados/${tipoEleccion}`, { ubigeo });
}

/**
 * Obtiene el progreso general del conteo
 */
export async function fetchProgreso() {
  return fetchOnpe('/api/progreso');
}
```

---

### Paso 2.3 — onpe.parser.js

```javascript
// packages/collector/src/onpe.parser.js
// Valida y normaliza el JSON crudo de ONPE al modelo interno.
// Si la validación falla, lanza un error descriptivo sin tocar la BD.

import { z } from 'zod';
import pino from 'pino';

const logger = pino({ name: 'onpe.parser' });

// Schema de validación del payload ONPE
// ACTUALIZAR los campos exactos según docs/endpoints.md
const ResultadoItemSchema = z.object({
  candidato: z.string().min(2).max(300),
  partido: z.string().min(1).max(200),
  ubigeo: z.string().length(6).regex(/^\d{6}$/),
  region: z.string().min(1).max(100),
  provincia: z.string().min(1).max(100),
  distrito: z.string().min(1).max(100),
  votos: z.number().int().min(0),
  porcentaje: z.number().min(0).max(100),
  actas_mesa: z.number().int().min(0).optional(),
});

const PayloadOnpeSchema = z.object({
  actas_procesadas: z.number().int().min(0),
  actas_total: z.number().int().min(1),
  resultados: z.array(ResultadoItemSchema).min(1),
});

/**
 * Parsea y valida el payload crudo de ONPE.
 * 
 * @param {object} rawData - JSON crudo de ONPE
 * @param {string} tipoEleccion - 'presidencial' | 'congresistas' | 'parlamento_andino'
 * @returns {{ actasProcesadas, actasTotal, resultados[] }}
 */
export function parsePayloadOnpe(rawData, tipoEleccion) {
  const parsed = PayloadOnpeSchema.safeParse(rawData);
  
  if (!parsed.success) {
    logger.error(
      { errors: parsed.error.flatten(), tipoEleccion },
      'Payload ONPE no pasó validación Zod — descartando snapshot'
    );
    throw new Error(`Payload ONPE inválido para ${tipoEleccion}: ${parsed.error.message}`);
  }
  
  const data = parsed.data;
  
  // Normalización adicional: limpiar espacios, estandarizar mayúsculas
  const resultadosNormalizados = data.resultados.map(r => ({
    candidato: r.candidato.trim().toUpperCase(),
    partido: r.partido.trim(),
    ubigeo: r.ubigeo,
    region: r.region.trim(),
    provincia: r.provincia.trim(),
    distrito: r.distrito.trim(),
    votos: r.votos,
    porcentaje: r.porcentaje,
    actasMesa: r.actas_mesa ?? null,
  }));
  
  logger.debug(
    { tipoEleccion, actasProcesadas: data.actas_procesadas, n: resultadosNormalizados.length },
    'Payload parseado correctamente'
  );
  
  return {
    actasProcesadas: data.actas_procesadas,
    actasTotal: data.actas_total,
    resultados: resultadosNormalizados,
  };
}
```

---

### Paso 2.4 — alert.service.js

```javascript
// packages/collector/src/alert.service.js
// Genera alertas basadas en comparaciones entre snapshots.

import pino from 'pino';

const logger = pino({ name: 'alert.service' });

const THRESHOLD_SPEED = parseInt(process.env.ALERT_THRESHOLD_SPEED_VOTES_PER_MIN || '50000');
const THRESHOLD_BATCH_PCT = parseFloat(process.env.ALERT_THRESHOLD_BATCH_ACTAS_PCT || '5');

/**
 * Compara votos actuales vs anteriores y genera alertas.
 * 
 * @param {object} db - Instancia de Pool de pg
 * @param {number} snapshotActualId
 * @param {number} snapshotAnteriorId - null si es el primer snapshot
 * @param {object} snapshotActual - { actasProcesadas, actasTotal, ... }
 * @param {object} snapshotAnterior - null si es el primer snapshot
 * @param {number} deltaTimeMs - Milisegundos entre snapshots
 */
export async function detectarAnomalias(
  db,
  snapshotActualId,
  snapshotAnteriorId,
  snapshotActual,
  snapshotAnterior,
  deltaTimeMs
) {
  const alertas = [];
  
  if (snapshotAnteriorId === null) {
    logger.info('Primer snapshot, no hay comparación posible');
    return alertas;
  }
  
  // ─── PRUEBA 1: Votos negativos (Δv < 0) ────────────────────────────
  // Consultar directamente en BD para aprovechar la función SQL
  const deltasResult = await db.query(`
    SELECT
      vs_curr.candidato_id,
      c.nombre_completo,
      vs_curr.ubigeo_codigo,
      vs_prev.votos AS votos_anterior,
      vs_curr.votos AS votos_actual,
      (vs_curr.votos - vs_prev.votos) AS delta
    FROM votos_snapshot vs_curr
    JOIN votos_snapshot vs_prev
      ON vs_prev.candidato_id = vs_curr.candidato_id
      AND vs_prev.ubigeo_codigo = vs_curr.ubigeo_codigo
      AND vs_prev.snapshot_id = $2
    JOIN candidatos c ON c.id = vs_curr.candidato_id
    WHERE vs_curr.snapshot_id = $1
      AND (vs_curr.votos - vs_prev.votos) < 0
  `, [snapshotActualId, snapshotAnteriorId]);
  
  for (const row of deltasResult.rows) {
    logger.warn(
      { candidato: row.nombre_completo, ubigeo: row.ubigeo_codigo, delta: row.delta },
      '⚠️  ALERTA CRÍTICA: votos negativos detectados'
    );
    
    alertas.push({
      tipo: 'VOTOS_NEGATIVOS',
      severidad: 'CRITICA',
      snapshotId: snapshotActualId,
      candidatoId: row.candidato_id,
      ubigeoCodigo: row.ubigeo_codigo,
      descripcion: `Δvotos = ${row.delta} para "${row.nombre_completo}" en ubigeo ${row.ubigeo_codigo}. ` +
                   `Anterior: ${row.votos_anterior}, Actual: ${row.votos_actual}`,
      valorAnterior: row.votos_anterior,
      valorActual: row.votos_actual,
      deltaValor: row.delta,
    });
  }
  
  // ─── PRUEBA 2: Velocidad inusual de carga ───────────────────────────
  if (deltaTimeMs > 0) {
    const deltaTimeMin = deltaTimeMs / 60000;
    
    const velocidadResult = await db.query(`
      SELECT
        vs_curr.candidato_id,
        c.nombre_completo,
        SUM(vs_curr.votos - COALESCE(vs_prev.votos, 0)) AS delta_votos_total
      FROM votos_snapshot vs_curr
      JOIN candidatos c ON c.id = vs_curr.candidato_id
      LEFT JOIN votos_snapshot vs_prev
        ON vs_prev.candidato_id = vs_curr.candidato_id
        AND vs_prev.ubigeo_codigo = vs_curr.ubigeo_codigo
        AND vs_prev.snapshot_id = $2
      WHERE vs_curr.snapshot_id = $1
        AND (vs_curr.votos - COALESCE(vs_prev.votos, 0)) > 0
      GROUP BY vs_curr.candidato_id, c.nombre_completo
      HAVING SUM(vs_curr.votos - COALESCE(vs_prev.votos, 0)) / $3 > $4
    `, [snapshotActualId, snapshotAnteriorId, deltaTimeMin, THRESHOLD_SPEED]);
    
    for (const row of velocidadResult.rows) {
      const velocidad = Math.round(row.delta_votos_total / deltaTimeMin);
      alertas.push({
        tipo: 'VELOCIDAD_INUSUAL',
        severidad: 'ALTA',
        snapshotId: snapshotActualId,
        candidatoId: row.candidato_id,
        ubigeoCodigo: null,
        descripcion: `Velocidad de ${velocidad.toLocaleString()} votos/min para "${row.nombre_completo}". ` +
                     `Umbral: ${THRESHOLD_SPEED.toLocaleString()} votos/min`,
        valorAnterior: null,
        valorActual: velocidad,
        deltaValor: row.delta_votos_total,
      });
    }
  }
  
  // ─── PRUEBA 3: Lote masivo de actas (salto > N%) ────────────────────
  if (snapshotAnterior && snapshotActual.actasTotal > 0) {
    const pctAnterior = (snapshotAnterior.actasProcesadas / snapshotActual.actasTotal) * 100;
    const pctActual = (snapshotActual.actasProcesadas / snapshotActual.actasTotal) * 100;
    const saltoPct = pctActual - pctAnterior;
    
    if (saltoPct > THRESHOLD_BATCH_PCT) {
      alertas.push({
        tipo: 'LOTE_MASIVO',
        severidad: 'MEDIA',
        snapshotId: snapshotActualId,
        candidatoId: null,
        ubigeoCodigo: null,
        descripcion: `Salto de ${saltoPct.toFixed(2)}% de actas en un intervalo. ` +
                     `Anterior: ${pctAnterior.toFixed(2)}%, Actual: ${pctActual.toFixed(2)}%`,
        valorAnterior: pctAnterior,
        valorActual: pctActual,
        deltaValor: saltoPct,
      });
    }
  }
  
  return alertas;
}

/**
 * Persiste las alertas en la BD e itera sobre el array devuelto por detectarAnomalias.
 */
export async function persistirAlertas(db, alertas) {
  if (alertas.length === 0) return;
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    for (const alerta of alertas) {
      await client.query(`
        INSERT INTO alertas
          (tipo, severidad, snapshot_id, candidato_id, ubigeo_codigo,
           descripcion, valor_anterior, valor_actual, delta_valor)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        alerta.tipo, alerta.severidad, alerta.snapshotId,
        alerta.candidatoId, alerta.ubigeoCodigo, alerta.descripcion,
        alerta.valorAnterior, alerta.valorActual, alerta.deltaValor,
      ]);
    }
    
    await client.query('COMMIT');
    logger.info({ count: alertas.length }, 'Alertas persistidas');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

---

### Paso 2.5 — snapshot.service.js

```javascript
// packages/collector/src/snapshot.service.js
// Orquesta la persistencia de un snapshot completo en una transacción atómica.

import pino from 'pino';
import { detectarAnomalias, persistirAlertas } from './alert.service.js';

const logger = pino({ name: 'snapshot.service' });

/**
 * Persiste un snapshot completo y ejecuta la detección de anomalías.
 * Toda la operación es atómica: si algo falla, nada se persiste.
 * 
 * @param {Pool} db - Pool de pg
 * @param {object} datos - Resultado de onpe.parser.parsePayloadOnpe()
 * @param {string} tipoEleccion
 * @param {EventEmitter} eventBus - Para emitir eventos a WebSocket
 * @returns {number} ID del snapshot creado
 */
export async function persistirSnapshot(db, datos, tipoEleccion, eventBus) {
  const startTime = Date.now();
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Insertar el snapshot cabecera
    const snapshotResult = await client.query(`
      INSERT INTO snapshots (fuente, tipo_eleccion, actas_procesadas, actas_total)
      VALUES ('ONPE_LIVE', $1, $2, $3)
      RETURNING id, timestamp
    `, [tipoEleccion, datos.actasProcesadas, datos.actasTotal]);
    
    const snapshotId = snapshotResult.rows[0].id;
    const snapshotTimestamp = snapshotResult.rows[0].timestamp;
    
    // 2. Upsert candidatos y ubigeos (pueden ya existir de snapshots anteriores)
    const candidatoIds = {};
    
    for (const r of datos.resultados) {
      // Upsert partido
      const partidoResult = await client.query(`
        INSERT INTO partidos (nombre) VALUES ($1)
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id
      `, [r.partido]);
      const partidoId = partidoResult.rows[0].id;
      
      // Upsert candidato
      const candidatoResult = await client.query(`
        INSERT INTO candidatos (nombre_completo, partido_id, tipo_eleccion)
        VALUES ($1, $2, $3)
        ON CONFLICT (nombre_completo, tipo_eleccion) DO UPDATE SET partido_id = EXCLUDED.partido_id
        RETURNING id
      `, [r.candidato, partidoId, tipoEleccion]);
      
      candidatoIds[`${r.candidato}:${tipoEleccion}`] = candidatoResult.rows[0].id;
      
      // Upsert ubigeo
      await client.query(`
        INSERT INTO ubigeos (codigo, region, provincia, distrito)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (codigo) DO NOTHING
      `, [r.ubigeo, r.region, r.provincia, r.distrito]);
    }
    
    // 3. Insertar todos los votos_snapshot en un batch
    // Construir VALUES multi-row para eficiencia
    const values = [];
    const params = [];
    let paramIdx = 1;
    
    for (const r of datos.resultados) {
      const candidatoId = candidatoIds[`${r.candidato}:${tipoEleccion}`];
      values.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5})`);
      params.push(snapshotId, candidatoId, r.ubigeo, r.votos, r.porcentaje, r.actasMesa);
      paramIdx += 6;
    }
    
    await client.query(`
      INSERT INTO votos_snapshot
        (snapshot_id, candidato_id, ubigeo_codigo, votos, porcentaje, actas_contabilizadas)
      VALUES ${values.join(', ')}
    `, params);
    
    await client.query('COMMIT');
    
    const duracion = Date.now() - startTime;
    logger.info({ snapshotId, tipoEleccion, n: datos.resultados.length, duracion }, 'Snapshot persistido');
    
    // 4. Actualizar duración del snapshot (fuera de la transacción principal)
    await db.query('UPDATE snapshots SET duracion_ms = $1 WHERE id = $2', [duracion, snapshotId]);
    
    // 5. Detectar anomalías (usa la BD, no requiere transacción activa)
    const snapshotAnteriorId = await obtenerSnapshotAnteriorId(db, snapshotId, tipoEleccion);
    const snapshotAnteriorData = snapshotAnteriorId
      ? await obtenerDatosSnapshot(db, snapshotAnteriorId)
      : null;
    
    const deltaTimeMs = snapshotAnteriorData
      ? snapshotTimestamp - new Date(snapshotAnteriorData.timestamp).getTime()
      : 0;
    
    const alertas = await detectarAnomalias(
      db, snapshotId, snapshotAnteriorId, datos, snapshotAnteriorData, deltaTimeMs
    );
    
    if (alertas.length > 0) {
      await persistirAlertas(db, alertas);
      
      // Emitir alertas críticas al WebSocket inmediatamente
      const alertasCriticas = alertas.filter(a => a.severidad === 'CRITICA');
      if (alertasCriticas.length > 0 && eventBus) {
        eventBus.emit('alertas:criticas', alertasCriticas);
        logger.warn({ count: alertasCriticas.length }, '🚨 Alertas críticas emitidas al WebSocket');
      }
    }
    
    // 6. Refrescar vista materializada
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY resultados_actuales');
    
    return snapshotId;
    
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error({ err, tipoEleccion }, 'Error persistiendo snapshot — ROLLBACK aplicado');
    throw err;
  } finally {
    client.release();
  }
}

async function obtenerSnapshotAnteriorId(db, snapshotActualId, tipoEleccion) {
  const result = await db.query(`
    SELECT id FROM snapshots
    WHERE tipo_eleccion = $1 AND id < $2
    ORDER BY id DESC LIMIT 1
  `, [tipoEleccion, snapshotActualId]);
  return result.rows[0]?.id ?? null;
}

async function obtenerDatosSnapshot(db, snapshotId) {
  const result = await db.query(
    'SELECT * FROM snapshots WHERE id = $1',
    [snapshotId]
  );
  return result.rows[0] ?? null;
}
```

---

### Paso 2.6 — scheduler.js

```javascript
// packages/collector/src/scheduler.js
import 'dotenv/config';
import cron from 'node-cron';
import { Pool } from 'pg';
import pino from 'pino';
import { EventEmitter } from 'events';
import pLimit from 'p-limit';
import { fetchResultadosPresidencial } from './onpe.client.js';
import { parsePayloadOnpe } from './onpe.parser.js';
import { persistirSnapshot } from './snapshot.service.js';

const logger = pino({
  name: 'scheduler',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const eventBus = new EventEmitter();

// Exportar para que la API lo reutilice vía import
export { eventBus };

const CRON_EXPRESSION = process.env.POLL_INTERVAL_CRON || '*/5 * * * *';
const TIPOS_ELECCION = ['presidencial', 'congresistas']; // Ampliar según endpoints disponibles

// Mutex: evitar ejecuciones solapadas
let ejecutando = false;

// Limitar concurrencia: máximo 1 llamada a ONPE a la vez (rate limiting estricto)
const limitConcurrencia = pLimit(1);

async function ejecutarCiclo() {
  if (ejecutando) {
    logger.warn('Ciclo anterior aún en ejecución, omitiendo este tick');
    return;
  }
  
  ejecutando = true;
  const inicioTotal = Date.now();
  logger.info('Iniciando ciclo de scraping');
  
  const resultados = { exitosos: 0, fallidos: 0 };
  
  for (const tipo of TIPOS_ELECCION) {
    await limitConcurrencia(async () => {
      try {
        logger.info({ tipo }, 'Scraping tipo de elección');
        
        // Obtener datos crudos de ONPE (incluye delay y retry)
        const rawData = await fetchResultadosPresidencial(tipo);
        
        // Parsear y validar
        const datos = parsePayloadOnpe(rawData, tipo);
        
        // Persistir y detectar anomalías
        const snapshotId = await persistirSnapshot(db, datos, tipo, eventBus);
        
        logger.info({ tipo, snapshotId }, 'Ciclo completado para tipo');
        resultados.exitosos++;
        
      } catch (err) {
        logger.error({ err, tipo }, 'Error en ciclo para tipo de elección');
        resultados.fallidos++;
        // No relanzar: continuar con el siguiente tipo
      }
    });
  }
  
  ejecutando = false;
  logger.info({
    duracionMs: Date.now() - inicioTotal,
    ...resultados,
  }, 'Ciclo de scraping finalizado');
}

// Arrancar el scheduler
logger.info({ cron: CRON_EXPRESSION }, 'Scheduler iniciado');

cron.schedule(CRON_EXPRESSION, ejecutarCiclo, {
  timezone: 'America/Lima',
});

// Ejecutar inmediatamente al arrancar (sin esperar el primer tick)
ejecutarCiclo().catch(err => logger.error({ err }, 'Error en ejecución inicial'));

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando scheduler...');
  await db.end();
  process.exit(0);
});
```

---

### Criterios de aceptación Fase 2

- [ ] `pnpm --filter @auditavoto/collector dev` arranca sin errores
- [ ] Al conectar con datos históricos sintéticos, el ciclo detecta y registra snapshots en BD
- [ ] `psql $DATABASE_URL -c "SELECT COUNT(*) FROM snapshots"` > 0 después del primer ciclo
- [ ] `psql $DATABASE_URL -c "SELECT COUNT(*) FROM alertas WHERE tipo = 'VOTOS_NEGATIVOS'"` retorna 0 con datos limpios

---

## Fase 3 — Motor estadístico

**Duración estimada:** 5–7 días  
**Prerequisito:** Fase 2 con al menos 10 snapshots acumulados con datos EG2021.

---

### Paso 3.1 — Inicializar paquete stats

```bash
cd packages/stats

cat > package.json << 'EOF'
{
  "name": "@auditavoto/stats",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "pg": "^8.11.0",
    "pino": "^8.16.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0"
  }
}
EOF

pnpm install
```

---

### Paso 3.2 — benford.js

```javascript
// packages/stats/src/benford.js
/**
 * Segunda Ley de Benford (segundo dígito significativo).
 * 
 * SUPUESTOS DE VALIDEZ:
 * - Aplicar sobre TOTALES DE VOTOS POR DISTRITO (no por mesa)
 * - Mínimo 100 unidades de análisis (distritos)
 * - Los datos deben abarcar varios órdenes de magnitud
 * 
 * NUNCA aplicar a:
 * - Datos de mesas individuales (pocas decenas de votos)
 * - Cualquier conjunto con menos de 100 observaciones
 */

// Distribución teórica de Benford para el segundo dígito (0-9)
export const BENFORD_2ND_DIGIT_EXPECTED = {
  0: 0.11968,
  1: 0.11389,
  2: 0.10882,
  3: 0.10433,
  4: 0.10031,
  5: 0.09668,
  6: 0.09337,
  7: 0.09035,
  8: 0.08757,
  9: 0.08500,
};

/**
 * Extrae el segundo dígito significativo de un número.
 * Ejemplo: 12345 → 2, 0.00567 → 6, 100 → 0
 * 
 * @param {number} n
 * @returns {number|null} Dígito 0-9 o null si no aplica
 */
export function getSecondDigit(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  
  // Normalizar a formato científico para extraer dígitos significativos
  const str = n.toExponential();         // e.g. "1.2345e+4"
  const mantissa = str.split('e')[0];    // "1.2345"
  const digits = mantissa.replace('.', ''); // "12345"
  
  if (digits.length < 2) return null;
  return parseInt(digits[1]);
}

/**
 * Calcula la distribución observada del segundo dígito.
 * 
 * @param {number[]} valores - Array de totales de votos por distrito
 * @returns {{ distribucion: object, nValidos: number }}
 */
export function calcularDistribucionObservada(valores) {
  const conteos = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  let nValidos = 0;
  
  for (const v of valores) {
    const digit = getSecondDigit(v);
    if (digit !== null) {
      conteos[digit]++;
      nValidos++;
    }
  }
  
  if (nValidos === 0) return { distribucion: conteos, nValidos: 0 };
  
  const distribucion = {};
  for (const [digit, count] of Object.entries(conteos)) {
    distribucion[digit] = count / nValidos;
  }
  
  return { distribucion, nValidos };
}

/**
 * Test chi-cuadrado entre distribución observada y la esperada por Benford.
 * 
 * H0: Los datos siguen la distribución de Benford
 * H1: Los datos NO siguen la distribución de Benford
 * 
 * Si p-valor < 0.05, rechazar H0 → anomalía estadística
 * 
 * @param {number[]} valores - Totales de votos por distrito
 * @param {number} minMuestras - Mínimo de muestras requeridas (default: 100)
 * @returns {{ chi2: number, pValue: number, nMuestras: number, esAnomalía: boolean, razonRechazo?: string }}
 */
export function testBenford(valores, minMuestras = 100) {
  const { distribucion, nValidos } = calcularDistribucionObservada(valores);
  
  if (nValidos < minMuestras) {
    return {
      chi2: null,
      pValue: null,
      nMuestras: nValidos,
      esAnomalia: false,
      razonRechazo: `Muestra insuficiente: ${nValidos} < ${minMuestras} mínimo requerido`,
    };
  }
  
  // Calcular estadístico chi-cuadrado
  // χ² = Σ (Observado - Esperado)² / Esperado
  let chi2 = 0;
  for (let digit = 0; digit <= 9; digit++) {
    const observado = (distribucion[digit] || 0) * nValidos;
    const esperado = BENFORD_2ND_DIGIT_EXPECTED[digit] * nValidos;
    chi2 += Math.pow(observado - esperado, 2) / esperado;
  }
  
  // Calcular p-valor para chi² con 9 grados de libertad (10 dígitos - 1)
  const pValue = chiSquaredPValue(chi2, 9);
  
  return {
    chi2: Math.round(chi2 * 1e6) / 1e6,
    pValue: Math.round(pValue * 1e8) / 1e8,
    nMuestras: nValidos,
    esAnomalia: pValue < 0.05,
    distribucionObservada: distribucion,
    distribucionEsperada: BENFORD_2ND_DIGIT_EXPECTED,
  };
}

/**
 * Aproximación del p-valor para distribución chi-cuadrado.
 * Implementación basada en la función gamma incompleta regularizada.
 * 
 * @param {number} x - Estadístico chi-cuadrado
 * @param {number} k - Grados de libertad
 * @returns {number} p-valor (probabilidad de observar chi² >= x bajo H0)
 */
function chiSquaredPValue(x, k) {
  // P(X >= x) = 1 - CDF(x) = Q(k/2, x/2)
  return upperIncompleteGamma(k / 2, x / 2);
}

// Función gamma incompleta superior regularizada Q(a, x)
// Aproximación por series (suficiente para este caso de uso)
function upperIncompleteGamma(a, x) {
  if (x < 0) return 1.0;
  if (x === 0) return 1.0;
  
  // Para valores grandes usar la aproximación de cola
  if (x > a + 1) {
    return 1 - lowerIncompleteGammaSeries(a, x);
  }
  
  return gammaCF(a, x);
}

function lowerIncompleteGammaSeries(a, x) {
  let sum = 1.0 / a;
  let term = 1.0 / a;
  for (let n = 1; n <= 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-10 * Math.abs(sum)) break;
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum;
}

function gammaCF(a, x) {
  // Fracción continua de Lentz
  let fpmin = 1e-300;
  let b = x + 1.0 - a;
  let c = 1.0 / fpmin;
  let d = 1.0 / b;
  let h = d;
  
  for (let i = 1; i <= 100; i++) {
    const an = -i * (i - a);
    b += 2.0;
    d = an * d + b;
    if (Math.abs(d) < fpmin) d = fpmin;
    c = b + an / c;
    if (Math.abs(c) < fpmin) c = fpmin;
    d = 1.0 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1.0) < 1e-10) break;
  }
  
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

function logGamma(z) {
  // Aproximación de Stirling para logΓ(z)
  const coeffs = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = z;
  let x = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const c of coeffs) {
    y += 1;
    ser += c / y;
  }
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}
```

---

### Paso 3.3 — zscore.js

```javascript
// packages/stats/src/zscore.js

/**
 * Detección de outliers por Z-score.
 * 
 * Para cada candidato, calcula media y desviación estándar del
 * porcentaje de votos a nivel nacional/regional.
 * Distritos con |Z| > 3.0 se marcan como estadísticamente inusuales.
 */

/**
 * @param {Array<{ubigeoCodigo: string, porcentaje: number}>} datos
 * @param {number} umbral - Default 3.0
 * @returns {Array<{ubigeoCodigo, porcentaje, zscore, esOutlier}>}
 */
export function calcularZScores(datos, umbral = 3.0) {
  if (datos.length < 5) {
    return datos.map(d => ({
      ...d,
      zscore: null,
      esOutlier: false,
      razonRechazo: 'Muestra insuficiente (< 5 distritos)',
    }));
  }
  
  const porcentajes = datos.map(d => d.porcentaje);
  const media = porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length;
  
  const varianza = porcentajes.reduce((sum, p) => sum + Math.pow(p - media, 2), 0)
    / (porcentajes.length - 1); // Desviación estándar muestral (Bessel's correction)
  const desviacion = Math.sqrt(varianza);
  
  if (desviacion === 0) {
    return datos.map(d => ({
      ...d, media, desviacion,
      zscore: 0,
      esOutlier: false,
    }));
  }
  
  return datos.map(d => {
    const zscore = (d.porcentaje - media) / desviacion;
    return {
      ...d,
      media: Math.round(media * 10000) / 10000,
      desviacion: Math.round(desviacion * 10000) / 10000,
      zscore: Math.round(zscore * 1000000) / 1000000,
      esOutlier: Math.abs(zscore) > umbral,
    };
  });
}

/**
 * Ejecuta el análisis Z-score para todos los candidatos de un snapshot
 * y persiste los resultados en zscore_results.
 * 
 * @param {Pool} db
 * @param {number} snapshotId
 */
export async function ejecutarZScoreParaSnapshot(db, snapshotId) {
  // Obtener todos los candidatos del snapshot
  const candidatos = await db.query(`
    SELECT DISTINCT candidato_id
    FROM votos_snapshot
    WHERE snapshot_id = $1
  `, [snapshotId]);
  
  for (const { candidato_id } of candidatos.rows) {
    const datos = await db.query(`
      SELECT ubigeo_codigo, porcentaje
      FROM votos_snapshot
      WHERE snapshot_id = $1 AND candidato_id = $2 AND porcentaje IS NOT NULL
    `, [snapshotId, candidato_id]);
    
    if (datos.rows.length < 5) continue;
    
    const resultados = calcularZScores(
      datos.rows.map(r => ({ ubigeoCodigo: r.ubigeo_codigo, porcentaje: parseFloat(r.porcentaje) }))
    );
    
    // Calcular media y desviacion para la inserción
    const media = resultados[0]?.media ?? 0;
    const desviacion = resultados[0]?.desviacion ?? 0;
    
    // Insertar batch
    const values = [];
    const params = [];
    let idx = 1;
    
    for (const r of resultados) {
      if (r.zscore === null) continue;
      values.push(`($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5})`);
      params.push(snapshotId, candidato_id, r.ubigeoCodigo, r.porcentaje, media, desviacion, r.zscore);
      // Corregir índice — 7 params por fila
      values[values.length - 1] = `($${idx}, $${idx+1}, $${idx+2}, $${idx+3}, $${idx+4}, $${idx+5}, $${idx+6})`;
      idx += 7;
    }
    
    if (values.length === 0) continue;
    
    await db.query(`
      INSERT INTO zscore_results
        (snapshot_id, candidato_id, ubigeo_codigo, porcentaje, media_nacional, desv_estandar, zscore)
      VALUES ${values.join(', ')}
      ON CONFLICT (snapshot_id, candidato_id, ubigeo_codigo) DO NOTHING
    `, params);
  }
}
```

---

### Paso 3.4 — Tests unitarios del motor estadístico

```javascript
// packages/stats/tests/benford.test.js
import { describe, it, expect } from 'vitest';
import { getSecondDigit, testBenford, BENFORD_2ND_DIGIT_EXPECTED } from '../src/benford.js';

describe('getSecondDigit', () => {
  it('extrae el segundo dígito de un entero positivo', () => {
    expect(getSecondDigit(12345)).toBe(2);
    expect(getSecondDigit(90000)).toBe(0);
    expect(getSecondDigit(100)).toBe(0);
  });
  
  it('retorna null para valores inválidos', () => {
    expect(getSecondDigit(0)).toBeNull();
    expect(getSecondDigit(-5)).toBeNull();
    expect(getSecondDigit(NaN)).toBeNull();
  });
});

describe('testBenford', () => {
  it('rechaza muestras insuficientes', () => {
    const result = testBenford([100, 200, 300], 100);
    expect(result.razonRechazo).toMatch(/insuficiente/);
    expect(result.esAnomalia).toBe(false);
  });
  
  it('no detecta anomalía en datos que siguen Benford', () => {
    // Generar ~300 números que siguen distribución de Benford artificialmente
    const datos = generarDatosBenford(300);
    const result = testBenford(datos, 100);
    expect(result.pValue).toBeGreaterThan(0.05);
    expect(result.esAnomalia).toBe(false);
  });
  
  it('detecta anomalía en datos uniformes (no siguen Benford)', () => {
    // Números donde todos los segundos dígitos son igualmente probables → anomalía
    const datos = Array.from({ length: 200 }, (_, i) => 10 + (i % 10));
    const result = testBenford(datos, 100);
    expect(result.esAnomalia).toBe(true);
  });
});

// Helper: genera números que aproximadamente siguen la ley de Benford
function generarDatosBenford(n) {
  const result = [];
  for (let i = 0; i < n; i++) {
    result.push(Math.floor(Math.pow(10, 1 + Math.random() * 4)));
  }
  return result;
}
```

```bash
# Ejecutar tests del motor estadístico
cd packages/stats && pnpm test
```

---

## Fase 4 — API REST

**Duración estimada:** 3–4 días

---

### Paso 4.1 — Inicializar paquete api

```bash
cd packages/api

cat > package.json << 'EOF'
{
  "name": "@auditavoto/api",
  "version": "1.0.0",
  "type": "module",
  "main": "src/app.js",
  "scripts": {
    "dev": "node --watch src/app.js",
    "start": "node src/app.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.6.0",
    "pg": "^8.11.0",
    "ioredis": "^5.3.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.1.0",
    "express-validator": "^7.0.0",
    "compression": "^1.7.4",
    "pino": "^8.16.0",
    "pino-http": "^9.0.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "supertest": "^6.3.0",
    "vitest": "^1.0.0"
  }
}
EOF

pnpm install
```

---

### Paso 4.2 — app.js principal

```javascript
// packages/api/src/app.js
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { pinoHttp } from 'pino-http';
import pino from 'pino';

import { snapshotsRouter } from './routes/snapshots.js';
import { resultadosRouter } from './routes/resultados.js';
import { historicoRouter } from './routes/historico.js';
import { alertasRouter } from './routes/alertas.js';
import { auditoriaRouter } from './routes/auditoria.js';
import { exportRouter } from './routes/export.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createDbPool } from './services/db.js';
import { createRedisClient } from './services/cache.js';

const logger = pino({ name: 'api' });
const app = express();
const httpServer = createServer(app);

// ── WebSocket ────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: { origin: process.env.API_CORS_ORIGIN || 'http://localhost:5173' },
});

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Cliente WebSocket conectado');
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Cliente WebSocket desconectado');
  });
});

// ── Middlewares globales ─────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.API_CORS_ORIGIN || 'http://localhost:5173' }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

// ── Inyectar dependencias en req ─────────────────────────
const db = createDbPool();
const redis = createRedisClient();

app.use((req, _res, next) => {
  req.db = db;
  req.redis = redis;
  req.io = io;
  next();
});

// ── Rutas ─────────────────────────────────────────────────
app.use('/api/snapshots', snapshotsRouter);
app.use('/api/resultados', resultadosRouter);
app.use('/api/historico', historicoRouter);
app.use('/api/alertas', alertasRouter);
app.use('/api/auditoria', auditoriaRouter);
app.use('/api/export', exportRouter);

// Health check
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// ── Error handler global ──────────────────────────────────
app.use(errorHandler);

// ── Arrancar servidor ─────────────────────────────────────
const PORT = parseInt(process.env.API_PORT || '3001');
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'API AuditaVoto escuchando');
});

export { app, io };
```

---

### Paso 4.3 — Rutas principales

```javascript
// packages/api/src/routes/resultados.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting: 200 req/min en este endpoint (muy consultado)
const limiter = rateLimit({ windowMs: 60_000, max: 200 });

/**
 * GET /api/resultados/:tipoEleccion
 * Devuelve el estado actual (último snapshot) para un tipo de elección.
 * TTL de caché Redis: 30 segundos.
 */
router.get('/:tipoEleccion', limiter, async (req, res, next) => {
  const { tipoEleccion } = req.params;
  const tiposValidos = ['presidencial', 'congresistas', 'parlamento_andino'];
  
  if (!tiposValidos.includes(tipoEleccion)) {
    return res.status(400).json({
      error: `tipo_eleccion inválido. Valores aceptados: ${tiposValidos.join(', ')}`,
    });
  }
  
  const cacheKey = `resultados:${tipoEleccion}`;
  
  try {
    // Intentar caché
    const cached = await req.redis.get(cacheKey);
    if (cached) {
      return res.json({ data: JSON.parse(cached), fromCache: true });
    }
    
    // Consultar vista materializada
    const result = await req.db.query(`
      SELECT
        ra.candidato_id,
        ra.nombre_completo,
        ra.partido,
        ra.color_hex,
        SUM(ra.votos) AS votos_total,
        MAX(ra.ultima_actualizacion) AS ultima_actualizacion,
        MAX(ra.ultimo_snapshot_id) AS snapshot_id
      FROM resultados_actuales ra
      WHERE ra.tipo_eleccion = $1
      GROUP BY ra.candidato_id, ra.nombre_completo, ra.partido, ra.color_hex
      ORDER BY votos_total DESC
    `, [tipoEleccion]);
    
    const snapshotInfo = await req.db.query(`
      SELECT id, timestamp, actas_procesadas, actas_total, porcentaje_avance
      FROM snapshots
      WHERE tipo_eleccion = $1
      ORDER BY id DESC LIMIT 1
    `, [tipoEleccion]);
    
    const data = {
      tipoEleccion,
      snapshot: snapshotInfo.rows[0] ?? null,
      candidatos: result.rows,
    };
    
    // Guardar en caché por 30 segundos
    await req.redis.setex(cacheKey, 30, JSON.stringify(data));
    
    res.json({ data, fromCache: false });
  } catch (err) {
    next(err);
  }
});

export { router as resultadosRouter };
```

```javascript
// packages/api/src/routes/historico.js
import { Router } from 'express';

const router = Router();

/**
 * GET /api/historico/:candidatoId?ubigeo=XXXXXX&desde=ISO&hasta=ISO
 * Serie temporal de votos para un candidato, opcionalmente filtrada por ubigeo.
 */
router.get('/:candidatoId', async (req, res, next) => {
  const { candidatoId } = req.params;
  const { ubigeo, desde, hasta } = req.query;
  
  if (isNaN(parseInt(candidatoId))) {
    return res.status(400).json({ error: 'candidatoId debe ser un número entero' });
  }
  
  try {
    let query = `
      SELECT
        s.timestamp,
        s.id AS snapshot_id,
        s.actas_procesadas,
        s.actas_total,
        ${ubigeo ? 'vs.ubigeo_codigo,' : ''}
        ${ubigeo ? 'vs.votos,' : 'SUM(vs.votos) AS votos,'}
        ${ubigeo ? 'vs.porcentaje' : 'AVG(vs.porcentaje) AS porcentaje'}
      FROM votos_snapshot vs
      JOIN snapshots s ON s.id = vs.snapshot_id
      WHERE vs.candidato_id = $1
      ${ubigeo ? 'AND vs.ubigeo_codigo = $2' : ''}
      ${desde ? `AND s.timestamp >= '${new Date(desde).toISOString()}'` : ''}
      ${hasta ? `AND s.timestamp <= '${new Date(hasta).toISOString()}'` : ''}
      ${ubigeo ? '' : 'GROUP BY s.timestamp, s.id, s.actas_procesadas, s.actas_total'}
      ORDER BY s.timestamp ASC
    `;
    
    const params = ubigeo ? [candidatoId, ubigeo] : [candidatoId];
    const result = await req.db.query(query, params);
    
    res.json({
      data: {
        candidatoId: parseInt(candidatoId),
        ubigeo: ubigeo ?? null,
        serie: result.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as historicoRouter };
```

```javascript
// packages/api/src/routes/alertas.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 300 });

/**
 * GET /api/alertas?severidad=CRITICA&tipo=VOTOS_NEGATIVOS&limit=50&offset=0
 */
router.get('/', limiter, async (req, res, next) => {
  const {
    severidad,
    tipo,
    limit = 50,
    offset = 0,
    candidato_id,
    ubigeo,
  } = req.query;
  
  const severidadesValidas = ['CRITICA', 'ALTA', 'MEDIA', 'INFO'];
  const tiposValidos = ['VOTOS_NEGATIVOS', 'VELOCIDAD_INUSUAL', 'LOTE_MASIVO', 'BENFORD_ANOMALIA', 'ZSCORE_OUTLIER'];
  
  if (severidad && !severidadesValidas.includes(severidad)) {
    return res.status(400).json({ error: `severidad inválida. Opciones: ${severidadesValidas.join(', ')}` });
  }
  
  const limitNum = Math.min(parseInt(limit) || 50, 500);
  const offsetNum = parseInt(offset) || 0;
  
  try {
    const conditions = ['1=1'];
    const params = [];
    
    if (severidad) { conditions.push(`a.severidad = $${params.length + 1}`); params.push(severidad); }
    if (tipo) { conditions.push(`a.tipo = $${params.length + 1}`); params.push(tipo); }
    if (candidato_id) { conditions.push(`a.candidato_id = $${params.length + 1}`); params.push(parseInt(candidato_id)); }
    if (ubigeo) { conditions.push(`a.ubigeo_codigo = $${params.length + 1}`); params.push(ubigeo); }
    
    params.push(limitNum, offsetNum);
    
    const result = await req.db.query(`
      SELECT
        a.*,
        c.nombre_completo AS candidato_nombre,
        u.region, u.provincia, u.distrito
      FROM alertas a
      LEFT JOIN candidatos c ON c.id = a.candidato_id
      LEFT JOIN ubigeos u ON u.codigo = a.ubigeo_codigo
      WHERE ${conditions.join(' AND ')}
      ORDER BY a.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);
    
    const countResult = await req.db.query(`
      SELECT COUNT(*) FROM alertas a
      WHERE ${conditions.join(' AND ')}
    `, params.slice(0, -2));
    
    res.json({
      data: result.rows,
      meta: {
        total: parseInt(countResult.rows[0].count),
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as alertasRouter };
```

```javascript
// packages/api/src/routes/export.js
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';
import { QueryStream } from 'pg-query-stream';

const router = Router();

// Rate limiting estricto en export (genera carga)
const exportLimiter = rateLimit({ windowMs: 60_000, max: 10 });

/**
 * GET /api/export/snapshots.csv
 * Descarga streaming de todos los votos_snapshot en formato CSV.
 * Usa QueryStream para no cargar todo en memoria.
 */
router.get('/snapshots.csv', exportLimiter, async (req, res, next) => {
  try {
    const client = await req.db.connect();
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="auditavoto_snapshots.csv"');
    
    // BOM para Excel en Windows
    res.write('\uFEFF');
    
    // Cabecera CSV
    res.write('snapshot_id,timestamp,tipo_eleccion,candidato,partido,ubigeo,region,provincia,distrito,votos,porcentaje,actas_contabilizadas\n');
    
    const query = new QueryStream(`
      SELECT
        s.id AS snapshot_id,
        TO_CHAR(s.timestamp AT TIME ZONE 'America/Lima', 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
        s.tipo_eleccion,
        c.nombre_completo AS candidato,
        p.nombre AS partido,
        vs.ubigeo_codigo AS ubigeo,
        u.region, u.provincia, u.distrito,
        vs.votos, vs.porcentaje, vs.actas_contabilizadas
      FROM votos_snapshot vs
      JOIN snapshots s ON s.id = vs.snapshot_id
      JOIN candidatos c ON c.id = vs.candidato_id
      LEFT JOIN partidos p ON p.id = c.partido_id
      JOIN ubigeos u ON u.codigo = vs.ubigeo_codigo
      ORDER BY vs.snapshot_id, vs.candidato_id, vs.ubigeo_codigo
    `);
    
    const stream = client.query(query);
    
    const csvTransform = new Transform({
      objectMode: true,
      transform(row, _enc, cb) {
        const values = [
          row.snapshot_id, row.timestamp, row.tipo_eleccion,
          `"${(row.candidato || '').replace(/"/g, '""')}"`,
          `"${(row.partido || '').replace(/"/g, '""')}"`,
          row.ubigeo, row.region, row.provincia, row.distrito,
          row.votos, row.porcentaje, row.actas_contabilizadas,
        ];
        cb(null, values.join(',') + '\n');
      },
    });
    
    stream.on('end', () => client.release());
    stream.on('error', () => client.release());
    
    await pipeline(stream, csvTransform, res);
  } catch (err) {
    next(err);
  }
});

export { router as exportRouter };
```

---

### Criterios de aceptación Fase 4

- [ ] `curl http://localhost:3001/health` → `{"status":"ok"}`
- [ ] `curl http://localhost:3001/api/resultados/presidencial` → JSON con candidatos
- [ ] `curl http://localhost:3001/api/alertas?severidad=CRITICA` → JSON con array (puede estar vacío)
- [ ] `curl http://localhost:3001/api/export/snapshots.csv` → descarga CSV

---

## Fase 5 — Frontend React

**Duración estimada:** 7–10 días

---

### Paso 5.1 — Inicializar proyecto Vite + React

```bash
cd packages/frontend

pnpm create vite . --template react
pnpm add \
  @tanstack/react-query \
  zustand \
  react-router-dom \
  recharts \
  leaflet \
  react-leaflet \
  socket.io-client \
  axios \
  jspdf \
  jspdf-autotable

pnpm add -D \
  tailwindcss \
  @tailwindcss/vite \
  vitest \
  @playwright/test

# Configurar Tailwind
pnpm tailwindcss init -p
```

---

### Paso 5.2 — vite.config.js

```javascript
// packages/frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

---

### Paso 5.3 — Store Zustand

```javascript
// packages/frontend/src/store/useStore.js
import { create } from 'zustand';

export const useStore = create((set) => ({
  // Snapshot activo en el monitor temporal
  snapshotActivoId: null,
  setSnapshotActivoId: (id) => set({ snapshotActivoId: id }),
  
  // Filtros globales
  tipoEleccion: 'presidencial',
  setTipoEleccion: (tipo) => set({ tipoEleccion: tipo }),
  
  candidatoSeleccionadoId: null,
  setCandidatoSeleccionadoId: (id) => set({ candidatoSeleccionadoId: id }),
  
  ubigeoSeleccionado: null,
  setUbigeoSeleccionado: (ubigeo) => set({ ubigeoSeleccionado: ubigeo }),
  
  // Alertas en tiempo real (acumuladas por WebSocket)
  alertasLive: [],
  agregarAlerta: (alerta) => set((state) => ({
    alertasLive: [alerta, ...state.alertasLive].slice(0, 100), // Mantener últimas 100
  })),
  marcarAlertasVistas: () => set((state) => ({
    alertasLive: state.alertasLive.map(a => ({ ...a, vista: true })),
  })),
  
  // Conteo de alertas no vistas (para badge en pestaña)
  get alertasNoVistas() {
    return this.alertasLive.filter(a => !a.vista).length;
  },
}));
```

---

### Paso 5.4 — Hook WebSocket

```javascript
// packages/frontend/src/hooks/useSocket.js
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore.js';
import toast from 'react-hot-toast'; // pnpm add react-hot-toast

let socketInstance = null;

export function useSocket() {
  const agregarAlerta = useStore(s => s.agregarAlerta);
  const initialized = useRef(false);
  
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    socketInstance = io('/', { transports: ['websocket'] });
    
    socketInstance.on('connect', () => {
      console.log('[WebSocket] Conectado');
    });
    
    socketInstance.on('alertas:criticas', (alertas) => {
      for (const alerta of alertas) {
        agregarAlerta({ ...alerta, vista: false, ts: Date.now() });
        
        // Toast prominente para alertas críticas de votos negativos
        if (alerta.tipo === 'VOTOS_NEGATIVOS') {
          toast.error(
            `🚨 VOTOS NEGATIVOS: ${alerta.descripcion}`,
            { duration: 10000, position: 'top-center' }
          );
        }
      }
    });
    
    return () => {
      socketInstance?.disconnect();
      initialized.current = false;
    };
  }, []);
  
  return socketInstance;
}
```

---

### Paso 5.5 — Vista Dashboard general

```jsx
// packages/frontend/src/views/Dashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore.js';
import { apiClient } from '../lib/api.js';

export function Dashboard() {
  const tipoEleccion = useStore(s => s.tipoEleccion);
  const setTipoEleccion = useStore(s => s.setTipoEleccion);
  
  const { data, isLoading } = useQuery({
    queryKey: ['resultados', tipoEleccion],
    queryFn: () => apiClient.get(`/api/resultados/${tipoEleccion}`).then(r => r.data.data),
    refetchInterval: 30_000, // Polling cada 30 segundos
  });
  
  if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando resultados...</div>;
  
  const snapshot = data?.snapshot;
  const candidatos = data?.candidatos ?? [];
  const pctAvance = snapshot?.porcentaje_avance ?? 0;
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Selector tipo elección */}
      <div className="flex gap-2 mb-6">
        {['presidencial', 'congresistas'].map(tipo => (
          <button
            key={tipo}
            onClick={() => setTipoEleccion(tipo)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              tipoEleccion === tipo
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Progreso del conteo */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Actas procesadas</span>
          <span className="text-sm font-semibold text-blue-600">{pctAvance.toFixed(2)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(pctAvance, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>{snapshot?.actas_procesadas?.toLocaleString('es-PE')} actas</span>
          <span>de {snapshot?.actas_total?.toLocaleString('es-PE')} total</span>
        </div>
      </div>
      
      {/* Ranking candidatos */}
      <div className="space-y-3">
        {candidatos.map((c, i) => {
          const pct = candidatos.length > 0 && candidatos[0].votos_total > 0
            ? ((c.votos_total / candidatos.reduce((s, x) => s + parseInt(x.votos_total), 0)) * 100).toFixed(2)
            : 0;
          
          return (
            <div key={c.candidato_id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-xs text-gray-400 mr-2">#{i + 1}</span>
                  <span className="font-medium text-gray-900 text-sm">{c.nombre_completo}</span>
                  <span className="ml-2 text-xs text-gray-500">{c.partido}</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-gray-900">{parseFloat(pct).toFixed(2)}%</span>
                  <div className="text-xs text-gray-400">{parseInt(c.votos_total).toLocaleString('es-PE')} votos</div>
                </div>
              </div>
              <div className="w-full bg-gray-50 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: c.color_hex || '#3B82F6',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Paso 5.6 — Vista Mapa electoral

```jsx
// packages/frontend/src/views/MapaElectoral.jsx
// Requiere GeoJSON en public/geojson/peru-ubigeos.geojson
// Descargar desde: https://github.com/juaneladio/peru-geojson

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useStore } from '../store/useStore.js';
import { apiClient } from '../lib/api.js';

// Importar Leaflet dinámicamente para evitar SSR issues
let L;
if (typeof window !== 'undefined') {
  L = await import('leaflet');
  await import('leaflet/dist/leaflet.css');
}

export function MapaElectoral() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const tipoEleccion = useStore(s => s.tipoEleccion);
  
  const { data: resultados } = useQuery({
    queryKey: ['resultados', tipoEleccion],
    queryFn: () => apiClient.get(`/api/resultados/${tipoEleccion}`).then(r => r.data.data),
    refetchInterval: 60_000,
  });
  
  const { data: outliers } = useQuery({
    queryKey: ['outliers'],
    queryFn: () => apiClient.get('/api/auditoria/outliers').then(r => r.data.data),
    refetchInterval: 300_000,
  });
  
  useEffect(() => {
    if (!mapRef.current || mapInstance.current || !L) return;
    
    mapInstance.current = L.map(mapRef.current).setView([-9.19, -75.0], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapInstance.current);
    
    // Cargar GeoJSON
    fetch('/geojson/peru-ubigeos.geojson')
      .then(r => r.json())
      .then(geojson => {
        L.geoJSON(geojson, {
          style: (feature) => {
            const ubigeo = feature.properties.ubigeo;
            // Color basado en candidato ganador en ese ubigeo
            return {
              fillColor: getColorUbigeo(ubigeo, resultados),
              weight: 0.5,
              opacity: 1,
              color: '#888',
              fillOpacity: 0.6,
            };
          },
          onEachFeature: (feature, layer) => {
            layer.on('click', () => {
              useStore.getState().setUbigeoSeleccionado(feature.properties.ubigeo);
            });
            layer.bindTooltip(
              `<strong>${feature.properties.distrito}</strong><br/>${feature.properties.provincia}`,
              { sticky: true }
            );
          },
        }).addTo(mapInstance.current);
      });
    
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);
  
  return (
    <div className="relative h-full">
      <div ref={mapRef} className="w-full h-screen" />
      
      {/* Leyenda */}
      <div className="absolute bottom-8 right-4 bg-white border border-gray-200 rounded-xl p-4 z-[1000] min-w-[160px]">
        <div className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Leyenda</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-600">Outlier Z-score {'>'} 3</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500 opacity-60" />
            <span className="text-xs text-gray-600">Partido ganador</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getColorUbigeo(ubigeo, resultados) {
  if (!resultados?.candidatos) return '#D1D5DB';
  // Lógica para obtener color del candidato ganador en ese ubigeo
  // Implementar según estructura de datos disponible
  return '#6B7280';
}
```

---

## Fase 6 — QA y observabilidad

**Duración estimada:** 3–4 días

---

### Paso 6.1 — Tests de integración API

```javascript
// packages/api/tests/resultados.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { app } from '../src/app.js';

let request;
beforeAll(() => { request = supertest(app); });

describe('GET /api/resultados/:tipoEleccion', () => {
  it('retorna 200 con estructura correcta para presidencial', async () => {
    const res = await request.get('/api/resultados/presidencial');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('candidatos');
    expect(Array.isArray(res.body.data.candidatos)).toBe(true);
  });
  
  it('retorna 400 para tipo de elección inválido', async () => {
    const res = await request.get('/api/resultados/invalido');
    expect(res.status).toBe(400);
  });
  
  it('retorna 200 para /api/alertas con severidad CRITICA', async () => {
    const res = await request.get('/api/alertas?severidad=CRITICA');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta.total');
  });
});
```

---

### Paso 6.2 — Tests E2E con Playwright

```javascript
// packages/frontend/tests/e2e/dashboard.spec.js
import { test, expect } from '@playwright/test';

test.describe('Dashboard AuditaVoto', () => {
  test('carga y muestra candidatos', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page.locator('text=Actas procesadas')).toBeVisible({ timeout: 10000 });
  });
  
  test('navega al monitor temporal', async ({ page }) => {
    await page.goto('http://localhost:5173/monitor');
    await expect(page.locator('[data-testid="monitor-temporal"]')).toBeVisible({ timeout: 5000 });
  });
  
  test('navega al panel de auditoría', async ({ page }) => {
    await page.goto('http://localhost:5173/auditoria');
    await expect(page.locator('text=Benford')).toBeVisible({ timeout: 5000 });
  });
});
```

---

### Paso 6.3 — Test de carga con k6

```javascript
// deploy/load-test.js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Rampa hasta 50 usuarios
    { duration: '1m', target: 200 },   // Sostener 200 usuarios
    { duration: '30s', target: 500 },  // Pico de 500 usuarios
    { duration: '30s', target: 0 },    // Rampa abajo
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% de requests en < 500ms
    http_req_failed: ['rate<0.01'],    // < 1% de fallos
  },
};

export default function () {
  const res = http.get('http://localhost:3001/api/resultados/presidencial');
  check(res, {
    'status 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

```bash
# Ejecutar test de carga (requiere k6 instalado)
k6 run deploy/load-test.js
```

---

## Fase 7 — Despliegue Docker

**Duración estimada:** 3–4 días

---

### Paso 7.1 — Dockerfiles

```dockerfile
# packages/api/Dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/
COPY packages/stats/package.json ./packages/stats/
RUN pnpm install --frozen-lockfile

FROM base AS production
COPY --from=dependencies /app/node_modules ./node_modules
COPY packages/api ./packages/api
COPY packages/stats ./packages/stats
WORKDIR /app/packages/api
EXPOSE 3001
CMD ["node", "src/app.js"]
```

```dockerfile
# packages/collector/Dockerfile
FROM node:20-alpine
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY packages/collector/package.json ./packages/collector/
COPY packages/stats/package.json ./packages/stats/
RUN pnpm install --frozen-lockfile
COPY packages/collector ./packages/collector
COPY packages/stats ./packages/stats
WORKDIR /app/packages/collector
CMD ["node", "src/scheduler.js"]
```

```dockerfile
# packages/frontend/Dockerfile
FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY packages/frontend/package.json ./
RUN pnpm install --frozen-lockfile
COPY packages/frontend .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

### Paso 7.2 — docker-compose.yml producción

```yaml
# deploy/docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backup:/backup
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  api:
    build:
      context: ..
      dockerfile: packages/api/Dockerfile
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379
      API_PORT: 3001
      API_CORS_ORIGIN: ${FRONTEND_URL}
      NODE_ENV: production
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    expose:
      - "3001"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"]
      interval: 30s

  collector:
    build:
      context: ..
      dockerfile: packages/collector/Dockerfile
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      ONPE_BASE_URL: ${ONPE_BASE_URL}
      ONPE_REQUEST_DELAY_MS: 1100
      POLL_INTERVAL_CRON: "*/5 * * * *"
      NODE_ENV: production
    depends_on:
      postgres: { condition: service_healthy }

  frontend:
    build:
      context: ..
      dockerfile: packages/frontend/Dockerfile
    restart: unless-stopped
    depends_on:
      - api
    expose:
      - "80"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
      - frontend

  # Backup automático cada hora en período electoral
  backup:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      PGPASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - ./backup:/backup
    command: >
      sh -c "while true; do
        pg_dump -h postgres -U ${POSTGRES_USER} -d ${POSTGRES_DB} 
        | gzip > /backup/backup_$$(date +%Y%m%d_%H%M%S).sql.gz;
        find /backup -name '*.sql.gz' -mtime +30 -delete;
        sleep 3600;
      done"
    depends_on:
      postgres: { condition: service_healthy }

volumes:
  postgres_data:
  redis_data:
```

---

### Paso 7.3 — nginx.conf

```nginx
# deploy/nginx.conf
server {
    listen 80;
    server_name _;
    
    # Frontend React
    location / {
        proxy_pass http://frontend:80;
        proxy_http_version 1.1;
    }
    
    # API REST
    location /api/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
    
    # WebSocket
    location /socket.io/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }
    
    # Health check
    location /health {
        proxy_pass http://api:3001;
    }
}
```

---

### Paso 7.4 — GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: auditavoto_test
          POSTGRES_USER: auditavoto
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      
      - run: pnpm install --frozen-lockfile
      
      - name: Aplicar migraciones de test
        env:
          DATABASE_URL: postgresql://auditavoto:test_pass@localhost:5432/auditavoto_test
        run: node database/migrations/run.js
      
      - name: Tests unitarios stats
        run: pnpm --filter @auditavoto/stats test
      
      - name: Tests integración API
        env:
          DATABASE_URL: postgresql://auditavoto:test_pass@localhost:5432/auditavoto_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test
        run: pnpm --filter @auditavoto/api test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      - name: Deploy a VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/auditavoto
            git pull origin main
            docker compose pull
            docker compose up -d --build
            docker compose exec api node database/migrations/run.js
```

---

### Paso 7.5 — Comandos de despliegue

```bash
# En el servidor de producción:

# Clonar el repositorio
git clone https://github.com/TU_ORG/auditavoto.git /opt/auditavoto
cd /opt/auditavoto

# Configurar variables de entorno de producción
cp deploy/.env.example .env
# Editar .env con los valores reales de producción
nano .env

# Construir y levantar todos los servicios
docker compose -f deploy/docker-compose.yml up -d --build

# Aplicar migraciones
docker compose -f deploy/docker-compose.yml exec api \
  node /app/database/migrations/run.js

# Verificar que todo está corriendo
docker compose -f deploy/docker-compose.yml ps

# Ver logs en tiempo real
docker compose -f deploy/docker-compose.yml logs -f api collector

# Verificar el health endpoint
curl http://localhost/health
```

---

## Criterios de aceptación globales del sistema

Antes de usar el sistema en una elección real, verificar **todos** los siguientes puntos:

### Funcionales
- [ ] El scraper corre cada 5 minutos sin error durante 24 horas continuas
- [ ] Los snapshots se acumulan correctamente en la BD (número creciente de filas en `snapshots`)
- [ ] La detección de `VOTOS_NEGATIVOS` se activa correctamente con datos de prueba artificiales
- [ ] Los 7 endpoints API responden correctamente con datos reales
- [ ] El WebSocket emite alertas al frontend en menos de 2 segundos desde la detección
- [ ] El test Benford produce resultados correctos y coherentes con EG2021
- [ ] El mapa Leaflet carga el GeoJSON y colorea correctamente por ganador
- [ ] La exportación CSV descarga el archivo completo sin timeout

### Estadísticos (validar con EG2021)
- [ ] `testBenford()` no genera anomalías falsas sobre datos limios de EG2021 presidencial
- [ ] `calcularZScores()` identifica correctamente los distritos con votación inusualmente alta/baja históricamente
- [ ] Los umbrales de velocidad y lote están calibrados para no generar ruido en condiciones normales

### Operacionales
- [ ] `docker compose up -d` levanta todo el stack desde cero en menos de 5 minutos
- [ ] El backup automático genera archivos `.sql.gz` en `/opt/auditavoto/deploy/backup/`
- [ ] El endpoint público `/api/export/snapshots.csv` es accesible sin autenticación
- [ ] Los logs de pino son legibles y contienen timestamps, niveles y campos estructurados

### Seguridad
- [ ] El archivo `.env` de producción no está en el repositorio Git
- [ ] Los headers HTTP incluyen los de Helmet (`X-Frame-Options`, `X-XSS-Protection`, etc.)
- [ ] El rate limiting rechaza con 429 cuando se supera el límite
- [ ] La base de datos no es accesible desde el exterior (solo servicios internos de Docker)

---

## Apéndice A — Metodología estadística

### Por qué la Segunda Ley de Benford (no la Primera)

La **primera** ley de Benford (primer dígito) es demasiado sensible en contextos electorales: los datos de muchas jurisdicciones pequeñas naturalmente violan la primera ley sin que haya fraude, simplemente porque los totales son pequeños y homogéneos. La **segunda** ley es más robusta para datos electorales reales con volumen suficiente.

**Supuestos de validez que SIEMPRE verificar antes de reportar resultados:**
1. La muestra tiene al menos 100 unidades (distritos o provincias)
2. Los datos abarcan varios órdenes de magnitud
3. No se aplica a datos de mesas individuales

### Interpretación correcta del Z-score

Un Z-score |Z| > 3 indica que ese distrito está a más de 3 desviaciones estándar de la media nacional. Esto es estadísticamente inusual (~0.3% de probabilidad bajo distribución normal), pero **no implica automáticamente fraude**. Causas legítimas incluyen: regiones con fuerte identidad política histórica, zonas rurales remotas con demografía muy particular, o enclaves migratorios.

Los outliers deben ser el **inicio de una investigación**, no su conclusión.

### Límites del análisis de deltas

La prueba de deltas negativos (Δv < 0) es la única que detecta algo **matemáticamente imposible** en un sistema de conteo legítimo. Los votos no pueden decrecer. Si el portal ONPE reporta que un candidato tiene menos votos en el snapshot actual que en el anterior, hay exactamente tres posibilidades:
1. Error en el scraper o en el parser (verificar primero)
2. Error en el sistema de cómputo de ONPE (puede ser un bug, no necesariamente fraude)  
3. Manipulación intencional de los datos

---

## Apéndice B — Cómo agregar un nuevo endpoint ONPE

1. Documentar el endpoint en `docs/endpoints.md`
2. Agregar un método en `packages/collector/src/onpe.client.js`
3. Actualizar el schema Zod en `packages/collector/src/onpe.parser.js` si la estructura es diferente
4. Agregar el nuevo `tipo_eleccion` al array `TIPOS_ELECCION` en `scheduler.js`
5. Añadir el tipo al check de validación en `packages/api/src/routes/resultados.js`
6. Ejecutar el seed histórico para ese tipo si hay datos disponibles

---

*Documento generado para AuditaVoto v1.0 — Elecciones Generales Perú 2026*  
*Actualizar endpoints ONPE según el relevamiento real de docs/endpoints.md*