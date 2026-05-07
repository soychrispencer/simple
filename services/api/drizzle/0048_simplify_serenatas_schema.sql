-- ============================================================================
-- FASE 1: SIMPLIFICACIÓN RADICAL DE BASE DE DATOS SERENATAS
-- Fecha: 2026-05-06
-- Objetivo: Reducir de 19 tablas a 8 tablas esenciales
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ELIMINAR TABLAS OBSOLETAS (con backup de datos primero)
-- ----------------------------------------------------------------------------

-- Nota: Ejecutar solo después de migrar datos relevantes
-- DROP TABLE IF EXISTS serenata_requests CASCADE;
-- DROP TABLE IF EXISTS serenata_assignments CASCADE;
-- DROP TABLE IF EXISTS serenata_coordinator_crew_memberships CASCADE;
-- DROP TABLE IF EXISTS serenata_routes CASCADE;
-- DROP TABLE IF EXISTS serenata_availability CASCADE; -- vieja, mantener slots
-- DROP TABLE IF EXISTS serenata_coordinator_reviews CASCADE;
-- DROP TABLE IF EXISTS serenata_coordinator_preapprovals CASCADE;
-- DROP TABLE IF EXISTS serenata_messages CASCADE;

-- ----------------------------------------------------------------------------
-- 2. MODIFICAR TABLAS EXISTENTES (non-breaking changes)
-- ----------------------------------------------------------------------------

-- A. serenata_musicians: Agregar campos para unificar cuadrilla
ALTER TABLE serenata_musicians 
ADD COLUMN IF NOT EXISTS is_crew_member BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS coordinator_profile_id UUID REFERENCES serenata_coordinator_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS crew_since TIMESTAMP DEFAULT NULL;

-- Crear índice para búsquedas de cuadrilla
CREATE INDEX IF NOT EXISTS idx_musicians_coordinator ON serenata_musicians(coordinator_profile_id) WHERE is_crew_member = TRUE;

-- B. serenata_groups: Agregar campos de ruta (antes en tabla separada)
ALTER TABLE serenata_groups
ADD COLUMN IF NOT EXISTS route_optimized BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS route_data JSONB DEFAULT NULL, -- waypoint order, distances
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT NULL;

-- C. serenatas: Agregar relación opcional a grupo
ALTER TABLE serenatas
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES serenata_groups(id) ON DELETE SET NULL;

-- Crear índice para filtrar por grupo
CREATE INDEX IF NOT EXISTS idx_serenatas_group ON serenatas(group_id) WHERE group_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 3. SIMPLIFICAR TABLA DE REVIEWS (unificar)
-- ----------------------------------------------------------------------------

-- Agregar campo para distinguir tipo de review en tabla unificada
ALTER TABLE serenata_reviews
ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) DEFAULT 'client_to_group'; -- 'client_to_group', 'coordinator_to_musician'

-- Migrar datos de serenata_coordinator_reviews si existen
-- INSERT INTO serenata_reviews (serenata_id, group_id, review_type, rating, ...)
-- SELECT serenata_id, group_id, 'coordinator_to_musician', rating, ...
-- FROM serenata_coordinator_reviews;

-- ----------------------------------------------------------------------------
-- 4. LIMPIAR CAMPOS REDUNDANTES EN COORDINATOR PROFILES
-- ----------------------------------------------------------------------------

-- Verificar qué campos se usan realmente
-- Los siguientes son candidatos a eliminar si no se usan en el frontend:
-- bio, experience, phone (duplicado con users?), lat/lng (usar dirección)

-- Por ahora solo documentar, eliminar en fase posterior si se confirma no uso
COMMENT ON COLUMN serenata_coordinator_profiles.bio IS 'Revisar si se usa en UI';
COMMENT ON COLUMN serenata_coordinator_profiles.experience IS 'Revisar si se usa en UI';

-- ----------------------------------------------------------------------------
-- 5. OPTIMIZACIONES DE ÍNDICES
-- ----------------------------------------------------------------------------

-- Índices esenciales para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_serenatas_status_date ON serenatas(status, event_date);
CREATE INDEX IF NOT EXISTS idx_serenatas_coordinator ON serenatas(coordinator_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_lineup_musician ON serenata_musician_lineup(musician_id);

-- ----------------------------------------------------------------------------
-- 6. VISTAS SIMPLIFICADAS (reemplazar queries complejas)
-- ----------------------------------------------------------------------------

-- Vista: Serenatas con información del coordinador (reemplaza joins frecuentes)
CREATE OR REPLACE VIEW serenatas_with_coordinator AS
SELECT 
    s.*,
    scp.user_id as coordinator_user_id,
    u.name as coordinator_name,
    u.phone as coordinator_phone
FROM serenatas s
LEFT JOIN serenata_coordinator_profiles scp ON s.coordinator_profile_id = scp.id
LEFT JOIN users u ON scp.user_id = u.id;

-- Vista: Músicos disponibles para una serenata (matching simplificado)
CREATE OR REPLACE VIEW available_musicians_for_serenata AS
SELECT 
    sm.*,
    u.name,
    u.email,
    u.phone,
    sas.start_time,
    sas.end_time
FROM serenata_musicians sm
JOIN users u ON sm.user_id = u.id
LEFT JOIN serenata_availability_slots sas ON sm.id = sas.musician_id
WHERE sm.is_available = TRUE;

-- ============================================================================
-- FIN MIGRACIÓN
-- ============================================================================
