import { apiFetch } from './api-client.js';

export type WorkspaceVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';
export type WorkspaceAccountKind = 'individual' | 'independent' | 'company';

export type AccountWorkspaceSettings = {
    accountId: string;
    vertical: WorkspaceVertical;
    accountKind: WorkspaceAccountKind;
    operatorSubtype: string | null;
    operatorSubtypeCustom: string | null;
    onboardingCompletedAt: string | null;
    updatedAt: string;
};

export type AccountWorkspaceState = {
    workspace: AccountWorkspaceSettings | null;
    accountName?: string;
    canManage: boolean;
    memberRole: string | null;
};

type WorkspaceResponse = {
    ok: boolean;
    workspace?: AccountWorkspaceSettings | null;
    accountName?: string;
    canManage?: boolean;
    memberRole?: string | null;
    accountChanged?: boolean;
    errorCode?: string;
    error?: string;
};

export async function fetchAccountWorkspace(
    vertical: WorkspaceVertical,
): Promise<AccountWorkspaceState | null> {
    const { data } = await apiFetch<WorkspaceResponse>(
        `/api/accounts/current/workspace?vertical=${vertical}`,
        { method: 'GET' },
    );
    if (!data?.ok) return null;
    return {
        workspace: data.workspace ?? null,
        accountName: data.accountName,
        canManage: data.canManage ?? true,
        memberRole: data.memberRole ?? null,
    };
}

export async function saveAccountWorkspace(
    vertical: WorkspaceVertical,
    input: Pick<AccountWorkspaceSettings, 'accountKind' | 'operatorSubtype' | 'operatorSubtypeCustom'>,
    accountName?: string,
): Promise<{ ok: boolean; workspace?: AccountWorkspaceSettings; accountName?: string; canManage?: boolean; memberRole?: string | null; accountChanged?: boolean; errorCode?: string; error?: string }> {
    const { data } = await apiFetch<WorkspaceResponse>(
        `/api/accounts/current/workspace?vertical=${vertical}`,
        {
            method: 'PUT',
            body: JSON.stringify({ ...input, ...(accountName ? { accountName } : {}) }),
        },
    );
    if (!data?.ok || !data.workspace) {
        return {
            ok: false,
            error: data?.error ?? 'No pudimos guardar esta configuración.',
            errorCode: data?.errorCode,
        };
    }
    return {
        ok: true,
        workspace: data.workspace,
        accountName: data.accountName,
        canManage: data.canManage ?? true,
        memberRole: data.memberRole ?? null,
        accountChanged: data.accountChanged,
    };
}
