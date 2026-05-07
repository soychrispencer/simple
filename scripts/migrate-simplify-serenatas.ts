#!/usr/bin/env tsx
// ============================================================================
// SCRIPT DE MIGRACIÓN: Simplificación de Base de Datos Serenatas
// De 19 tablas a 8 tablas esenciales
// ============================================================================

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../services/api/src/db/schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/simplev2';

async function main() {
    console.log('🚀 Iniciando migración de simplificación...');
    console.log('📡 Conectando a:', DATABASE_URL.replace(/:([^@]+)@/, ':****@'));
    
    const client = postgres(DATABASE_URL);
    const db = drizzle(client, { schema });
    
    try {
        // =====================================================================
        // FASE 1: Agregar columnas nuevas (non-breaking)
        // =====================================================================
        console.log('\n📦 Fase 1: Agregando columnas nuevas...');
        
        await client`
            ALTER TABLE serenata_musicians 
            ADD COLUMN IF NOT EXISTS is_crew_member BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS coordinator_profile_id UUID REFERENCES serenata_coordinator_profiles(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS crew_since TIMESTAMP DEFAULT NULL;
        `;
        console.log('  ✅ Columnas de cuadrilla agregadas a serenata_musicians');
        
        await client`
            ALTER TABLE serenata_groups
            ADD COLUMN IF NOT EXISTS route_optimized BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS route_data JSONB DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT NULL;
        `;
        console.log('  ✅ Campos de ruta agregados a serenata_groups');
        
        await client`
            ALTER TABLE serenatas
            ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES serenata_groups(id) ON DELETE SET NULL;
        `;
        console.log('  ✅ group_id agregado a serenatas');
        
        // =====================================================================
        // FASE 2: Crear índices
        // =====================================================================
        console.log('\n📊 Fase 2: Creando índices...');
        
        await client`
            CREATE INDEX IF NOT EXISTS idx_musicians_coordinator 
            ON serenata_musicians(coordinator_profile_id) 
            WHERE is_crew_member = TRUE;
        `;
        
        await client`
            CREATE INDEX IF NOT EXISTS idx_serenatas_group 
            ON serenatas(group_id) 
            WHERE group_id IS NOT NULL;
        `;
        
        await client`
            CREATE INDEX IF NOT EXISTS idx_serenatas_status_date 
            ON serenatas(status, event_date);
        `;
        
        await client`
            CREATE INDEX IF NOT EXISTS idx_serenatas_coordinator 
            ON serenatas(coordinator_profile_id, status);
        `;
        
        await client`
            CREATE INDEX IF NOT EXISTS idx_lineup_musician 
            ON serenata_musician_lineup(musician_id);
        `;
        console.log('  ✅ Índices creados');
        
        // =====================================================================
        // FASE 3: Migrar datos de crew_memberships a musicians
        // =====================================================================
        console.log('\n🔄 Fase 3: Migrando datos de cuadrilla...');
        
        // Migrar crew memberships a la nueva estructura
        const memberships = await client`
            SELECT * FROM serenata_coordinator_crew_memberships 
            WHERE deleted_at IS NULL;
        `.catch(() => []); // Tabla podría no existir
        
        if (memberships.length > 0) {
            console.log(`  📋 Encontrados ${memberships.length} miembros de cuadrilla`);
            
            for (const m of memberships) {
                await client`
                    UPDATE serenata_musicians 
                    SET is_crew_member = TRUE,
                        coordinator_profile_id = ${m.coordinator_profile_id},
                        crew_since = ${m.created_at}
                    WHERE id = ${m.musician_id};
                `;
            }
            console.log('  ✅ Miembros de cuadrilla migrados');
        } else {
            console.log('  ℹ️ No hay datos de cuadrilla para migrar');
        }
        
        // =====================================================================
        // FASE 4: Migrar datos de requests a serenatas (si es necesario)
        // =====================================================================
        console.log('\n🔄 Fase 4: Revisando serenata_requests...');
        
        const requests = await client`
            SELECT COUNT(*) as count FROM serenata_requests;
        `.catch(() => [{ count: 0 }]);
        
        if (requests[0]?.count > 0) {
            console.log(`  ⚠️  Encontrados ${requests[0].count} requests legacy`);
            console.log('  📝 NOTA: Migrar manualmente si hay datos importantes');
        }
        
        // =====================================================================
        // FASE 5: Crear vistas simplificadas
        // =====================================================================
        console.log('\n👁️ Fase 5: Creando vistas...');
        
        await client`
            CREATE OR REPLACE VIEW serenatas_with_coordinator AS
            SELECT 
                s.*,
                scp.user_id as coordinator_user_id,
                u.name as coordinator_name,
                u.phone as coordinator_phone
            FROM serenatas s
            LEFT JOIN serenata_coordinator_profiles scp ON s.coordinator_profile_id = scp.id
            LEFT JOIN users u ON scp.user_id = u.id;
        `;
        
        await client`
            CREATE OR REPLACE VIEW available_musicians_for_serenata AS
            SELECT 
                sm.*,
                u.name,
                u.email,
                u.phone
            FROM serenata_musicians sm
            JOIN users u ON sm.user_id = u.id
            WHERE sm.is_available = TRUE;
        `;
        console.log('  ✅ Vistas creadas');
        
        // =====================================================================
        // RESUMEN
        // =====================================================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ MIGRACIÓN COMPLETADA');
        console.log('='.repeat(60));
        console.log('\n📊 Resumen:');
        console.log('  • Columnas nuevas agregadas a tablas existentes');
        console.log('  • Índices de performance creados');
        console.log('  • Datos de cuadrilla migrados');
        console.log('  • Vistas simplificadas disponibles');
        console.log('\n⚠️  Siguiente pasos:');
        console.log('  1. Actualizar código frontend para usar nueva estructura');
        console.log('  2. Desplegar cambios');
        console.log('  3. Eliminar tablas obsoletas (después de confirmar migración):');
        console.log('     - serenata_requests');
        console.log('     - serenata_coordinator_crew_memberships');
        console.log('     - serenata_routes');
        console.log('     - serenata_availability (vieja)');
        console.log('     - serenata_coordinator_reviews');
        console.log('     - serenata_coordinator_preapprovals');
        console.log('     - serenata_messages');
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('\n❌ Error en migración:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
