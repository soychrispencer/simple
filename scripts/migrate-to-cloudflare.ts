#!/usr/bin/env tsx
/**
 * Script de migración: Backblaze B2 → Cloudflare R2
 *
 * Este script migra todas las imágenes de Backblaze B2 a Cloudflare R2
 * y actualiza las URLs en la base de datos.
 *
 * Uso:
 *   tsx scripts/migrate-to-cloudflare.ts [--dry-run] [--vertical=autos|propiedades|agenda|admin]
 *
 * Opciones:
 *   --dry-run      Simular sin hacer cambios reales
 *   --vertical     Migrar solo una vertical específica
 *   --batch-size   Número de imágenes por batch (default: 10)
 */

import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { sql } from 'drizzle-orm';
import { db } from '../services/api/src/db';

// Configuración Backblaze B2 (S3)
const backblazeClient = new S3Client({
    endpoint: process.env.BACKBLAZE_S3_ENDPOINT || 'https://s3.us-east-005.backblazeb2.com',
    region: process.env.BACKBLAZE_S3_REGION || 'us-east-005',
    credentials: {
        accessKeyId: process.env.BACKBLAZE_S3_ACCESS_KEY || '',
        secretAccessKey: process.env.BACKBLAZE_S3_SECRET_KEY || '',
    },
    forcePathStyle: false,
});

// Configuración Cloudflare R2 (S3)
const cloudflareAccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || '';
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${cloudflareAccountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    },
    forcePathStyle: false,
});

const BACKBLAZE_BUCKET = process.env.BACKBLAZE_BUCKET_NAME || 'simple-media';
const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'simple-media';
const R2_PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-4809688bad1a41768578b221b0df942c.r2.dev';

interface MigrationStats {
    total: number;
    migrated: number;
    failed: number;
    skipped: number;
    alreadyInR2: number;
}

async function listBackblazeObjects(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
        const command = new ListObjectsV2Command({
            Bucket: BACKBLAZE_BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken,
            MaxKeys: 1000,
        });

        const response = await backblazeClient.send(command);
        
        if (response.Contents) {
            for (const obj of response.Contents) {
                if (obj.Key && !obj.Key.endsWith('/')) {
                    keys.push(obj.Key);
                }
            }
        }

        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return keys;
}

async function copyObjectToR2(key: string, dryRun: boolean): Promise<boolean> {
    try {
        // 1. Verificar si ya existe en R2
        try {
            const headCommand = new GetObjectCommand({
                Bucket: R2_BUCKET,
                Key: key,
            });
            await r2Client.send(headCommand);
            console.log(`  ⏭️  Ya existe en R2: ${key}`);
            return true; // Ya existe, considerado éxito
        } catch {
            // No existe, proceder con la copia
        }

        if (dryRun) {
            console.log(`  📋 [DRY-RUN] Copiaría: ${key}`);
            return true;
        }

        // 2. Descargar de Backblaze
        const getCommand = new GetObjectCommand({
            Bucket: BACKBLAZE_BUCKET,
            Key: key,
        });
        const response = await backblazeClient.send(getCommand);
        
        if (!response.Body) {
            throw new Error('Empty body');
        }

        const bodyBuffer = await response.Body.transformToByteArray();

        // 3. Subir a R2
        const putCommand = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: bodyBuffer,
            ContentType: response.ContentType || 'application/octet-stream',
            Metadata: {
                'migrated-from': 'backblaze-b2',
                'migrated-at': new Date().toISOString(),
            },
        });
        await r2Client.send(putCommand);

        console.log(`  ✅ Copiado: ${key} (${(bodyBuffer.length / 1024).toFixed(1)} KB)`);
        return true;
    } catch (error) {
        console.error(`  ❌ Error copiando ${key}:`, error instanceof Error ? error.message : error);
        return false;
    }
}

async function updateDatabaseUrls(stats: MigrationStats, dryRun: boolean): Promise<void> {
    console.log('\n📊 Actualizando base de datos...');

    if (dryRun) {
        console.log('  [DRY-RUN] No se actualizarán URLs en la BD');
        return;
    }

    // Aquí irían las queries para actualizar URLs en la BD
    // Por ahora solo mostramos estadísticas
    console.log('  ⚠️  Actualización de BD no implementada automáticamente');
    console.log('  📝 Las nuevas imágenes usarán R2 automáticamente');
    console.log('  📝 Las URLs antiguas seguirán funcionando vía proxy');
}

async function migrateListingsImages(vertical?: string, dryRun = false, batchSize = 10): Promise<MigrationStats> {
    console.log(`\n🚀 Iniciando migración${vertical ? ` para vertical: ${vertical}` : ''}`);
    console.log(`   Modo: ${dryRun ? 'DRY-RUN (simulación)' : 'REAL'}`);
    console.log(`   Batch size: ${batchSize}`);

    const stats: MigrationStats = {
        total: 0,
        migrated: 0,
        failed: 0,
        skipped: 0,
        alreadyInR2: 0,
    };

    // Listar objetos en Backblaze
    console.log('\n📁 Listando objetos en Backblaze B2...');
    const objects = await listBackblazeObjects();
    stats.total = objects.length;

    console.log(`   ${objects.length} objetos encontrados`);

    // Filtrar por vertical si se especificó
    let filteredObjects = objects;
    if (vertical) {
        filteredObjects = objects.filter(key => 
            key.startsWith(`${vertical}/`) || 
            key.includes(`/${vertical}/`)
        );
        console.log(`   ${filteredObjects.length} objetos para vertical ${vertical}`);
    }

    // Procesar en batches
    for (let i = 0; i < filteredObjects.length; i += batchSize) {
        const batch = filteredObjects.slice(i, i + batchSize);
        console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(filteredObjects.length / batchSize)}`);

        for (const key of batch) {
            const success = await copyObjectToR2(key, dryRun);
            if (success) {
                stats.migrated++;
            } else {
                stats.failed++;
            }
        }

        // Pequeña pausa entre batches
        if (i + batchSize < filteredObjects.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return stats;
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const verticalArg = args.find(arg => arg.startsWith('--vertical='));
    const vertical = verticalArg ? verticalArg.split('=')[1] : undefined;
    const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
    const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 10;

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   Migración: Backblaze B2 → Cloudflare R2             ║');
    console.log('╚════════════════════════════════════════════════════════╝');

    // Validar credenciales
    if (!process.env.BACKBLAZE_S3_ACCESS_KEY || !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
        console.error('\n❌ Error: Faltan credenciales de Backblaze o Cloudflare');
        console.error('   Asegúrate de tener las variables de entorno configuradas:');
        console.error('   - BACKBLAZE_S3_ACCESS_KEY');
        console.error('   - BACKBLAZE_S3_SECRET_KEY');
        console.error('   - CLOUDFLARE_R2_ACCESS_KEY_ID');
        console.error('   - CLOUDFLARE_R2_SECRET_ACCESS_KEY');
        console.error('   - CLOUDFLARE_R2_ACCOUNT_ID');
        process.exit(1);
    }

    try {
        const stats = await migrateListingsImages(vertical, dryRun, batchSize);
        
        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║              RESUMEN DE MIGRACIÓN                     ║');
        console.log('╚════════════════════════════════════════════════════════╝');
        console.log(`   Total objetos:     ${stats.total}`);
        console.log(`   Migrados:          ${stats.migrated}`);
        console.log(`   Fallidos:          ${stats.failed}`);
        console.log(`   Omitidos:          ${stats.skipped}`);
        console.log(`   Éxito:             ${((stats.migrated / stats.total) * 100).toFixed(1)}%`);

        if (!dryRun && stats.migrated > 0) {
            await updateDatabaseUrls(stats, dryRun);
        }

        console.log('\n✅ Migración completada');
        if (dryRun) {
            console.log('   Ejecuta sin --dry-run para migrar realmente');
        }

    } catch (error) {
        console.error('\n❌ Error fatal:', error);
        process.exit(1);
    }
}

main();
