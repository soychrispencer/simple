'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { availableSerenataRoles } from '@/lib/app-mode';
import { useSerenata } from '@/context/serenata-context';
import type { SerenataRole } from '@/lib/app-mode';
import { serenatasApi } from '@/lib/serenatas-api';

const ROLE_LABELS = {
    client: 'Cliente',
    musician: 'Músico',
    owner: 'Proveedor',
} as const;

export function SerenataRoleSwitcher() {
    const { profiles, activeRole, setActiveRole, refresh } = useSerenata();
    const router = useRouter();
    const roles = availableSerenataRoles(profiles);
    const missingRoles = (['client', 'musician', 'owner'] as const).filter((role) => !roles.includes(role));
    const [creatingRole, setCreatingRole] = useState<SerenataRole | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRoleChange = async (value: string) => {
        setError(null);
        if (value.startsWith('create:')) {
            const role = value.slice('create:'.length) as SerenataRole;
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
                            : '/panel/mi-cuenta?account_tab=data',
                );
            } catch {
                setError('No pudimos crear el perfil. Intenta nuevamente.');
            } finally {
                setCreatingRole(null);
            }
            return;
        }

        const role = value as SerenataRole;
        if (!roles.includes(role)) return;
        setActiveRole(role);
        router.replace('/panel');
    };

    return (
        <div className="container-app flex flex-col items-end gap-1 pt-3">
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
