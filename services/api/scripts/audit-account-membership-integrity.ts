import { pgClient } from '../src/db/index.js';

type AccountMembershipAuditRow = {
    users_with_memberships: string;
    users_without_membership: string;
    users_without_default: string;
    users_with_multiple_defaults: string;
    users_without_personal_account: string;
    users_with_multiple_personal_accounts: string;
    accounts_without_matching_owner_membership: string;
    accounts_with_nonunique_owner_role: string;
    personal_accounts_with_other_members: string;
    invalid_membership_roles: string;
    invalid_invitation_roles: string;
};

async function main() {
    try {
        const [row] = await pgClient.unsafe<AccountMembershipAuditRow[]>(`
            WITH user_membership_defaults AS (
                SELECT
                    person.id AS user_id,
                    count(membership.id) AS membership_count,
                    count(membership.id) FILTER (WHERE membership.is_default = true) AS default_count
                FROM users AS person
                LEFT JOIN account_users AS membership ON membership.user_id = person.id
                GROUP BY person.id
            ), user_personal_accounts AS (
                SELECT
                    person.id AS user_id,
                    count(account.id) FILTER (WHERE account.is_personal = true) AS personal_account_count
                FROM users AS person
                LEFT JOIN accounts AS account ON account.owner_user_id = person.id
                GROUP BY person.id
            ), account_owner_consistency AS (
                SELECT
                    account.id,
                    count(membership.id) FILTER (
                        WHERE membership.user_id = account.owner_user_id
                          AND membership.role = 'owner'
                    ) AS owner_membership_count,
                    count(membership.id) FILTER (WHERE membership.role = 'owner') AS owner_role_count
                FROM accounts AS account
                LEFT JOIN account_users AS membership ON membership.account_id = account.id
                GROUP BY account.id, account.owner_user_id
            ), personal_account_members AS (
                SELECT
                    account.id,
                    count(membership.id) FILTER (
                        WHERE membership.user_id <> account.owner_user_id
                           OR membership.role <> 'owner'
                    ) AS other_membership_count
                FROM accounts AS account
                LEFT JOIN account_users AS membership ON membership.account_id = account.id
                WHERE account.is_personal = true
                GROUP BY account.id, account.owner_user_id
            )
            SELECT
                (SELECT count(*) FROM user_membership_defaults WHERE membership_count > 0)::text AS users_with_memberships,
                (SELECT count(*) FROM user_membership_defaults WHERE membership_count = 0)::text AS users_without_membership,
                (SELECT count(*) FROM user_membership_defaults WHERE membership_count > 0 AND default_count = 0)::text AS users_without_default,
                (SELECT count(*) FROM user_membership_defaults WHERE default_count > 1)::text AS users_with_multiple_defaults,
                (SELECT count(*) FROM user_personal_accounts WHERE personal_account_count = 0)::text AS users_without_personal_account,
                (SELECT count(*) FROM user_personal_accounts WHERE personal_account_count > 1)::text AS users_with_multiple_personal_accounts,
                (SELECT count(*) FROM account_owner_consistency WHERE owner_membership_count <> 1)::text AS accounts_without_matching_owner_membership,
                (SELECT count(*) FROM account_owner_consistency WHERE owner_role_count <> 1)::text AS accounts_with_nonunique_owner_role,
                (SELECT count(*) FROM personal_account_members WHERE other_membership_count > 0)::text AS personal_accounts_with_other_members,
                (SELECT count(*) FROM account_users WHERE role NOT IN ('owner', 'admin', 'agent'))::text AS invalid_membership_roles,
                (SELECT count(*) FROM account_invitations WHERE role NOT IN ('admin', 'agent'))::text AS invalid_invitation_roles
        `);
        const [accountUserIndexes] = await pgClient.unsafe<{
            unique_membership_index_present: boolean;
            unique_default_index_present: boolean;
            unique_owner_index_present: boolean;
            account_team_member_pagination_index_present: boolean;
            account_team_invitation_pagination_index_present: boolean;
            account_membership_role_check_present: boolean;
            account_invitation_role_check_present: boolean;
        }[]>(`
            SELECT
                EXISTS (
                    SELECT 1
                    FROM pg_index AS index_record
                    JOIN pg_class AS index_table ON index_table.oid = index_record.indexrelid
                    JOIN pg_class AS source_table ON source_table.oid = index_record.indrelid
                    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
                    WHERE source_schema.nspname = current_schema()
                      AND source_table.relname = 'account_users'
                      AND index_table.relname = 'account_users_account_user_idx'
                      AND index_record.indisunique
                      AND index_record.indisvalid
                      AND index_record.indisready
                      AND index_record.indpred IS NULL
                      AND index_record.indnkeyatts = 2
                      AND pg_get_indexdef(index_record.indexrelid, 1, true) = 'account_id'
                      AND pg_get_indexdef(index_record.indexrelid, 2, true) = 'user_id'
                ) AS unique_membership_index_present,
                EXISTS (
                    SELECT 1
                    FROM pg_index AS index_record
                    JOIN pg_class AS index_table ON index_table.oid = index_record.indexrelid
                    JOIN pg_class AS source_table ON source_table.oid = index_record.indrelid
                    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
                    WHERE source_schema.nspname = current_schema()
                      AND source_table.relname = 'account_users'
                      AND index_table.relname = 'account_users_default_user_idx'
                      AND index_record.indisunique
                      AND index_record.indisvalid
                      AND index_record.indisready
                      AND index_record.indnkeyatts = 1
                      AND pg_get_indexdef(index_record.indexrelid, 1, true) = 'user_id'
                      AND lower(regexp_replace(
                          pg_get_expr(index_record.indpred, index_record.indrelid),
                          '[()[:space:]]',
                          '',
                          'g'
                      )) IN ('is_default', 'is_default=true', 'is_defaultistrue')
                ) AS unique_default_index_present,
                EXISTS (
                    SELECT 1
                    FROM pg_index AS index_record
                    JOIN pg_class AS index_table ON index_table.oid = index_record.indexrelid
                    JOIN pg_class AS source_table ON source_table.oid = index_record.indrelid
                    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
                    WHERE source_schema.nspname = current_schema()
                      AND source_table.relname = 'account_users'
                      AND index_table.relname = 'account_users_single_owner_idx'
                      AND index_record.indisunique
                      AND index_record.indisvalid
                      AND index_record.indisready
                      AND index_record.indnkeyatts = 1
                      AND pg_get_indexdef(index_record.indexrelid, 1, true) = 'account_id'
                      AND index_record.indpred IS NOT NULL
                      AND pg_get_expr(index_record.indpred, index_record.indrelid) ~* 'role.*=.*owner'
                ) AS unique_owner_index_present,
                EXISTS (
                    SELECT 1
                    FROM pg_index AS index_record
                    JOIN pg_class AS index_table ON index_table.oid = index_record.indexrelid
                    JOIN pg_class AS source_table ON source_table.oid = index_record.indrelid
                    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
                    WHERE source_schema.nspname = current_schema()
                      AND source_table.relname = 'account_users'
                      AND index_table.relname = 'account_users_account_created_user_idx'
                      AND index_record.indisvalid
                      AND index_record.indisready
                      AND index_record.indpred IS NULL
                      AND index_record.indnkeyatts = 3
                      AND pg_get_indexdef(index_record.indexrelid, 1, true) = 'account_id'
                      AND pg_get_indexdef(index_record.indexrelid, 2, true) = 'created_at'
                      AND pg_get_indexdef(index_record.indexrelid, 3, true) = 'user_id'
                ) AS account_team_member_pagination_index_present,
                EXISTS (
                    SELECT 1
                    FROM pg_index AS index_record
                    JOIN pg_class AS index_table ON index_table.oid = index_record.indexrelid
                    JOIN pg_class AS source_table ON source_table.oid = index_record.indrelid
                    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
                    WHERE source_schema.nspname = current_schema()
                      AND source_table.relname = 'account_invitations'
                      AND index_table.relname = 'account_invitations_account_pending_created_idx'
                      AND index_record.indisvalid
                      AND index_record.indisready
                      AND index_record.indpred IS NOT NULL
                      AND index_record.indnkeyatts = 3
                      AND pg_get_indexdef(index_record.indexrelid, 1, true) = 'account_id'
                      AND pg_get_indexdef(index_record.indexrelid, 2, true) = 'created_at'
                      AND pg_get_indexdef(index_record.indexrelid, 3, true) = 'id'
                      AND pg_get_expr(index_record.indpred, index_record.indrelid) ~* 'accepted_at.*IS NULL.*revoked_at.*IS NULL'
                ) AS account_team_invitation_pagination_index_present,
                EXISTS (
                    SELECT 1
                    FROM pg_constraint AS constraint_record
                    JOIN pg_class AS source_table ON source_table.oid = constraint_record.conrelid
                    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
                    WHERE source_schema.nspname = current_schema()
                      AND source_table.relname = 'account_users'
                      AND constraint_record.conname = 'account_users_role_allowed_check'
                      AND constraint_record.contype = 'c'
                      AND constraint_record.convalidated
                      AND pg_get_constraintdef(constraint_record.oid) ~* 'role.*owner.*admin.*agent'
                ) AS account_membership_role_check_present,
                EXISTS (
                    SELECT 1
                    FROM pg_constraint AS constraint_record
                    JOIN pg_class AS source_table ON source_table.oid = constraint_record.conrelid
                    JOIN pg_namespace AS source_schema ON source_schema.oid = source_table.relnamespace
                    WHERE source_schema.nspname = current_schema()
                      AND source_table.relname = 'account_invitations'
                      AND constraint_record.conname = 'account_invitations_role_allowed_check'
                      AND constraint_record.contype = 'c'
                      AND constraint_record.convalidated
                      AND pg_get_constraintdef(constraint_record.oid) ~* 'role.*admin.*agent'
                ) AS account_invitation_role_check_present
        `);

        if (!row) throw new Error('La consulta no devolvió resultados.');
        const counts = Object.fromEntries(
            Object.entries(row).map(([key, value]) => [key, Number(value)]),
        ) as Record<keyof AccountMembershipAuditRow, number>;
        const anomalies = Object.fromEntries(
            Object.entries(counts).filter(([key, value]) => key !== 'users_with_memberships' && value > 0),
        );
        const schema = {
            uniqueMembershipIndexPresent: accountUserIndexes?.unique_membership_index_present === true,
            uniqueDefaultIndexPresent: accountUserIndexes?.unique_default_index_present === true,
            uniqueOwnerMembershipIndexPresent: accountUserIndexes?.unique_owner_index_present === true,
            accountTeamMemberPaginationIndexPresent: accountUserIndexes?.account_team_member_pagination_index_present === true,
            accountTeamInvitationPaginationIndexPresent: accountUserIndexes?.account_team_invitation_pagination_index_present === true,
            accountMembershipRoleConstraintPresent: accountUserIndexes?.account_membership_role_check_present === true,
            accountInvitationRoleConstraintPresent: accountUserIndexes?.account_invitation_role_check_present === true,
        };
        if (!schema.uniqueMembershipIndexPresent) anomalies.missing_unique_membership_index = 1;
        if (!schema.uniqueDefaultIndexPresent) anomalies.missing_unique_default_index = 1;
        if (!schema.uniqueOwnerMembershipIndexPresent) anomalies.missing_unique_owner_index = 1;
        if (!schema.accountTeamMemberPaginationIndexPresent) anomalies.missing_account_team_member_pagination_index = 1;
        if (!schema.accountTeamInvitationPaginationIndexPresent) anomalies.missing_account_team_invitation_pagination_index = 1;
        if (!schema.accountMembershipRoleConstraintPresent) anomalies.missing_account_membership_role_constraint = 1;
        if (!schema.accountInvitationRoleConstraintPresent) anomalies.missing_account_invitation_role_constraint = 1;
        const ok = Object.keys(anomalies).length === 0;

        console.log(JSON.stringify({
            note: 'Auditoría agregada de solo lectura; no incluye IDs ni datos personales. Cada persona debe tener una cuenta personal y un espacio predeterminado; las cuentas personales son privadas de su dueño; cada cuenta debe tener un solo rol owner que coincida con owner_user_id.',
            ok,
            schema,
            counts,
            anomalies,
        }, null, 2));

        if (!ok) process.exitCode = 2;
    } finally {
        await pgClient.end();
    }
}

void main().catch((error) => {
    console.error('No se pudo auditar la integridad de membresías:', error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
