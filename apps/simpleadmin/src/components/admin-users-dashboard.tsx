'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { IconChevronLeft, IconChevronRight, IconMail, IconRefresh, IconSearch, IconUserCheck, IconUsers } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import {
    PanelButton,
    PanelConfirmDialog,
    PanelEmptyState,
    PanelIconButton,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelNotice,
    PanelPageHeader,
    PanelStatCard,
    PanelStatusBadge,
    SkeletonList,
} from '@simple/ui/panel';
import {
    deleteAdminUser,
    fetchAdminUsers,
    updateSerenatasProfile,
    type AdminSessionUser,
    type AdminUsersPage,
    type AdminUserSnapshot,
} from '@/lib/api';
import { EditUserDialog, EmailUserDialog, SubscriptionsDialog } from './users/user-dialogs';
import { UserAvatar, UserDetailSheet } from './users/user-detail-sheet';
import {
    activitySummary,
    capabilitiesFor,
    platformSummary,
    roleLabel,
    STATUS_OPTIONS,
    statusLabel,
    statusTone,
    VERTICAL_OPTIONS,
    verticalLabel,
    type SerenatasProfile,
    type StatusFilter,
    type VerticalFilter,
} from './users/user-domain';

type ModalState =
    | { type: 'edit'; user: AdminUserSnapshot }
    | { type: 'email'; user?: AdminUserSnapshot; userIds?: string[] }
    | { type: 'subscriptions'; user: AdminUserSnapshot }
    | { type: 'delete'; user: AdminUserSnapshot }
    | { type: 'serenatas'; user: AdminUserSnapshot; profile: SerenatasProfile }
    | null;

const EMPTY_PAGE: AdminUsersPage = {
    items: [],
    summary: { total: 0, withPlatform: 0, withActiveSubscription: 0, suspended: 0 },
    page: 1,
    pageSize: 25,
    total: 0,
    pageCount: 1,
};

export function AdminUsersDashboard({ currentUser }: { currentUser: AdminSessionUser }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const capabilities = useMemo(() => capabilitiesFor(currentUser), [currentUser]);
    const [result, setResult] = useState<AdminUsersPage>(EMPTY_PAGE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const deferredQuery = useDeferredValue(query);
    const [status, setStatus] = useState<StatusFilter>('all');
    const [page, setPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState<AdminUserSnapshot | null>(null);
    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [modal, setModal] = useState<ModalState>(null);
    const [confirming, setConfirming] = useState(false);

    const vertical = useMemo<VerticalFilter>(() => {
        const raw = searchParams.get('vertical');
        return raw === 'agenda' || raw === 'autos' || raw === 'propiedades' || raw === 'serenatas' ? raw : 'all';
    }, [searchParams]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchAdminUsers({ query: deferredQuery, status, vertical, page, pageSize: 25 });
            setResult(data);
            if (data.page !== page) setPage(data.page);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    }, [deferredQuery, page, status, vertical]);

    useEffect(() => { void loadUsers(); }, [loadUsers]);
    useEffect(() => { setCheckedIds([]); }, [deferredQuery, page, status, vertical]);

    const setVertical = (value: string) => {
        const next = value as VerticalFilter;
        const params = new URLSearchParams(searchParams.toString());
        if (next === 'all') params.delete('vertical'); else params.set('vertical', next);
        setPage(1);
        router.replace(params.size ? `/?${params.toString()}` : '/');
    };

    const allVisibleChecked = result.items.length > 0 && result.items.every((user) => checkedIds.includes(user.id));
    const toggleAll = () => setCheckedIds(allVisibleChecked ? [] : result.items.map((user) => user.id));
    const toggleChecked = (userId: string) => setCheckedIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);

    const completeAction = async () => {
        setModal(null);
        setSelectedUser(null);
        setCheckedIds([]);
        await loadUsers();
    };

    const confirmDestructiveAction = async () => {
        if (!modal || (modal.type !== 'delete' && modal.type !== 'serenatas')) return;
        setConfirming(true);
        setError('');
        try {
            if (modal.type === 'delete') await deleteAdminUser(modal.user.id);
            else await updateSerenatasProfile(modal.user.id, { profileType: modal.profile, note: 'Ajustado desde SimpleAdmin.' });
            await completeAction();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo completar la operación.');
            setModal(null);
        } finally {
            setConfirming(false);
        }
    };

    return (
        <div className="container-app panel-page py-6">
            <PanelPageHeader
                title="Usuarios"
                description="Cuentas y accesos del ecosistema Simple."
                actions={<PanelButton variant="secondary" onClick={() => void loadUsers()} disabled={loading}><IconRefresh size={16} /> Actualizar</PanelButton>}
            />

            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_210px]">
                <label className="relative">
                    <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" size={17} />
                    <input className="form-input pl-10" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar nombre, correo o plataforma" aria-label="Buscar usuarios" />
                </label>
                <ModernSelect value={vertical} onChange={setVertical} options={VERTICAL_OPTIONS} ariaLabel="Filtrar por plataforma" />
                <ModernSelect value={status} onChange={(value) => { setStatus(value as StatusFilter); setPage(1); }} options={STATUS_OPTIONS} ariaLabel="Filtrar por estado" />
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <PanelStatCard label="Usuarios" value={String(result.summary.total)} meta={vertical === 'all' ? 'En todas las plataformas' : verticalLabel(vertical)} icon={<IconUsers size={17} />} />
                <PanelStatCard label="Con plataforma" value={String(result.summary.withPlatform)} meta="Acceso activo" icon={<IconUserCheck size={17} />} />
                <PanelStatCard label="Suscripción activa" value={String(result.summary.withActiveSubscription)} meta={result.summary.suspended ? `${result.summary.suspended} suspendidos` : 'Sin suspendidos'} />
            </div>

            {checkedIds.length > 0 ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-y border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3">
                    <p className="text-sm font-medium text-[var(--fg)]">{checkedIds.length} seleccionados</p>
                    <div className="flex gap-2">
                        <PanelButton size="sm" variant="secondary" onClick={() => setCheckedIds([])}>Limpiar</PanelButton>
                        {capabilities.sendEmail ? <PanelButton size="sm" onClick={() => setModal({ type: 'email', userIds: checkedIds })}><IconMail size={15} /> Enviar correo</PanelButton> : null}
                    </div>
                </div>
            ) : null}

            {error ? <PanelNotice tone="error" className="mb-4">{error}</PanelNotice> : null}

            <PanelList>
                <PanelListHeader className="grid-cols-[36px_minmax(250px,1.35fr)_minmax(180px,0.9fr)_minmax(180px,0.9fr)_44px]">
                    <input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} aria-label="Seleccionar usuarios visibles" className="h-4 w-4 accent-[var(--fg)]" />
                    <span>Usuario</span>
                    <span>Plataforma</span>
                    <span>Actividad</span>
                    <span />
                </PanelListHeader>

                {loading ? (
                    <PanelListRow className="p-0"><SkeletonList count={5} /></PanelListRow>
                ) : result.items.length === 0 ? (
                    <PanelListRow className="p-5"><PanelEmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." /></PanelListRow>
                ) : result.items.map((user) => (
                    <PanelListRow key={user.id} className="grid gap-3 p-4 md:grid-cols-[36px_minmax(250px,1.35fr)_minmax(180px,0.9fr)_minmax(180px,0.9fr)_44px] md:items-center">
                        <input type="checkbox" checked={checkedIds.includes(user.id)} onChange={() => toggleChecked(user.id)} aria-label={`Seleccionar ${user.name}`} className="h-4 w-4 accent-[var(--fg)]" />
                        <button type="button" onClick={() => setSelectedUser(user)} className="flex min-w-0 items-center gap-3 text-left">
                            <UserAvatar user={user} />
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-[var(--fg)]">{user.name}</span>
                                <span className="block truncate text-sm text-[var(--fg-muted)]">{user.email}</span>
                                <span className="mt-1.5 flex flex-wrap gap-1.5">
                                    <PanelStatusBadge label={roleLabel(user.role)} />
                                    <PanelStatusBadge label={statusLabel(user.status)} tone={statusTone(user.status)} />
                                </span>
                            </span>
                        </button>
                        <div>
                            <p className="text-sm font-medium text-[var(--fg)]">{user.primaryPlatform?.label ?? verticalLabel(user.likelySignupVertical)}</p>
                            <p className="line-clamp-1 text-xs text-[var(--fg-muted)]">{platformSummary(user)}</p>
                        </div>
                        <p className="text-xs text-[var(--fg-muted)]">{activitySummary(user)}</p>
                        <PanelIconButton label={`Ver ${user.name}`} onClick={() => setSelectedUser(user)} variant="soft"><IconChevronRight size={16} /></PanelIconButton>
                    </PanelListRow>
                ))}
            </PanelList>

            <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--fg-muted)]">Página {result.page} de {result.pageCount}</p>
                <div className="flex gap-2">
                    <PanelIconButton label="Página anterior" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={result.page <= 1 || loading} variant="soft"><IconChevronLeft size={16} /></PanelIconButton>
                    <PanelIconButton label="Página siguiente" onClick={() => setPage((current) => Math.min(result.pageCount, current + 1))} disabled={result.page >= result.pageCount || loading} variant="soft"><IconChevronRight size={16} /></PanelIconButton>
                </div>
            </div>

            {selectedUser ? (
                <UserDetailSheet
                    user={selectedUser}
                    capabilities={{ ...capabilities, deleteUsers: capabilities.deleteUsers && selectedUser.id !== currentUser.id }}
                    onClose={() => setSelectedUser(null)}
                    onEdit={() => { setSelectedUser(null); setModal({ type: 'edit', user: selectedUser }); }}
                    onEmail={() => { setSelectedUser(null); setModal({ type: 'email', user: selectedUser }); }}
                    onSubscriptions={() => { setSelectedUser(null); setModal({ type: 'subscriptions', user: selectedUser }); }}
                    onDelete={() => { setSelectedUser(null); setModal({ type: 'delete', user: selectedUser }); }}
                    onSerenatasProfile={(profile) => { setSelectedUser(null); setModal({ type: 'serenatas', user: selectedUser, profile }); }}
                />
            ) : null}

            {modal?.type === 'edit' ? <EditUserDialog user={modal.user} currentUserId={currentUser.id} onClose={() => setModal(null)} onCompleted={() => void completeAction()} /> : null}
            {modal?.type === 'email' ? <EmailUserDialog user={modal.user} userIds={modal.userIds} onClose={() => setModal(null)} onCompleted={() => void completeAction()} /> : null}
            {modal?.type === 'subscriptions' ? <SubscriptionsDialog user={modal.user} onClose={() => setModal(null)} onCompleted={() => void completeAction()} /> : null}

            <PanelConfirmDialog
                open={modal?.type === 'delete'}
                title="Eliminar usuario"
                message={modal?.type === 'delete' ? `Eliminarás permanentemente a ${modal.user.name}.` : ''}
                confirmLabel="Eliminar"
                tone="danger"
                busy={confirming}
                onClose={() => setModal(null)}
                onConfirm={() => void confirmDestructiveAction()}
            />
            <PanelConfirmDialog
                open={modal?.type === 'serenatas'}
                title="Cambiar perfil de Serenatas"
                message={modal?.type === 'serenatas' ? `Cambiarás el perfil de ${modal.user.name} a ${modal.profile}.` : ''}
                confirmLabel="Confirmar"
                busy={confirming}
                onClose={() => setModal(null)}
                onConfirm={() => void confirmDestructiveAction()}
            />
        </div>
    );
}
