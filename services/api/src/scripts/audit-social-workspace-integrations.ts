import { pgClient } from '../db/index.js';

type DuplicateScopeRow = {
    platform: 'instagram' | 'tiktok' | 'youtube';
    duplicate_scopes: string;
    extra_connections: string;
};

async function main() {
    try {
        const audit = await pgClient.begin(async (tx) => {
            await tx.unsafe('SET TRANSACTION READ ONLY');
            const duplicateScopes = await tx.unsafe<DuplicateScopeRow[]>(`
            SELECT 'instagram' AS platform,
                   count(*)::text AS duplicate_scopes,
                   coalesce(sum(connection_count - 1), 0)::text AS extra_connections
            FROM (
                SELECT coalesce(integration.account_id, membership.account_id) AS effective_account_id,
                       integration.vertical,
                       count(*) AS connection_count
                FROM instagram_accounts AS integration
                LEFT JOIN account_users AS membership
                  ON membership.user_id = integration.user_id
                 AND membership.is_default = true
                GROUP BY effective_account_id, integration.vertical
                HAVING coalesce(integration.account_id, membership.account_id) IS NOT NULL
                   AND count(*) > 1
            ) AS duplicates
            UNION ALL
            SELECT 'tiktok' AS platform,
                   count(*)::text AS duplicate_scopes,
                   coalesce(sum(connection_count - 1), 0)::text AS extra_connections
            FROM (
                SELECT coalesce(integration.account_id, membership.account_id) AS effective_account_id,
                       integration.vertical,
                       count(*) AS connection_count
                FROM tiktok_accounts AS integration
                LEFT JOIN account_users AS membership
                  ON membership.user_id = integration.user_id
                 AND membership.is_default = true
                GROUP BY effective_account_id, integration.vertical
                HAVING coalesce(integration.account_id, membership.account_id) IS NOT NULL
                   AND count(*) > 1
            ) AS duplicates
            UNION ALL
            SELECT 'youtube' AS platform,
                   count(*)::text AS duplicate_scopes,
                   coalesce(sum(connection_count - 1), 0)::text AS extra_connections
            FROM (
                SELECT coalesce(integration.account_id, membership.account_id) AS effective_account_id,
                       integration.vertical,
                       count(*) AS connection_count
                FROM youtube_accounts AS integration
                LEFT JOIN account_users AS membership
                  ON membership.user_id = integration.user_id
                 AND membership.is_default = true
                GROUP BY effective_account_id, integration.vertical
                HAVING coalesce(integration.account_id, membership.account_id) IS NOT NULL
                   AND count(*) > 1
            ) AS duplicates
            ORDER BY platform
        `);

            const uniqueIndexes = await tx.unsafe<{ platform: string; ready: boolean }[]>(`
            WITH expected(platform, table_name, index_name) AS (
                VALUES
                    ('instagram', 'instagram_accounts', 'instagram_accounts_account_vertical_idx'),
                    ('tiktok', 'tiktok_accounts', 'tiktok_accounts_account_vertical_idx'),
                    ('youtube', 'youtube_accounts', 'youtube_accounts_account_vertical_idx')
            )
            SELECT expected.platform,
                   EXISTS (
                       SELECT 1
                       FROM pg_index AS index_record
                       JOIN pg_class AS index_table ON index_table.oid = index_record.indexrelid
                       JOIN pg_class AS source_table ON source_table.oid = index_record.indrelid
                       JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
                       WHERE source_schema.nspname = current_schema()
                         AND source_table.relname = expected.table_name
                         AND index_table.relname = expected.index_name
                         AND index_record.indisunique
                         AND index_record.indisvalid
                         AND index_record.indisready
                   ) AS ready
            FROM expected
            ORDER BY expected.platform
        `);

            const hasDuplicates = duplicateScopes.some((row) => Number(row.duplicate_scopes) > 0);
            return { duplicateScopes, uniqueIndexes, hasDuplicates };
        });

        console.log(JSON.stringify({
            note: 'Auditoría agregada dentro de una transacción READ ONLY; no devuelve IDs, nombres de cuentas ni tokens. Simula el alcance de las migraciones 0163/0164 asignando conexiones heredadas al espacio predeterminado antes de detectar duplicados.',
            duplicateScopes: audit.duplicateScopes,
            uniqueIndexes: audit.uniqueIndexes,
            safeToApplySocialUniquenessMigration: !audit.hasDuplicates,
        }, null, 2));

        if (audit.hasDuplicates) process.exitCode = 2;
    } finally {
        await pgClient.end();
    }
}

void main().catch((error) => {
    console.error('No se pudo auditar el alcance de las integraciones sociales:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
