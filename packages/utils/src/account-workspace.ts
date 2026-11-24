import { apiFetch } from './api-client.js';
import type { OperatorTier } from './operator-profile-config.js';

export type WorkspaceVertical = 'autos' | 'propiedades' | 'agenda' | 'serenatas';
export type WorkspaceAccountKind = 'individual' | 'independent' | 'company';
export const POST_REGISTRATION_ROLE_WIZARD_VERSION = 1;
export type PostRegistrationWizardAnswers = {
    accountKind?: OperatorTier;
    operatorSubtype?: string;
    operatorSubtypeCustom?: string;
    companyName?: string;
    firstTask?: string;
    serenataRole?: 'client' | 'musician' | 'owner';
};

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

export type VerticalOnboardingStatus = 'not_started' | 'in_progress' | 'deferred' | 'completed' | 'legacy_complete';

export type VerticalOnboardingState = {
    version: number;
    status: VerticalOnboardingStatus;
    step: number;
    answers: Record<string, unknown>;
    shouldShow: boolean;
    legacyEquivalent: boolean;
    canManage: boolean;
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

type VerticalOnboardingResponse = {
    ok: boolean;
    version?: number;
    status?: VerticalOnboardingStatus;
    step?: number;
    answers?: Record<string, unknown>;
    shouldShow?: boolean;
    legacyEquivalent?: boolean;
    canManage?: boolean;
    error?: string;
};

export async function fetchVerticalOnboarding(
    vertical: WorkspaceVertical,
): Promise<VerticalOnboardingState | null> {
    const { data } = await apiFetch<VerticalOnboardingResponse>(
        `/api/accounts/current/onboarding?vertical=${vertical}`,
        { method: 'GET' },
    );
    if (!data?.ok || !data.status) return null;
    return {
        version: data.version ?? POST_REGISTRATION_ROLE_WIZARD_VERSION,
        status: data.status,
        step: data.step ?? 0,
        answers: data.answers ?? {},
        shouldShow: data.shouldShow ?? false,
        legacyEquivalent: data.legacyEquivalent ?? false,
        canManage: data.canManage ?? true,
    };
}

export async function saveVerticalOnboarding(
    vertical: WorkspaceVertical,
    input: { status: 'in_progress' | 'deferred' | 'completed'; step: number; answers: Record<string, unknown> },
): Promise<{ ok: boolean; error?: string }> {
    const { data } = await apiFetch<VerticalOnboardingResponse>(
        `/api/accounts/current/onboarding?vertical=${vertical}`,
        { method: 'PUT', body: JSON.stringify(input) },
    );
    return data?.ok ? { ok: true } : { ok: false, error: data?.error ?? 'No pudimos guardar el avance.' };
}

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
