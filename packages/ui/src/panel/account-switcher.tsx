'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { IconBuildingStore, IconChevronDown, IconPlus } from '@tabler/icons-react';
import { createBusinessWorkspace, fetchCurrentAccountContext, switchCurrentAccount, type AccountMembership, type SimpleAccount } from '@simple/utils';

type CurrentAccountContext = NonNullable<Awaited<ReturnType<typeof fetchCurrentAccountContext>>>;

export function PanelAccountSwitcher({
    userId,
    onContextLoaded,
}: {
    userId?: string;
    onContextLoaded?: (context: CurrentAccountContext) => void;
}) {
    const requestUserIdRef = useRef(userId);
    const [account, setAccount] = useState<SimpleAccount | null>(null);
    const [memberships, setMemberships] = useState<AccountMembership[]>([]);
    const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');

    const load = useCallback(async () => {
        if (!userId) {
            setAccount(null);
            setMemberships([]);
            setLoadedForUserId(null);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const context = await fetchCurrentAccountContext();
            if (requestUserIdRef.current !== userId) return;
            if (!context) {
                setAccount(null);
                setMemberships([]);
                setLoadedForUserId(userId);
                setError('No pudimos cargar tu espacio. Revisa tu conexión e inténtalo nuevamente.');
                return;
            }
            setAccount(context.account);
            setMemberships(context.memberships);
            setLoadedForUserId(userId);
            onContextLoaded?.(context);
        } catch {
            if (requestUserIdRef.current !== userId) return;
            setAccount(null);
            setMemberships([]);
            setLoadedForUserId(userId);
            setError('No pudimos cargar tu espacio. Revisa tu conexión e inténtalo nuevamente.');
        } finally {
            if (requestUserIdRef.current === userId) setLoading(false);
        }
    }, [onContextLoaded, userId]);

    useEffect(() => { requestUserIdRef.current = userId; }, [userId]);
    useEffect(() => { void load(); }, [load]);

    // Don't briefly render another person's workspace after an auth-session change.
    if (loadedForUserId !== (userId ?? null)) return null;

    async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = newWorkspaceName.trim();
        if (!name) {
            setError('Escribe un nombre para el espacio.');
            return;
        }
        setSaving(true);
        setError(null);
        const result = await createBusinessWorkspace(name);
        setSaving(false);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        window.location.reload();
    }

    if (loading && !account) return null;
    if (!account || memberships.length === 0) {
        if (!error) return null;
        return (
            <div className="container-app flex items-center justify-end gap-3 py-2" role="status" aria-live="polite">
                <p className="text-xs" style={{ color: 'var(--danger, #b42318)' }}>{error}</p>
                <button
                    type="button"
                    className="shrink-0 text-xs font-semibold underline underline-offset-2"
                    style={{ color: 'var(--fg)' }}
                    onClick={() => void load()}
                >
                    Reintentar
                </button>
            </div>
        );
    }
    const canSwitch = memberships.length > 1;
    const hasBusinessWorkspace = memberships.some((membership) => membership.account && !membership.account.isPersonal);
    const canCreateWorkspace = account.isPersonal && hasBusinessWorkspace;
    if (memberships.length === 1 && account.isPersonal && !canCreateWorkspace && !error) return null;

    async function handleChange(accountId: string) {
        if (!accountId || accountId === account?.id || saving) return;
        setSaving(true);
        setError(null);
        try {
            const result = await switchCurrentAccount(accountId);
            if (result.ok) {
                window.location.reload();
                return;
            }
            setError(result.error ?? 'No pudimos cambiar el espacio. Inténtalo de nuevo.');
        } catch {
            setError('No pudimos cambiar el espacio. Inténtalo de nuevo.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="container-app flex flex-col items-end gap-2 py-2">
            <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
                <label className="flex max-w-full items-center gap-2 rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <IconBuildingStore size={16} style={{ color: 'var(--fg-muted)' }} aria-hidden="true" />
                    <span className="sr-only">Espacio activo</span>
                    {canSwitch ? (
                        <>
                            <select
                                aria-label="Espacio activo"
                                className="max-w-[min(58vw,320px)] appearance-none bg-transparent text-sm font-medium outline-none"
                                style={{ color: 'var(--fg)' }}
                                value={account.id}
                                disabled={saving}
                                onChange={(event) => void handleChange(event.target.value)}
                            >
                                {memberships.map((membership) => (
                                    <option key={membership.accountId} value={membership.accountId}>
                                        {membership.account?.name ?? 'Espacio de trabajo'}
                                            {membership.account?.isPersonal
                                                ? ' · Personal'
                                                : membership.role === 'owner'
                                                    ? ' · Dueño'
                                                    : membership.role === 'admin'
                                                        ? ' · Administrador'
                                                        : ' · Agente'}
                                    </option>
                                ))}
                            </select>
                            <IconChevronDown size={14} style={{ color: 'var(--fg-muted)' }} aria-hidden="true" />
                        </>
                    ) : (
                        <span className="max-w-[min(58vw,320px)] truncate text-sm font-medium" style={{ color: 'var(--fg)' }}>
                            {account.name}
                        </span>
                    )}
                    {saving ? <span className="sr-only">Cambiando espacio</span> : null}
                </label>
                {canCreateWorkspace ? (
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => {
                            setShowCreateForm((open) => !open);
                            setError(null);
                        }}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-[var(--bg-muted)]"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        <IconPlus size={16} aria-hidden="true" /> Crear espacio
                    </button>
                ) : null}
            </div>
            {showCreateForm ? (
                <form onSubmit={(event) => void handleCreateWorkspace(event)} className="w-full max-w-md space-y-3 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Crear otro espacio</p>
                        <p className="mt-1 text-xs leading-5" style={{ color: 'var(--fg-muted)' }}>Tu cuenta personal y los demás espacios se conservarán. Después podrás elegir su actividad.</p>
                    </div>
                    <label className="block space-y-1.5">
                        <span className="text-xs font-medium" style={{ color: 'var(--fg)' }}>Nombre del espacio</span>
                        <input
                            autoFocus
                            required
                            maxLength={160}
                            value={newWorkspaceName}
                            disabled={saving}
                            onChange={(event) => setNewWorkspaceName(event.target.value)}
                            placeholder="Ej. Corredora del Valle"
                            className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                            style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                        />
                    </label>
                    <div className="flex justify-end gap-2">
                        <button type="button" disabled={saving} onClick={() => setShowCreateForm(false)} className="rounded-lg px-3 py-2 text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Cancelar</button>
                        <button type="submit" disabled={saving || !newWorkspaceName.trim()} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: 'var(--accent)', color: 'var(--on-accent, #fff)' }}>{saving ? 'Creando…' : 'Crear espacio'}</button>
                    </div>
                </form>
            ) : null}
            {error ? <p className="text-xs" style={{ color: 'var(--danger, #b42318)' }}>{error}</p> : null}
        </div>
    );
}
