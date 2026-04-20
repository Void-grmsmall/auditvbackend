# 🗳️ Sistema de Auditoría Electoral ONPE 2026
## Documento Maestro de Implementación — Patrick

> **Estado**: Listo para ejecutar | **Deploy**: Railway via GitHub | **Sin Docker local**

---

## ✅ Confirmaciones Previas — Resueltas

| Pregunta | Respuesta | Decisión |
|---|---|---|
| **Endpoints ONPE** | Mapeados al 100% desde DevTools | Usamos endpoints reales (ver Sección 2) |
| **Docker** | No disponible (laptop con recursos básicos) | Railway maneja PostgreSQL como plugin nativo — sin Docker local |
| **pnpm** | No instalado | Se instala con `npm install -g pnpm` como primer paso del Sprint 0 |
| **Alcance** | Todo el sistema completo | Entrega continua por capas funcionales en 3 semanas (8 sprints) |

---

## 🏗️ Arquitectura del Sistema

```
Tu laptop (VS Code + Node.js)
        │
        │  git push
        ▼
   GitHub Repository
        │
        │  Auto-deploy (webhook)
        ▼
   Railway Project
   ├── Service: API Node.js/Express  ← scraper + REST API + cron jobs
   ├── Service: PostgreSQL           ← plugin nativo Railway (DATABASE_URL automática)
   └── URL Pública: tuapp.railway.app ← accesible para auditores desde día 1
```

### Stack Tecnológico

| Capa | Tecnología | Razón |
|---|---|---|
| Runtime | Node.js 20 LTS | Ya lo tienes instalado |
| Framework | Express.js | Ligero, sin overhead |
| ORM / Migraciones | node-postgres (pg) + SQL puro | Control total del schema |
| Scheduler | node-cron | Scraping periódico sin servicio extra |
| HTTP Client | axios | Scraper de endpoints ONPE |
| Estadísticas | mathjs + custom | Benford, Z-score, deltas |
| Frontend | React + Vite | Dashboard de auditoría |
| Mapas | Leaflet + GeoJSON ONPE | GeoJSON ya en el portal ONPE |
| BD | PostgreSQL 15 | Plugin nativo Railway |
| Deploy | Railway | Sin Docker, sin VPS manual |
| CI/CD | GitHub → Railway webhook | Push = deploy automático |
| Gestor paquetes | pnpm | Más rápido que npm |

---

## 🌐 Mapa Completo de Endpoints ONPE

**Base URL**: `https://resultadoelectoral.onpe.gob.pe/presentacion-backend`

### Grupo 0 — Proceso Electoral Activo

```
GET /proceso/proceso-electoral-activo
    → Retorna idProceso (actualmente = 2 para EG2026)

GET /proceso/{idProceso}/elecciones
    → Lista todas las elecciones del proceso

GET /resumen-general/elecciones?activo=1&idProceso=2&tipoFiltro=eleccion
    → Elecciones activas con metadata completa
```

**IDs de Elección identificados (EG2026):**

| idEleccion | Cargo |
|---|---|
| 10 | Presidente y Vicepresidentes |
| 12 | Senado |
| 13 | Diputados (con distrito electoral) |
| 14 | Diputados (variante por ámbito) |
| 15 | Parlamento Andino |

---

### Grupo 1 — Catálogos Geográficos

```
GET /ubigeos/departamentos?idEleccion={id}&idAmbitoGeografico={1|2}
GET /ubigeos/provincias?idEleccion={id}&idAmbitoGeografico={1|2}&idUbigeoDepartamento={DD0000}
GET /ubigeos/distritos?idEleccion={id}&idAmbitoGeografico={1|2}&idUbigeoProvincia={DDPP00}
GET /ubigeos/locales?idUbigeo={DDPPDD}
GET /distrito-electoral/distritos
```

**Convención de `idAmbitoGeografico`:**
- `1` = Territorio nacional (ubigeos `01xxxx` a `25xxxx`)
- `2` = Extranjero (ubigeos `91xxxx` a `95xxxx`)

**Formato de ubigeos (INEI):**
- Departamento: `DD0000` (ej: `150000` = Lima)
- Provincia: `DDPP00` (ej: `150100` = Lima Provincia)
- Distrito: `DDPPDD` (ej: `150101` = Lima Cercado)

---

### Grupo 2 — Resultados Agregados ⭐ (Core del Scraper)

Cada nivel tiene dos endpoints paralelos: **totales** y **participantes**.

```
# ── NACIONAL ──
GET /resumen-general/totales?idEleccion={id}&tipoFiltro=eleccion
GET /resumen-general/participantes?idEleccion={id}&tipoFiltro=eleccion

# ── POR DISTRITO ELECTORAL (para senado/diputados) ──
GET /resumen-general/totales?idAmbitoGeografico=1&idEleccion={id}&tipoFiltro=distrito_electoral&idDistritoElectoral={idD}
GET /resumen-general/participantes?idAmbitoGeografico=1&idEleccion={id}&tipoFiltro=distrito_electoral&idDistritoElectoral={idD}

# ── POR DEPARTAMENTO (nivel 01) ──
GET /resumen-general/totales?idEleccion={id}&tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&idUbigeoDepartamento={DD0000}
GET /resumen-general/participantes?idEleccion={id}&tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&idUbigeoDepartamento={DD0000}

# ── POR PROVINCIA (nivel 02) ──
GET /resumen-general/totales?idEleccion={id}&tipoFiltro=ubigeo_nivel_02&idAmbitoGeografico=1&idUbigeoDepartamento={DD0000}&idUbigeoProvincia={DDPP00}
GET /resumen-general/participantes?...mismo patrón

# ── POR DISTRITO (nivel 03 — más granular) ──
GET /resumen-general/totales?idEleccion={id}&tipoFiltro=ubigeo_nivel_03&idAmbitoGeografico=1&idUbigeoDepartamento={DD0000}&idUbigeoProvincia={DDPP00}&idUbigeoDistrito={DDPPDD}
GET /resumen-general/participantes?...mismo patrón
```

---

### Grupo 3 — Mapa de Calor (para Frontend)

```
GET /resumen-general/mapa-calor?idAmbitoGeografico=1&idEleccion={id}&tipoFiltro=ambito_geografico
GET /resumen-general/mapa-calor?...&ubigeoNivel01={DD0000}&tipoFiltro=ubigeo_nivel_01
GET /resumen-general/mapa-calor?...&ubigeoNivel01={DD0000}&ubigeoNivel02={DDPP00}&tipoFiltro=ubigeo_nivel_02
```

---

### Grupo 4 — Mesas y Actas ⭐⭐ (Para Ley de Benford)

```
# Totales globales de mesas
GET /mesa/totales?tipoFiltro=eleccion

# Actas paginadas por ubigeo (tamaño de página = 15)
GET /actas?pagina={n}&tamanio=15&idAmbitoGeografico={1|2}&idUbigeo={DDPPDD}
```

> **Clave de auditoría**: iterar `pagina=0,1,2,...` hasta agotar para obtener **todas las actas de un distrito**. Estos datos individuales por mesa son los que permiten aplicar **Ley de Benford**.

---

### Grupo 5 — GeoJSON para Mapas (Assets integrados en el portal)

```
GET /assets/lib/amcharts5/geodata/json/peruLow.json           ← mapa nacional
GET /assets/lib/amcharts5/geodata/json/departamentos/{DD0000}.json
GET /assets/lib/amcharts5/geodata/json/provincias/{DDPP00}.json
GET /assets/lib/amcharts5/geodata/json/continentes/{9X0000}.json  ← extranjero
GET /assets/lib/amcharts5/geodata/json/continental_total.json
GET /assets/lib/amcharts5/geodata/json/mundo.json
```

> ✅ No necesitas buscar GeoJSON externos. El propio portal ONPE los expone públicamente.

---

## 🔄 Flujo de Scraping Completo

```
1. GET /proceso/proceso-electoral-activo        → idProceso = 2
2. GET /proceso/2/elecciones                    → [10, 12, 13, 14, 15]
3. GET /distrito-electoral/distritos            → catálogo de distritos electorales

4. Por cada idEleccion:
   a. GET totales + participantes (nacional)          → snapshot con timestamp
   b. GET departamentos → por cada dpto:
        GET totales + participantes (nivel_01)         → snapshot
        GET provincias → por cada provincia:
          GET totales + participantes (nivel_02)       → snapshot
          GET distritos → por cada distrito:
            GET totales + participantes (nivel_03)     → snapshot
            GET actas?pagina=0..N (paginado)           → actas individuales

5. INSERT todo en PostgreSQL con timestamp de captura
6. Calcular deltas vs snapshot anterior
7. Emitir alerta si algún candidato PIERDE votos entre dos snapshots
```

---

## 🗄️ Esquema de Base de Datos (PostgreSQL)

```sql
-- Proceso electoral
CREATE TABLE procesos (
    id              INTEGER PRIMARY KEY,
    nombre          TEXT,
    fecha_eleccion  DATE,
    activo          BOOLEAN
);

-- Tipos de elección dentro del proceso
CREATE TABLE elecciones (
    id          INTEGER PRIMARY KEY,
    id_proceso  INTEGER REFERENCES procesos(id),
    nombre      TEXT,
    tipo        TEXT  -- presidencial, senado, diputados, etc.
);

-- Catálogo geográfico
CREATE TABLE ubigeos (
    id_ubigeo   VARCHAR(10) PRIMARY KEY,  -- ej: '150101'
    nombre      TEXT,
    nivel       INTEGER,  -- 1=depto, 2=provincia, 3=distrito
    id_padre    VARCHAR(10)
);

-- Snapshots de totales por elección y ámbito
CREATE TABLE snapshots_totales (
    id              BIGSERIAL PRIMARY KEY,
    id_eleccion     INTEGER REFERENCES elecciones(id),
    tipo_filtro     TEXT,
    id_ubigeo       VARCHAR(10),
    id_distrito_electoral INTEGER,
    actas_contabilizadas  INTEGER,
    actas_total           INTEGER,
    porcentaje_actas      NUMERIC(5,2),
    votos_validos         INTEGER,
    votos_blancos         INTEGER,
    votos_nulos           INTEGER,
    votos_impugnados      INTEGER,
    capturado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- Resultados por candidato/partido en cada snapshot
CREATE TABLE snapshots_participantes (
    id              BIGSERIAL PRIMARY KEY,
    id_snapshot     BIGINT REFERENCES snapshots_totales(id),
    id_participante INTEGER,
    nombre          TEXT,
    partido         TEXT,
    votos           INTEGER,
    porcentaje      NUMERIC(6,3),
    capturado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- Actas individuales (para Ley de Benford)
CREATE TABLE actas (
    id              BIGSERIAL PRIMARY KEY,
    id_acta_onpe    TEXT UNIQUE,
    id_eleccion     INTEGER,
    id_ubigeo       VARCHAR(10),
    id_ambito       INTEGER,
    numero_mesa     TEXT,
    estado          TEXT,
    total_votos     INTEGER,
    datos_raw       JSONB,
    capturado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- Alertas generadas
CREATE TABLE alertas (
    id              BIGSERIAL PRIMARY KEY,
    tipo            TEXT,  -- 'votos_bajan', 'benford_anomalia', 'zscore_alto'
    id_eleccion     INTEGER,
    id_participante INTEGER,
    nombre_participante TEXT,
    id_ubigeo       VARCHAR(10),
    valor_anterior  NUMERIC,
    valor_actual    NUMERIC,
    diferencia      NUMERIC,
    severidad       TEXT,  -- 'baja', 'media', 'alta'
    generada_en     TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_snapshots_eleccion ON snapshots_totales(id_eleccion, capturado_en DESC);
CREATE INDEX idx_participantes_snapshot ON snapshots_participantes(id_snapshot);
CREATE INDEX idx_actas_ubigeo ON actas(id_ubigeo, id_eleccion);
CREATE INDEX idx_alertas_generadas ON alertas(generada_en DESC);
```

---

## 📊 Motor de Análisis Estadístico

### 1. Detección de Votos que Bajan (Delta Negativo)

```javascript
// Si candidato X tenía 5000 votos en t-1 y ahora tiene 4800 → ALERTA
function detectarDeltaNegativo(snapshotAnterior, snapshotActual) {
    for (const participante of snapshotActual.participantes) {
        const anterior = snapshotAnterior.participantes
            .find(p => p.id === participante.id);
        if (anterior && participante.votos < anterior.votos) {
            emitirAlerta({
                tipo: 'votos_bajan',
                participante: participante.nombre,
                anterior: anterior.votos,
                actual: participante.votos,
                diferencia: participante.votos - anterior.votos
            });
        }
    }
}
```

### 2. Ley de Benford

Analiza si la distribución del primer dígito de los totales de votos por mesa sigue la distribución esperada.

| Dígito | Frecuencia esperada |
|---|---|
| 1 | 30.1% |
| 2 | 17.6% |
| 3 | 12.5% |
| 4 | 9.7% |
| 5 | 7.9% |
| 6 | 6.7% |
| 7 | 5.8% |
| 8 | 5.1% |
| 9 | 4.6% |

```javascript
const BENFORD = [0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];

function analizarBenford(votosArray) {
    const conteos = new Array(9).fill(0);
    for (const v of votosArray) {
        const primerDigito = parseInt(String(v)[0]);
        if (primerDigito >= 1) conteos[primerDigito - 1]++;
    }
    const total = votosArray.length;
    const chi2 = conteos.reduce((acc, obs, i) => {
        const esperado = BENFORD[i] * total;
        return acc + Math.pow(obs - esperado, 2) / esperado;
    }, 0);
    // chi2 > 15.51 con 8 grados de libertad → p < 0.05 → anomalía
    return { chi2, anomalia: chi2 > 15.51, distribucion: conteos.map((c, i) => ({
        digito: i + 1, observado: c/total, esperado: BENFORD[i]
    }))};
}
```

### 3. Z-Score por Candidato

Detecta resultados estadísticamente atípicos en distritos específicos.

```javascript
function zScore(valor, media, desviacion) {
    return (valor - media) / desviacion;
}
// |z| > 3 → anomalía estadística (p < 0.003)
```

### 4. Índice de Concentración de Votos (Gini simplificado)

```javascript
function concentracionVotos(participantes) {
    const total = participantes.reduce((s, p) => s + p.votos, 0);
    const porcentajes = participantes.map(p => p.votos / total).sort();
    // Gini: 0 = distribución perfecta, 1 = concentración total
}
```

---

## 📁 Estructura del Repositorio

```
onpe-auditoria/
├── README.md
├── package.json
├── .env.example
├── .gitignore
├── railway.json              ← configuración de deploy
│
├── src/
│   ├── config/
│   │   ├── database.js       ← conexión PostgreSQL
│   │   └── constants.js      ← BASE_URL, IDs de elección, etc.
│   │
│   ├── scraper/
│   │   ├── index.js          ← orquestador principal
│   │   ├── proceso.js        ← endpoints Grupo 0
│   │   ├── ubigeos.js        ← endpoints Grupo 1
│   │   ├── resultados.js     ← endpoints Grupo 2
│   │   ├── actas.js          ← endpoints Grupo 4 (paginación)
│   │   └── scheduler.js      ← node-cron (cada 5 min en día electoral)
│   │
│   ├── analisis/
│   │   ├── deltas.js         ← detección votos que bajan
│   │   ├── benford.js        ← Ley de Benford
│   │   ├── zscore.js         ← Z-score por distrito
│   │   └── alertas.js        ← generación y persistencia de alertas
│   │
│   ├── api/
│   │   ├── index.js          ← Express app
│   │   └── routes/
│   │       ├── resultados.js
│   │       ├── alertas.js
│   │       ├── actas.js
│   │       └── estadisticas.js
│   │
│   └── migrations/
│       ├── 001_crear_tablas.sql
│       └── 002_indices.sql
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── components/
        │   ├── Dashboard.jsx       ← vista principal
        │   ├── MapaElectoral.jsx   ← Leaflet + GeoJSON ONPE
        │   ├── GraficaTemporal.jsx ← evolución de votos
        │   ├── BenfordChart.jsx    ← gráfica de distribución
        │   └── AlertasPanel.jsx    ← alertas en tiempo real
        └── services/
            └── api.js              ← llamadas al backend
```

---

## 🚂 Configuración de Railway

### `railway.json` (en raíz del repo)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node src/api/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### `.env.example`

```bash
# Generada automáticamente por Railway al agregar PostgreSQL
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Configuración de la API
PORT=3000
NODE_ENV=production

# ONPE
ONPE_BASE_URL=https://resultadoelectoral.onpe.gob.pe/presentacion-backend
ONPE_ID_PROCESO=2
ONPE_ELECCIONES=10,12,13,14,15

# Intervalo de scraping (en minutos)
SCRAPING_INTERVALO=5

# Umbral de alerta para Benford (chi-cuadrado)
BENFORD_UMBRAL_CHI2=15.51
```

### Pasos en Railway (una sola vez)

1. Ir a [railway.app](https://railway.app) → crear cuenta
2. **New Project** → **Deploy from GitHub repo** → seleccionar tu repo
3. En el proyecto: **+ New** → **Database** → **Add PostgreSQL**
4. Railway genera `DATABASE_URL` automáticamente como variable de entorno
5. Ir a **Settings → Environment** y agregar las demás variables del `.env.example`
6. Cada `git push main` despliega automáticamente

---

## 📅 Cronograma de 8 Sprints (3 Semanas)

### Semana 1 — Base Funcional Completa

#### Sprint 0: Setup (Día 1-2)
- [ ] Instalar pnpm: `npm install -g pnpm`
- [ ] Crear repo GitHub con la estructura de carpetas
- [ ] Configurar Railway (PostgreSQL + variables de entorno)
- [ ] Crear `package.json` con dependencias base
- [ ] Ejecutar migraciones SQL
- [ ] Verificar conexión a BD desde Railway
- [ ] Commit: `feat: setup inicial Railway + PostgreSQL`

#### Sprint 1: Scraper Base (Día 3-4)
- [ ] Módulo `proceso.js` → obtener idProceso y elecciones
- [ ] Módulo `ubigeos.js` → árbol geográfico completo
- [ ] Módulo `resultados.js` → totales + participantes por nivel
- [ ] Persistencia en PostgreSQL con timestamp
- [ ] Test: verificar datos fluyendo a BD en Railway
- [ ] Commit: `feat: scraper con endpoints reales ONPE`

#### Sprint 2: API REST (Día 5-6)
- [ ] Express app con ruta `/health`
- [ ] `GET /api/resultados/:idEleccion` → último snapshot
- [ ] `GET /api/resultados/:idEleccion/historia` → serie temporal
- [ ] `GET /api/ubigeos/departamentos` → catálogo
- [ ] Test con Postman/curl desde URL pública Railway

### Semana 2 — Motor Estadístico + Frontend Base

#### Sprint 3: Detección de Anomalías (Día 7-8)
- [ ] Módulo `deltas.js` → votos que bajan entre snapshots
- [ ] Módulo `zscore.js` → valores atípicos por distrito
- [ ] `GET /api/alertas` → lista de alertas generadas
- [ ] `POST /api/alertas/reconocer/:id` → marcar revisada

#### Sprint 4: Ley de Benford (Día 9-10)
- [ ] Módulo `actas.js` → paginación completa por ubigeo
- [ ] Módulo `benford.js` → cálculo chi-cuadrado
- [ ] `GET /api/estadisticas/benford/:idEleccion/:ubigeo`
- [ ] Programar análisis Benford automático post-scraping

#### Sprint 5: Frontend Base (Día 11-12)
- [ ] Crear app React + Vite en `/frontend`
- [ ] Dashboard con tabla de resultados en tiempo real
- [ ] Gráfica temporal de evolución de votos (recharts)
- [ ] Panel de alertas activas

### Semana 3 — Frontend Completo + Exportación

#### Sprint 6: Mapa Electoral (Día 13-14)
- [ ] Integrar Leaflet con GeoJSON del portal ONPE
- [ ] Mapa de calor de resultados por departamento
- [ ] Drill-down: departamento → provincia → distrito
- [ ] Consumir endpoint `/resumen-general/mapa-calor`

#### Sprint 7: Panel de Auditoría Benford (Día 15-16)
- [ ] Gráfica de barras: distribución observada vs esperada Benford
- [ ] Selector de ubigeo + elección para análisis on-demand
- [ ] Indicador visual de nivel de anomalía (semáforo)
- [ ] Vista de actas individuales con total de votos

#### Sprint 8: Exportación + Documentación (Día 17-18)
- [ ] Exportar resultados a CSV por elección/ubigeo
- [ ] Exportar alertas a PDF (reporte de auditoría)
- [ ] README público del proyecto
- [ ] Deploy final estable en Railway
- [ ] Documentación de uso para auditores ciudadanos

---

## ⚙️ Configuración del Scheduler (node-cron)

```javascript
// src/scraper/scheduler.js
const cron = require('node-cron');
const { ejecutarScraping } = require('./index');

// Día electoral: cada 5 minutos
// Fuera del día electoral: cada 30 minutos
const INTERVALO = process.env.SCRAPING_INTERVALO || '5';

cron.schedule(`*/${INTERVALO} * * * *`, async () => {
    console.log(`[${new Date().toISOString()}] Iniciando ciclo de scraping...`);
    try {
        await ejecutarScraping();
        console.log('✅ Scraping completado');
    } catch (error) {
        console.error('❌ Error en scraping:', error.message);
    }
});
```

---

## 🔒 Marco Legal

| Ley | Relevancia | Postura del proyecto |
|---|---|---|
| Ley 27806 (Transparencia y Acceso a Información Pública) | Los datos ONPE son información pública | ✅ Aplica directamente — el scraping de datos públicos electorales está amparado |
| Ley 29733 (Protección de Datos Personales) | Datos personales de electores | ✅ No se recolectan datos personales — solo agregados por mesa/ubigeo |
| Ley 30096 (Delitos Informáticos) | Acceso no autorizado a sistemas | ✅ El portal ONPE es público, sin autenticación, sin bypass de seguridad |

### Reglas de Oro del Proyecto

1. **Solo consumir** endpoints públicos del portal ONPE (sin autenticación, sin scraping de HTML, sin bypass)
2. **No recolectar** datos personales de electores (DNI, nombre, dirección)
3. **Rate limiting** propio: máximo 1 request/segundo para no sobrecargar el portal
4. **Atribuir siempre** los datos a ONPE como fuente oficial
5. **Código abierto** — transparencia total del método de análisis

---

## 🚀 Comando de Inicio (Sprint 0)

```bash
# 1. Instalar pnpm
npm install -g pnpm

# 2. Clonar/crear repo
mkdir onpe-auditoria && cd onpe-auditoria
git init
pnpm init

# 3. Instalar dependencias del backend
pnpm add express pg axios node-cron mathjs dotenv
pnpm add -D nodemon

# 4. Instalar dependencias del frontend
mkdir frontend && cd frontend
pnpm create vite . --template react
pnpm add leaflet recharts axios
cd ..

# 5. Crear .gitignore
echo "node_modules/\n.env\ndist/" > .gitignore

# 6. Primer commit
git add .
git commit -m "feat: setup inicial proyecto ONPE auditoria"
git push origin main
```

---

## 📌 Referencias de Endpoints (Copiables)

```
BASE: https://resultadoelectoral.onpe.gob.pe/presentacion-backend

# Proceso activo
/proceso/proceso-electoral-activo
/proceso/2/elecciones
/resumen-general/elecciones?activo=1&idProceso=2&tipoFiltro=eleccion

# Catálogos
/ubigeos/departamentos?idEleccion=10&idAmbitoGeografico=1
/ubigeos/provincias?idEleccion=10&idAmbitoGeografico=1&idUbigeoDepartamento=150000
/ubigeos/distritos?idEleccion=10&idAmbitoGeografico=1&idUbigeoProvincia=150100
/ubigeos/locales?idUbigeo=150101
/distrito-electoral/distritos

# Resultados nacionales
/resumen-general/totales?idEleccion=10&tipoFiltro=eleccion
/resumen-general/participantes?idEleccion=10&tipoFiltro=eleccion

# Resultados por departamento
/resumen-general/totales?idEleccion=10&tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&idUbigeoDepartamento=150000
/resumen-general/participantes?idEleccion=10&tipoFiltro=ubigeo_nivel_01&idAmbitoGeografico=1&idUbigeoDepartamento=150000

# Resultados por distrito
/resumen-general/totales?idEleccion=10&tipoFiltro=ubigeo_nivel_03&idAmbitoGeografico=1&idUbigeoDepartamento=150000&idUbigeoProvincia=150100&idUbigeoDistrito=150101

# Actas paginadas
/actas?pagina=0&tamanio=15&idAmbitoGeografico=1&idUbigeo=150101
/actas?pagina=1&tamanio=15&idAmbitoGeografico=1&idUbigeo=150101

# Mapa de calor
/resumen-general/mapa-calor?idAmbitoGeografico=1&idEleccion=10&tipoFiltro=ambito_geografico

# GeoJSON
/assets/lib/amcharts5/geodata/json/peruLow.json
/assets/lib/amcharts5/geodata/json/departamentos/150000.json
```

---

*Documento generado el 19/04/2026 — Patrick | Sistema de Auditoría Electoral Ciudadana ONPE 2026*