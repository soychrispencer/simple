import { pgClient } from '../src/db/index.js';

type PrivateMediaScopeRow = {
    source_table: 'agenda_client_attachments' | 'serenata_song_scores';
    non_private_references: string;
    distinct_non_private_references: string;
    potential_public_upload_references: string;
    already_private_references: string;
    other_reference_formats: string;
};

async function main() {
    try {
        const { rows, globalDistinctObjects } = await pgClient.begin(async (tx) => {
            await tx.unsafe('SET TRANSACTION READ ONLY');

            const rows = await tx.unsafe<PrivateMediaScopeRow[]>(`
            WITH media_references AS (
                SELECT 'agenda_client_attachments'::text AS source_table, url AS storage_url
                FROM agenda_client_attachments
                WHERE url IS NOT NULL
                UNION ALL
                SELECT 'serenata_song_scores'::text AS source_table, storage_url
                FROM serenata_song_scores
                WHERE storage_url IS NOT NULL
            ), classified AS (
                SELECT
                    source_table,
                    storage_url,
                    storage_url LIKE 'simple-private:%' AS already_private,
                    storage_url ~* '^https://[^/]+/uploads/'
                        OR storage_url ~* '^https://[^/]+/[^/]+/uploads/' AS potential_public_upload
                FROM media_references
            )
            SELECT
                source_table.source_table,
                count(reference.storage_url) FILTER (WHERE NOT reference.already_private)::text AS non_private_references,
                count(DISTINCT reference.storage_url) FILTER (WHERE NOT reference.already_private)::text AS distinct_non_private_references,
                count(reference.storage_url) FILTER (WHERE NOT reference.already_private AND reference.potential_public_upload)::text AS potential_public_upload_references,
                count(reference.storage_url) FILTER (WHERE reference.already_private)::text AS already_private_references,
                count(reference.storage_url) FILTER (WHERE NOT reference.already_private AND NOT reference.potential_public_upload)::text AS other_reference_formats
            FROM (VALUES
                ('agenda_client_attachments'::text),
                ('serenata_song_scores'::text)
            ) AS source_table(source_table)
            LEFT JOIN classified AS reference ON reference.source_table = source_table.source_table
            GROUP BY source_table.source_table
            ORDER BY source_table.source_table
        `);

            const [globalDistinctObjects] = await tx.unsafe<{ distinct_non_private_references: string }[]>(`
            SELECT count(DISTINCT storage_url)::text AS distinct_non_private_references
            FROM (
                SELECT url AS storage_url
                FROM agenda_client_attachments
                WHERE url IS NOT NULL AND url NOT LIKE 'simple-private:%'
                UNION ALL
                SELECT storage_url
                FROM serenata_song_scores
                WHERE storage_url IS NOT NULL AND storage_url NOT LIKE 'simple-private:%'
            ) AS non_private_references
        `);

            return { rows, globalDistinctObjects };
        });

        const totalsByTable = rows.reduce((sum, row) => ({
            nonPrivateReferences: sum.nonPrivateReferences + Number(row.non_private_references),
            potentialPublicUploadReferences: sum.potentialPublicUploadReferences + Number(row.potential_public_upload_references),
            alreadyPrivateReferences: sum.alreadyPrivateReferences + Number(row.already_private_references),
            otherReferenceFormats: sum.otherReferenceFormats + Number(row.other_reference_formats),
        }), {
            nonPrivateReferences: 0,
            potentialPublicUploadReferences: 0,
            alreadyPrivateReferences: 0,
            otherReferenceFormats: 0,
        });
        const totals = {
            ...totalsByTable,
            distinctNonPrivateReferences: Number(globalDistinctObjects?.distinct_non_private_references ?? 0),
        };

        console.log(JSON.stringify({
            note: 'Auditoría agregada en transacción READ ONLY. No devuelve IDs, URLs ni datos personales. Las rutas potenciales solo se clasifican por forma; confirmar el dominio, el bucket y la existencia del objeto con el dry-run de R2 antes de migrar.',
            totals,
            bySourceTable: rows.map((row) => ({
                sourceTable: row.source_table,
                nonPrivateReferences: Number(row.non_private_references),
                distinctNonPrivateReferences: Number(row.distinct_non_private_references),
                potentialPublicUploadReferences: Number(row.potential_public_upload_references),
                alreadyPrivateReferences: Number(row.already_private_references),
                otherReferenceFormats: Number(row.other_reference_formats),
            })),
        }, null, 2));
    } finally {
        await pgClient.end();
    }
}

void main().catch((error) => {
    console.error('No se pudo auditar el alcance de archivos privados:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
