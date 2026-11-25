'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentAccountContext } from '@simple/utils';
import {
    fetchAccountWorkspace,
    fetchVerticalOnboarding,
    saveAccountWorkspace,
    saveVerticalOnboarding,
    type AccountWorkspaceState,
    type PostRegistrationWizardAnswers,
    type VerticalOnboardingState,
    type WorkspaceVertical,
} from '@simple/utils';
import { announceMarketplaceWorkspaceReady } from './use-marketplace-workspace-navigation.js';
import { BrandLogo } from '../brand/index.js';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelNotice } from './panel-primitives.js';
import { PostRegistrationRoleWizard } from './post-registration-role-wizard.js';

type Mode = 'loading' | 'normal' | 'wizard' | 'deferred' | 'error';

function firstTaskHref(vertical: WorkspaceVertical, answers: PostRegistrationWizardAnswers): string {
    if (vertical === 'propiedades') {
        if (answers.firstTask === 'publish_project') return '/panel/publicar?op=project';
        if (answers.firstTask === 'organize_contacts') return '/panel/contactos';
        if (answers.firstTask === 'coordinate_visits') return '/panel/contactos';
        if (answers.firstTask === 'load_portfolio') return '/panel/publicaciones';
        return '/panel/publicar';
    }
    if (vertical === 'autos') {
        if (answers.firstTask === 'organize_contacts') return '/panel/contactos';
        if (answers.firstTask === 'load_inventory') return '/panel/publicaciones?tab=listings';
        if (answers.firstTask === 'publish_vehicle') return '/panel/publicar';
        return answers.firstTask === 'sell_products' ? '/panel/publicar?op=product' : '/panel/publicar';
    }
    if (vertical === 'agenda') {
        if (answers.firstTask === 'set_availability') return '/panel/mi-negocio/agenda#horario';
        if (answers.firstTask === 'share_booking_link') return '/panel/mi-negocio/apariencia';
        if (answers.firstTask === 'configure_services') return '/panel/mis-servicios';
        return '/panel';
    }
    if (answers.firstTask === 'request_serenata') return '/mariachis';
    if (answers.firstTask === 'complete_musician_profile') return '/panel/mi-cuenta?account_tab=musician';
    return '/panel/mi-negocio';
}

export function PostRegistrationRoleWizardGate({
    vertical,
    enabled,
    children,
    onSerenatasRoleSelected,
}: {
    vertical: WorkspaceVertical;
    enabled: boolean;
    children: ReactNode;
    onSerenatasRoleSelected?: (role: 'client' | 'musician' | 'owner') => boolean;
}) {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>(enabled ? 'loading' : 'normal');
    const [wizardState, setWizardState] = useState<VerticalOnboardingState | null>(null);
    const [workspaceState, setWorkspaceState] = useState<AccountWorkspaceState | null>(null);
    const [accountId, setAccountId] = useState('');
    const [isPersonalAccount, setIsPersonalAccount] = useState<boolean | null>(null);
    const [ownedBusinessWorkspaceNames, setOwnedBusinessWorkspaceNames] = useState<string[]>([]);
    const [bannerError, setBannerError] = useState<string | null>(null);
    const [resumingWizard, setResumingWizard] = useState(false);
    const deferredResumePromptRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        setMode('loading');
        setBannerError(null);
        try {
            const accountContext = vertical === 'serenatas' ? null : await fetchCurrentAccountContext();
            const [nextWizard, nextWorkspace] = await Promise.all([
                fetchVerticalOnboarding(vertical),
                vertical === 'serenatas' ? Promise.resolve(null) : fetchAccountWorkspace(vertical),
            ]);
            if (!nextWizard || (vertical !== 'serenatas' && !accountContext)) {
                setMode('error');
                return;
            }
            setWizardState(nextWizard);
            setWorkspaceState(nextWorkspace);
            setAccountId(accountContext?.account?.id ?? nextWorkspace?.workspace?.accountId ?? '');
            setIsPersonalAccount(accountContext?.account?.isPersonal ?? null);
            setOwnedBusinessWorkspaceNames((accountContext?.memberships ?? [])
                .filter((membership) => membership.role === 'owner' && membership.account?.isPersonal === false)
                .map((membership) => membership.account?.name ?? '')
                .filter(Boolean));
            if (vertical !== 'serenatas' && !nextWizard.canManage) {
                markLegacyWorkspaceReady(vertical, accountContext?.account?.id ?? nextWorkspace?.workspace?.accountId ?? '');
                setMode('normal');
                return;
            }
            if (!nextWizard.shouldShow) {
                setMode(nextWizard.status === 'deferred' ? 'deferred' : 'normal');
            } else {
                setMode('wizard');
            }
        } catch {
            setMode('error');
        }
    }, [vertical]);

    useEffect(() => {
        if (enabled) void load();
    }, [enabled, load]);

    useEffect(() => {
        if (mode !== 'deferred') return;
        deferredResumePromptRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }, [mode]);

    async function saveProgress(status: 'in_progress' | 'deferred' | 'completed', step: number, answers: PostRegistrationWizardAnswers) {
        return saveVerticalOnboarding(vertical, { status, step, answers });
    }

    async function completeWizard(answers: PostRegistrationWizardAnswers) {
        if (vertical !== 'serenatas') {
            if (!answers.accountKind || !answers.operatorSubtype) {
                return { ok: false, error: 'Completa tu forma de trabajar y actividad antes de continuar.' };
            }
            if (isPersonalAccount === null) return { ok: false, error: 'No pudimos confirmar tu espacio. Recarga para intentarlo de nuevo.' };
            const savedWorkspace = await saveAccountWorkspace(vertical, {
                accountKind: answers.accountKind,
                operatorSubtype: answers.operatorSubtype,
                operatorSubtypeCustom: answers.operatorSubtypeCustom ?? '',
            }, answers.accountKind === 'company' ? answers.companyName : undefined);
            if (!savedWorkspace.ok) return { ok: false, error: savedWorkspace.error };
            setWorkspaceState({
                workspace: savedWorkspace.workspace ?? null,
                accountName: savedWorkspace.accountName,
                canManage: savedWorkspace.canManage ?? true,
                memberRole: savedWorkspace.memberRole ?? null,
            });
            const savedProgress = await saveProgress('completed', 2, answers);
            if (!savedProgress.ok) return savedProgress;
            setWizardState((current) => current ? { ...current, status: 'completed', shouldShow: false, step: 2, answers } : current);
            setMode('normal');
            dismissLegacyFirstTaskPrompt(vertical, savedWorkspace.workspace?.accountId ?? accountId, answers);
            announceMarketplaceWorkspaceReady();
            router.push(firstTaskHref(vertical, answers));
            router.refresh();
            return { ok: true };
        }

        if (!answers.serenataRole) return { ok: false, error: 'Elige cómo quieres empezar en SimpleSerenatas.' };
        const savedProgress = await saveProgress('completed', 1, answers);
        if (!savedProgress.ok) return savedProgress;
        const selectedRoleExists = onSerenatasRoleSelected?.(answers.serenataRole) ?? true;
        setWizardState((current) => current ? { ...current, status: 'completed', shouldShow: false, step: 1, answers } : current);
        setMode('normal');
        router.push(selectedRoleExists ? firstTaskHref(vertical, answers) : `/panel?setup_serenata_role=${answers.serenataRole}`);
        router.refresh();
        return { ok: true };
    }

    async function deferWizard(step: number, answers: PostRegistrationWizardAnswers) {
        const result = await saveProgress('deferred', step, answers);
        if (!result.ok) return result;
        setWizardState((current) => current ? { ...current, status: 'deferred', shouldShow: false, step, answers } : current);
        markLegacyWorkspaceReady(vertical, accountId);
        dismissLegacyFirstTaskPrompt(vertical, accountId, answers);
        announceMarketplaceWorkspaceReady();
        setMode('deferred');
        return { ok: true };
    }

    async function resumeWizard() {
        if (resumingWizard) return;
        setResumingWizard(true);
        const step = wizardState?.step ?? 0;
        const answers = (wizardState?.answers ?? {}) as PostRegistrationWizardAnswers;
        setBannerError(null);
        try {
            const result = await saveProgress('in_progress', step, answers);
            if (!result.ok) {
                setBannerError(result.error ?? 'No pudimos reabrir la configuración.');
                return;
            }
            setWizardState((current) => current ? { ...current, status: 'in_progress', shouldShow: true } : current);
            setMode('wizard');
        } catch {
            setBannerError('No pudimos reabrir la configuración. Inténtalo nuevamente.');
        } finally {
            setResumingWizard(false);
        }
    }

    if (!enabled || mode === 'normal') return <>{children}</>;

    if (mode === 'loading') {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center text-center" role="status" aria-live="polite">
                <BrandLogo appId={`simple${vertical}` as 'simplepropiedades' | 'simpleautos' | 'simpleagenda' | 'simpleserenatas'} size="sm" className="mb-5" />
                <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] motion-reduce:animate-none" />
                <p className="mt-4 text-sm" style={{ color: 'var(--fg-muted)' }}>Preparando tu espacio…</p>
            </div>
        );
    }

    if (mode === 'error') {
        return (
            <div className="mx-auto max-w-3xl space-y-4 py-8">
                {children}
                <div role="alert">
                    <PanelNotice tone="warning">
                        No pudimos comprobar si ya preparaste este espacio. Puedes seguir usando Simple y volver a cargar cuando quieras.
                    </PanelNotice>
                </div>
                <div className="flex justify-end"><PanelButton type="button" variant="secondary" onClick={() => void load()}>Volver a comprobar</PanelButton></div>
            </div>
        );
    }

    if (mode === 'deferred') {
        return (
            <div className="space-y-4">
                {children}
                <div ref={deferredResumePromptRef}>
                    <PanelCard size="md" className="flex flex-wrap items-center justify-between gap-4 border">
                        <div>
                            <p className="font-semibold" style={{ color: 'var(--fg)' }}>Tu espacio está listo para completar</p>
                            <p className="mt-1 text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>Cuando quieras, te ayudamos a elegir el punto de partida que mejor se adapta a ti.</p>
                            {bannerError ? <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--danger)' }}>{bannerError}</p> : null}
                        </div>
                        <PanelButton type="button" variant="secondary" loading={resumingWizard} onClick={() => void resumeWizard()}>Continuar configuración</PanelButton>
                    </PanelCard>
                </div>
            </div>
        );
    }

    return (
        <PostRegistrationRoleWizard
            vertical={vertical}
            initialStep={wizardState?.step ?? 0}
            initialAnswers={wizardState?.answers}
            initialAccountKind={workspaceState?.workspace?.accountKind ?? null}
            initialSubtype={workspaceState?.workspace?.operatorSubtype}
            initialSubtypeCustom={workspaceState?.workspace?.operatorSubtypeCustom}
            initialAccountName={workspaceState?.accountName}
            isPersonalAccount={isPersonalAccount}
            existingBusinessWorkspaceNames={ownedBusinessWorkspaceNames}
            onProgress={(step, answers) => saveProgress('in_progress', step, answers)}
            onComplete={completeWizard}
            onDefer={deferWizard}
        />
    );
}

function markLegacyWorkspaceReady(vertical: WorkspaceVertical, accountId: string): void {
    if (!accountId || (vertical !== 'propiedades' && vertical !== 'autos')) return;
    try {
        window.sessionStorage.setItem(`${vertical === 'propiedades' ? 'simplepropiedades' : 'simpleautos'}:workspace-setup-dismissed-session:${accountId}`, '1');
    } catch {
        // El wizard sigue disponible aunque el navegador no guarde la preferencia de sesión.
    }
}

function dismissLegacyFirstTaskPrompt(
    vertical: WorkspaceVertical,
    accountId: string,
    answers: PostRegistrationWizardAnswers,
): void {
    if (!accountId || (vertical !== 'propiedades' && vertical !== 'autos')) return;
    const prefix = vertical === 'propiedades'
        ? 'simplepropiedades-panel-intent-dismissed-v1'
        : 'simpleautos-panel-intent-dismissed-v1';
    const activityKey = answers.operatorSubtype?.trim() || 'default';
    try {
        window.localStorage.setItem(`${prefix}:${accountId}`, '1');
        window.localStorage.setItem(`${prefix}:${accountId}:${activityKey}`, '1');
    } catch {
        // El primer paso igualmente queda seleccionado y se abre a continuación.
    }
}
