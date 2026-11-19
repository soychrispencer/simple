#!/usr/bin/env tsx
/**
 * Copies existing Agenda client attachments and Serenatas scores from the
 * public R2 bucket to the configured private bucket, then updates their rows.
 * Dry-run is the default. The public source objects are intentionally kept.
 *
 *   pnpm --filter @simple/api run db:migrate:private-media
 *   pnpm --filter @simple/api run db:migrate:private-media -- --apply
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import postgres from 'postgres';
import { createR2S3Client, readR2Credentials, type R2Credentials } from '../src/storage-providers/r2-config.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(scriptDir, '..');
const apply = process.argv.includes('--apply');

if (apply && process.env.NODE_ENV !== 'production') {
    console.error('Para --apply, configura NODE_ENV=production y suministra DATABASE_URL y las variables R2 mediante el entorno seguro. No se cargan archivos .env.');
    process.exit(1);
}

if (!apply && process.env.NODE_ENV !== 'production') {
    for (const candidate of [path.join(apiRoot, '.env'), path.join(apiRoot, '.env.local')]) {
        if (!existsSync(candidate)) continue;
        for (const line of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const index = trimmed.indexOf('=');
            if (index <= 0) continue;
            const key = trimmed.slice(0, index).trim();
            if (key && !process.env[key]) process.env[key] = trimmed.slice(index + 1).trim();
        }
    }
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
    console.error('Falta configurar DATABASE_URL para revisar las referencias de archivos.');
    process.exit(1);
}

type R2MigrationConfig = {
    accountId: string;
    publicCredentials: R2Credentials;
    privateCredentials: R2Credentials;
    publicBucket: string;
    privateBucket: string;
    publicHost: string;
};

function getR2MigrationConfig(): R2MigrationConfig {
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID?.trim();
    const publicCredentials = readR2Credentials('public');
    const privateCredentials = readR2Credentials('private');
    const publicBucket = process.env.CLOUDFLARE_R2_BUCKET_NAME?.trim();
    const privateBucket = process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME?.trim();
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.trim().replace(/\/+$/, '');
    const requiredVariables = [
        'CLOUDFLARE_R2_ACCOUNT_ID',
        'CLOUDFLARE_R2_BUCKET_NAME',
        'CLOUDFLARE_R2_PRIVATE_BUCKET_NAME',
        'CLOUDFLARE_R2_PUBLIC_URL',
    ] as const;
    const missingVariables: string[] = requiredVariables.filter((name) => !process.env[name]?.trim());
    if (!publicCredentials) missingVariables.push('CLOUDFLARE_R2_ACCESS_KEY_ID/CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    if (!privateCredentials) missingVariables.push('CLOUDFLARE_R2_PRIVATE_ACCESS_KEY_ID/CLOUDFLARE_R2_PRIVATE_SECRET_ACCESS_KEY');

    if (missingVariables.length > 0) {
        throw new Error(`Falta configurar estas variables para migrar archivos: ${missingVariables.join(', ')}.`);
    }

    if (publicBucket === privateBucket) {
        throw new Error('CLOUDFLARE_R2_BUCKET_NAME y CLOUDFLARE_R2_PRIVATE_BUCKET_NAME deben apuntar a buckets distintos.');
    }

    let publicHost: string;
    try {
        const parsedPublicUrl = new URL(publicUrl!);
        if (parsedPublicUrl.protocol !== 'https:' || parsedPublicUrl.pathname !== '/' || parsedPublicUrl.username || parsedPublicUrl.password || parsedPublicUrl.search || parsedPublicUrl.hash) {
            throw new Error('invalid public URL');
        }
        publicHost = parsedPublicUrl.hostname;
    } catch {
        throw new Error('CLOUDFLARE_R2_PUBLIC_URL debe ser una URL HTTPS válida en la raíz del dominio, sin credenciales, parámetros ni fragmento.');
    }

    return { accountId: accountId!, publicCredentials: publicCredentials!, privateCredentials: privateCredentials!, publicBucket: publicBucket!, privateBucket: privateBucket!, publicHost };
}

function sourceObjectKey(value: string, config: R2MigrationConfig): string | null {
    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) return null;
        let encodedKey = '';
        const endpointHost = `${config.accountId}.r2.cloudflarestorage.com`;
        if (parsed.hostname === config.publicHost) {
            encodedKey = parsed.pathname.replace(/^\//, '');
        } else if (parsed.hostname === endpointHost) {
            const prefix = `/${config.publicBucket}/`;
            if (!parsed.pathname.startsWith(prefix)) return null;
            encodedKey = parsed.pathname.slice(prefix.length);
        } else if (parsed.hostname === `${config.publicBucket}.${endpointHost}`) {
            encodedKey = parsed.pathname.replace(/^\//, '');
        } else {
            return null;
        }
        const key = decodeURIComponent(encodedKey);
        return key.startsWith('uploads/') && !key.startsWith('/') ? key : null;
    } catch {
        return null;
    }
}

function privateStorageUrl(key: string): string {
    return `simple-private:r2:${encodeURIComponent(key)}`;
}

async function main() {
    const sql = postgres(databaseUrl!, { max: 1 });
    let publicClient: S3Client | null = null;
    let privateClient: S3Client | null = null;

    try {
        const { attachments, scores } = await sql.begin(async (tx) => {
            await tx.unsafe('SET TRANSACTION READ ONLY');

            const [attachments, scores] = await Promise.all([
                tx<{ id: string; url: string }[]>`
                SELECT id, url FROM agenda_client_attachments
                WHERE url IS NOT NULL AND url NOT LIKE 'simple-private:%'
            `,
                tx<{ id: string; storage_url: string }[]>`
                SELECT id, storage_url FROM serenata_song_scores
                WHERE storage_url IS NOT NULL AND storage_url NOT LIKE 'simple-private:%'
            `,
            ]);

            return { attachments, scores };
        });

        const records = [
            ...attachments.map((row) => ({ table: 'agenda_client_attachments' as const, id: row.id, column: 'url' as const, url: row.url })),
            ...scores.map((row) => ({ table: 'serenata_song_scores' as const, id: row.id, column: 'storage_url' as const, url: row.storage_url })),
        ];
        if (records.length === 0) {
            console.log(`${apply ? 'APPLY' : 'DRY RUN'}: 0 referencias revisadas, 0 referencias con formato R2 compatible, 0 objetos únicos, 0 referencias no compatibles.`);
            console.log('No hay adjuntos pendientes; no se necesita acceso a R2 ni se modificó la base.');
            return;
        }

        const config = getR2MigrationConfig();
        publicClient = createR2S3Client(config.accountId, config.publicCredentials);
        privateClient = createR2S3Client(config.accountId, config.privateCredentials);

        const candidates = records.flatMap((record) => {
            const sourceKey = sourceObjectKey(record.url, config);
            if (!sourceKey) return [];
            const hash = createHash('sha256').update(record.url).digest('hex');
            const extension = path.posix.extname(sourceKey).replace(/[^.a-zA-Z0-9]/g, '').slice(0, 12);
            const privateKey = `attachments/migrated/${hash}${extension}`;
            return [{ ...record, sourceKey, privateKey }];
        });
        const uniqueSources = new Map(candidates.map((candidate) => [candidate.url, candidate]));
        const unsupportedReferences = records.length - candidates.length;

        console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${records.length} referencias revisadas, ${candidates.length} referencias con formato R2 compatible, ${uniqueSources.size} objetos únicos, ${unsupportedReferences} referencias no compatibles.`);
        if (unsupportedReferences > 0) {
            console.error('No se modificó nada. Resuelve o clasifica manualmente las referencias no compatibles antes de continuar.');
            process.exitCode = 2;
            return;
        }

        let verifiedSources = 0;
        let unverifiedSources = 0;
        for (const source of uniqueSources.values()) {
            try {
                await publicClient.send(new HeadObjectCommand({ Bucket: config.publicBucket, Key: source.sourceKey }));
                verifiedSources++;
            } catch {
                unverifiedSources++;
            }
        }
        console.log(`${verifiedSources} objetos fuente verificados; ${unverifiedSources} no pudieron verificarse.`);
        if (unverifiedSources > 0) {
            console.error('No se modificó nada. Revisa el acceso al bucket y las referencias antes de reintentar.');
            process.exitCode = 2;
            return;
        }
        if (!apply) {
            console.log('Dry-run de solo lectura completo. Vuelve a ejecutar con --apply para copiar los objetos y cambiar sus referencias en la base.');
            return;
        }

        try {
            await privateClient.send(new ListObjectsV2Command({ Bucket: config.privateBucket, MaxKeys: 1 }));
        } catch {
            throw new Error('No se pudo verificar el acceso al bucket privado. No se copiaron objetos ni se modificó la base.');
        }

        let updatedReferences = 0;
        let staleReferences = 0;
        let failedObjects = 0;
        for (const source of uniqueSources.values()) {
            try {
                const object = await publicClient.send(new GetObjectCommand({ Bucket: config.publicBucket, Key: source.sourceKey }));
                if (!object.Body) throw new Error('R2 devolvió el objeto sin contenido.');
                const body = await object.Body.transformToByteArray();
                await privateClient.send(new PutObjectCommand({
                    Bucket: config.privateBucket,
                    Key: source.privateKey,
                    Body: body,
                    ContentType: object.ContentType ?? 'application/octet-stream',
                    Metadata: { migratedFromPublicBucket: 'true' },
                }));

                const nextUrl = privateStorageUrl(source.privateKey);
                for (const record of candidates.filter((item) => item.url === source.url)) {
                    const rows = record.table === 'agenda_client_attachments'
                        ? await sql`UPDATE agenda_client_attachments SET url = ${nextUrl} WHERE id = ${record.id} AND url = ${record.url} RETURNING id`
                        : await sql`UPDATE serenata_song_scores SET storage_url = ${nextUrl} WHERE id = ${record.id} AND storage_url = ${record.url} RETURNING id`;
                    if (rows.length === 1) updatedReferences++;
                    else staleReferences++;
                }
                console.log(`Migrado ${source.table}/${source.id} a ${source.privateKey}`);
            } catch (error) {
                failedObjects++;
                console.error(`No se pudo migrar ${source.table}/${source.id}:`, error instanceof Error ? error.message : String(error));
            }
        }

        console.log(`Finalizado: ${updatedReferences} referencias actualizadas; ${staleReferences} referencias cambiaron durante la migración; ${failedObjects} objetos fallidos.`);
        console.log('Los originales del bucket público no se borraron. Elimínalos solo después de comprobar que no tienen otras referencias públicas.');
        if (failedObjects > 0 || staleReferences > 0) process.exitCode = 1;
    } finally {
        publicClient?.destroy();
        privateClient?.destroy();
        await sql.end();
    }
}

void main().catch((error) => {
    console.error('Falló la migración de adjuntos privados:', error);
    process.exitCode = 1;
});
