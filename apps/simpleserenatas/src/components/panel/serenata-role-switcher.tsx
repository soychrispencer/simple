'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { fetchVerticalOnboarding } from '@simple/utils';
import { availableSerenataRoles } from '@/lib/app-mode';
import { useSerenata } from '@/context/serenata-context';
import type { SerenataRole } from '@/lib/app-mode';
import { serenatasApi } from '@/lib/serenatas-api';
import { PanelButton, PanelNotice } from '@simple/ui/panel';

const ROLE_LABELS = {
    client: 'Cliente',
    musician: 'Músico',
    owner: 'Proveedor',
} as const;

export function SerenataRoleSwitcher() {
    const { profiles, activeRole, setActiveRole, refresh, loadState } = useSerenata();
    const router = useRouter();
    const pathname = usePathname() ?? '/panel';
    const roles = availableSerenataRoles(profiles);
    const missingRoles = (['client', 'musician', 'owner'] as const).filter((role) => !roles.includes(role));
    const [creatingRole, setCreatingRole] = useState<SerenataRole | null>(null);
    const [setupIntentRole, setSetupIntentRole] = useState<SerenataRole | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (loadState !== 'ready') return;
        const params = new URLSearchParams(window.location.search);
        const requestedRole = params.get('setup_serenata_role');
        if (requestedRole !== 'client' && requestedRole !== 'musician' && requestedRole !== 'owner') return;

        params.delete('setup_serenata_role');
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });

        let cancelled = false;
        void fetchVerticalOnboarding('serenatas').then((onboarding) => {
            if (
                cancelled
                || onboarding?.status !== 'completed'
                || onboarding.shouldShow
                || onboarding.answers.serenataRole !== requestedRole
            ) return;
            if (profiles[requestedRole]) {
                setActiveRole(requestedRole);
                setSetupIntentRole(null);
                return;
            }
            setSetupIntentRole(requestedRole);
        }).catch(() => {
            if (!cancelled) setError('No pudimos confirmar tu elección. Recarga el panel para continuar.');
        });
        return () => { cancelled = true; };
    }, [loadState, pathname, profiles, router, setActiveRole]);

    useEffect(() => {
        if (setupIntentRole && profiles[setupIntentRole]) setSetupIntentRole(null);
    }, [profiles, setupIntentRole]);

    const createProfile = async (role: SerenataRole) => {
        const continuingWizardTask = setupIntentRole === role;
        setError(null);
        setCreatingRole(role);
        try {
            const response = role === 'client'
                ? await serenatasApi.saveClientProfile({})
                : role === 'musician'
                    ? await serenatasApi.saveMusicianProfile({ hasInstrument: false, hasMariachiAttire: false })
                    : await serenatasApi.registerOwner();
            if (!response.ok) {
                setError(response.error ?? 'No pudimos crear el perfil. Intenta nuevamente.');
                return;
            }
            setActiveRole(role);
            setSetupIntentRole(null);
            try {
                await refresh();
            } catch {
                // La recarga automática de perfiles puede terminar después del cambio de pantalla.
            }
            router.replace(
                role === 'owner'
                    ? '/panel/mi-negocio'
                    : role === 'musician'
                        ? '/panel/mi-cuenta?account_tab=musician'
                        : continuingWizardTask
                            ? '/mariachis'
                            : '/panel/mi-cuenta?account_tab=data',
            );
        } catch {
            setError('No pudimos crear el perfil. Intenta nuevamente.');
        } finally {
            setCreatingRole(null);
        }
    };

    const handleRoleChange = async (value: string) => {
        setError(null);
        if (value.startsWith('create:')) {
            const role = value.slice('create:'.length) as SerenataRole;
            await createProfile(role);
            return;
        }

        const role = value as SerenataRole;
        if (!roles.includes(role)) return;
        setActiveRole(role);
        router.replace('/panel');
    };

    return (
        <div className="container-app flex flex-col items-end gap-2 pt-3">
            {setupIntentRole ? (
                <PanelNotice className="w-full">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm font-semibold">Elegiste trabajar como {ROLE_LABELS[setupIntentRole]}.</p>
                            <p className="mt-1 text-sm">Crea ese perfil para continuar. Esto no activa un plan ni genera cobros.</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <PanelButton size="sm" disabled={creatingRole !== null} onClick={() => void createProfile(setupIntentRole)}>
                                {creatingRole === setupIntentRole ? 'Creando…' : `Crear perfil de ${ROLE_LABELS[setupIntentRole].toLowerCase()}`}
                            </PanelButton>
                            <PanelButton variant="secondary" size="sm" disabled={creatingRole !== null} onClick={() => setSetupIntentRole(null)}>
                                Ahora no
                            </PanelButton>
                        </div>
                    </div>
                </PanelNotice>
            ) : null}
            <label className="inline-flex max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <span className="shrink-0 text-xs" style={{ color: 'var(--fg-muted)' }}>
                    {roles.length > 0 ? 'Trabajando como' : 'Empieza con'}
                </span>
                <select
                    aria-label={roles.length > 0 ? 'Cambiar perfil activo' : 'Elegir perfil de SimpleSerenatas'}
                    value={roles.includes(activeRole) ? activeRole : ''}
                    disabled={creatingRole != null}
                    onChange={(event) => void handleRoleChange(event.target.value)}
                    className="h-8 max-w-56 cursor-pointer rounded-lg border-0 bg-transparent px-1 text-sm font-medium outline-none disabled:opacity-60"
                    style={{ color: 'var(--fg)' }}
                >
                    <option value="" disabled>{roles.length > 0 ? 'Seleccionar perfil' : 'Elige un perfil'}</option>
                    {roles.length > 0 ? (
                        <optgroup label="Tus perfiles">
                            {roles.map((role) => (
                                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                            ))}
                        </optgroup>
                    ) : null}
                    {missingRoles.length > 0 ? (
                        <optgroup label={roles.length > 0 ? 'Agregar perfil' : 'Crear perfil'}>
                            {missingRoles.map((role) => (
                                <option key={role} value={`create:${role}`}>
                                    {creatingRole === role ? 'Creando…' : `Crear perfil: ${ROLE_LABELS[role]}`}
                                </option>
                            ))}
                        </optgroup>
                    ) : null}
                </select>
            </label>
            {error ? <p role="alert" className="max-w-full text-right text-xs text-(--danger)">{error}</p> : null}
        </div>
    );
}
