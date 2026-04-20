-- =====================================================
-- 001_crear_tablas.sql
-- Esquema principal de AuditaVoto
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Procesos electorales ──────────────────────────────────
CREATE TABLE IF NOT EXISTS procesos (
    id              INTEGER PRIMARY KEY,
    nombre          TEXT NOT NULL,
    fecha_eleccion  DATE,
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tipos de elección dentro del proceso ─────────────────
CREATE TABLE IF NOT EXISTS elecciones (
    id          INTEGER PRIMARY KEY,
    id_proceso  INTEGER REFERENCES procesos(id),
    nombre      TEXT NOT NULL,
    tipo        TEXT,
    creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Catálogo geográfico (ubigeos INEI) ───────────────────
CREATE TABLE IF NOT EXISTS ubigeos (
    id_ubigeo   VARCHAR(10) PRIMARY KEY,
    nombre      TEXT NOT NULL,
    nivel       INTEGER NOT NULL CHECK (nivel IN (1, 2, 3)),
    id_padre    VARCHAR(10),
    creado_en   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Snapshots de totales por elección y ámbito ───────────
-- Una fila por (elección × ámbito geográfico × timestamp)
-- NUNCA UPDATE, solo INSERT
CREATE TABLE IF NOT EXISTS snapshots_totales (
    id                      BIGSERIAL PRIMARY KEY,
    id_eleccion             INTEGER NOT NULL REFERENCES elecciones(id),
    tipo_filtro             TEXT NOT NULL,
    id_ubigeo               VARCHAR(10),
    id_distrito_electoral   INTEGER,
    actas_contabilizadas    INTEGER DEFAULT 0,
    actas_total             INTEGER DEFAULT 0,
    porcentaje_actas        NUMERIC(5,2),
    votos_validos           INTEGER DEFAULT 0,
    votos_blancos           INTEGER DEFAULT 0,
    votos_nulos             INTEGER DEFAULT 0,
    votos_impugnados        INTEGER DEFAULT 0,
    capturado_en            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE snapshots_totales IS
'Inmutable. Cada fila = estado del conteo en un momento. Solo INSERT.';

-- ── Resultados por candidato/partido en cada snapshot ────
CREATE TABLE IF NOT EXISTS snapshots_participantes (
    id              BIGSERIAL PRIMARY KEY,
    id_snapshot     BIGINT NOT NULL REFERENCES snapshots_totales(id) ON DELETE CASCADE,
    id_participante INTEGER NOT NULL,
    nombre          TEXT,
    partido         TEXT,
    votos           INTEGER DEFAULT 0,
    porcentaje      NUMERIC(6,3),
    capturado_en    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE snapshots_participantes IS
'Votos por candidato en un snapshot. Comparar entre snapshots para detectar deltas.';

-- ── Actas individuales (para Ley de Benford) ─────────────
CREATE TABLE IF NOT EXISTS actas (
    id              BIGSERIAL PRIMARY KEY,
    id_acta_onpe    TEXT,
    id_eleccion     INTEGER REFERENCES elecciones(id),
    id_ubigeo       VARCHAR(10) REFERENCES ubigeos(id_ubigeo),
    id_ambito       INTEGER,
    numero_mesa     TEXT,
    estado          TEXT,
    total_votos     INTEGER,
    datos_raw       JSONB,
    capturado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- Evitar duplicados de actas en el mismo instante
CREATE UNIQUE INDEX IF NOT EXISTS idx_actas_unique
    ON actas (id_acta_onpe)
    WHERE id_acta_onpe IS NOT NULL;

-- ── Alertas generadas ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas (
    id                  BIGSERIAL PRIMARY KEY,
    tipo                TEXT NOT NULL,   -- 'votos_bajan', 'benford_anomalia', 'zscore_alto', 'lote_masivo'
    severidad           TEXT NOT NULL DEFAULT 'media' CHECK (severidad IN ('baja', 'media', 'alta', 'critica')),
    id_eleccion         INTEGER REFERENCES elecciones(id),
    id_participante     INTEGER,
    nombre_participante TEXT,
    id_ubigeo           VARCHAR(10),
    valor_anterior      NUMERIC,
    valor_actual        NUMERIC,
    diferencia          NUMERIC,
    descripcion         TEXT,
    revisada            BOOLEAN DEFAULT FALSE,
    generada_en         TIMESTAMPTZ DEFAULT NOW()
);
