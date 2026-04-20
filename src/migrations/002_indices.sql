-- =====================================================
-- 002_indices.sql
-- Índices críticos para performance
-- =====================================================

-- Índice principal para series temporales
CREATE INDEX IF NOT EXISTS idx_snapshots_eleccion_tiempo
    ON snapshots_totales (id_eleccion, capturado_en DESC);

-- Para filtrar por ubigeo + elección
CREATE INDEX IF NOT EXISTS idx_snapshots_ubigeo
    ON snapshots_totales (id_ubigeo, id_eleccion, capturado_en DESC);

-- Para participantes: recuperar votos del snapshot
CREATE INDEX IF NOT EXISTS idx_participantes_snapshot
    ON snapshots_participantes (id_snapshot, id_participante);

-- Para comparar participantes entre dos snapshots
CREATE INDEX IF NOT EXISTS idx_participantes_id
    ON snapshots_participantes (id_participante, capturado_en DESC);

-- Para actas por ubicación (Benford)
CREATE INDEX IF NOT EXISTS idx_actas_ubigeo_eleccion
    ON actas (id_ubigeo, id_eleccion, capturado_en DESC);

-- Para alertas del panel principal
CREATE INDEX IF NOT EXISTS idx_alertas_dashboard
    ON alertas (severidad, generada_en DESC)
    WHERE revisada = FALSE;

CREATE INDEX IF NOT EXISTS idx_alertas_tipo
    ON alertas (tipo, generada_en DESC);
