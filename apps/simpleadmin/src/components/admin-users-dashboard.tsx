'use client';

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    IconChevronLeft,
    IconChevronRight,
    IconCreditCard,
    IconMail,
    IconRefresh,
    IconSearch,
    IconUserCheck,
    IconUsers,
} from '@tabler/icons-react';
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
    updateAdminUserStatus,
    updateSerenatasProfile,
    type AdminSessionUser,
    type AdminUserStatus,
    type AdminUsersPage,
    type AdminUserSnapshot,
} from '@/lib/api';
import { EditUserDialog, EmailUserDialog, SubscriptionsDialog } from './users/user-dialogs';
import { UserAvatar, UserDetailSheet } from './users/user-detail-sheet';
import {
    activitySummary,
    capabilitiesFor,
    PLAN_FILTER_OPTIONS,
    platformSummary,
    primaryPlanBadge,
    roleLabel,
    SERENATAS_PROFILE_OPTIONS,
    STATUS_OPTIONS,
    statusLabel,
    statusTone,
    VERTICAL_OPTIONS,
    verticalLabel,
    type PlanFilter,
    type SerenatasProfile,
    type StatusFilter,
    type VerticalFilter,
} from './users/user-domain';

type ModalState =
    | { type: 'edit'; user: AdminUserSnapshot }
    | { type: 'email'; user?: AdminUserSnapshot; userIds?: string[] }
    | { type: 'subscriptions'; user: AdminUserSnapshot }
    | { type: 'delete'; user: AdminUserSnapshot }
    | { type: 'status'; user: AdminUserSnapshot; nextStatus: AdminUserStatus }
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
    const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
    const deferredQuery = useDeferredValue(query);
    const [status, setStatus] = useState<StatusFilter>(() => {
        const raw = searchParams.get('status');
        return raw === 'verified' || raw === 'active' || raw === 'suspended' ? raw : 'all';
    });
    const [plan, setPlan] = useState<PlanFilter>(() => {
        const raw = searchParams.get('plan');
        return raw === 'paid' || raw === 'trial' || raw === 'free' ? raw : 'all';
    });
    const [page, setPage] = useState(() => {
        const raw = Number(searchParams.get('page') ?? 1);
        return Number.isFinite(raw) && raw >= 1 ? Math.trunc(raw) : 1;
    });
    const [selectedUserId, setSelectedUserId] = useState<string | null>(() => searchParams.get('user'));
    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [modal, setModal] = useState<ModalState>(null);
    const [confirming, setConfirming] = useState(false);

    const vertical = useMemo<VerticalFilter>(() => {
        const raw = searchParams.get('vertical');
        return raw === 'agenda' || raw === 'autos' || raw === 'propiedades' || raw === 'serenatas' ? raw : 'all';
    }, [searchParams]);

    const selectedUser = useMemo(
        () => result.items.find((item) => item.id === selectedUserId) ?? null,
        [result.items, selectedUserId],
    );

    const syncUrlParams = useCallback((patch: {
        q?: string;
        vertical?: VerticalFilter;
        status?: StatusFilter;
        plan?: PlanFilter;
        page?: number;
        user?: string | null;
    }) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextQ = patch.q ?? query;
        const nextVertical = patch.vertical ?? vertical;
        const nextStatus = patch.status ?? status;
        const nextPlan = patch.plan ?? plan;
        const nextPage = patch.page ?? page;
        const nextUser = patch.user === undefined ? selectedUserId : patch.user;

        if (nextQ.trim()) params.set('q', nextQ.trim()); else params.delete('q');
        if (nextVertical !== 'all') params.set('vertical', nextVertical); else params.delete('vertical');
        if (nextStatus !== 'all') params.set('status', nextStatus); else params.delete('status');
        if (nextPlan !== 'all') params.set('plan', nextPlan); else params.delete('plan');
        if (nextPage > 1) params.set('page', String(nextPage)); else params.delete('page');
        if (nextUser) params.set('user', nextUser); else params.delete('user');
        router.replace(params.size ? `/?${params.toString()}` : '/');
    }, [page, plan, query, router, searchParams, selectedUserId, status, vertical]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fetchAdminUsers({ query: deferredQuery, status, vertical, plan, page, pageSize: 25 });
            setResult(data);
            if (data.page !== page) setPage(data.page);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    }, [deferredQuery, page, plan, status, vertical]);

    useEffect(() => { void loadUsers(); }, [loadUsers]);
    useEffect(() => { setCheckedIds([]); }, [deferredQuery, page, plan, status, vertical]);

    const setVertical = (value: string) => {
        const next = value as VerticalFilter;
        setPage(1);
        syncUrlParams({ vertical: next, page: 1 });
    };

    const allVisibleChecked = result.items.length > 0 && result.items.every((user) => checkedIds.includes(user.id));
    const toggleAll = () => setCheckedIds(allVisibleChecked ? [] : result.items.map((user) => user.id));
    const toggleChecked = (userId: string) => setCheckedIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);

    const completeAction = async (closeSheet = false) => {
        setModal(null);
        if (closeSheet) {
            setSelectedUserId(null);
            syncUrlParams({ user: null });
        }
        setCheckedIds([]);
        await loadUsers();
    };

    const confirmAdminAction = async () => {
        if (!modal || (modal.type !== 'delete' && modal.type !== 'serenatas' && modal.type !== 'status')) return;
        setConfirming(true);
        setError('');
        try {
            if (modal.type === 'delete') {
                await deleteAdminUser(modal.user.id);
                await completeAction(true);
                return;
            }
            if (modal.type === 'status') {
                await updateAdminUserStatus(modal.user.id, modal.nextStatus);
                await completeAction(false);
                return;
            }
            await updateSerenatasProfile(modal.user.id, { profileType: modal.profile, note: 'Ajustado desde SimpleAdmin.' });
            await completeAction(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo completar la operación.');
            setModal(null);
        } finally {
            setConfirming(false);
        }
    };

    const openUserSheet = (userId: string) => {
        setSelectedUserId(userId);
        syncUrlParams({ user: userId });
    };

    const closeUserSheet = () => {
        setSelectedUserId(null);
        syncUrlParams({ user: null });
    };

    return (
        <div className="container-app panel-page py-6">
            <PanelPageHeader
                title="Usuarios"
                description="Cuentas, planes y accesos del ecosistema Simple."
                actions={<PanelButton variant="secondary" onClick={() => void loadUsers()} disabled={loading}><IconRefresh size={16} /> Actualizar</PanelButton>}
            />

            <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_190px_175px_185px]">
                <label className="relative">
                    <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" size={17} />
                    <input
                        className="form-input pl-10"
                        value={query}
                        onChange={(event) => {
                            const nextQ = event.target.value;
                            setQuery(nextQ);
                            setPage(1);
                        }}
                        onBlur={() => syncUrlParams({ q: query, page: 1 })}
                        placeholder="Buscar nombre, correo, RUT o slug"
                        aria-label="Buscar usuarios"
                    />
                </label>
                <ModernSelect value={vertical} onChange={setVertical} options={VERTICAL_OPTIONS} ariaLabel="Filtrar por plataforma" />
                <ModernSelect
                    value={status}
                    onChange={(value) => {
                        const nextStatus = value as StatusFilter;
                        setStatus(nextStatus);
                        setPage(1);
                        syncUrlParams({ status: nextStatus, page: 1 });
                    }}
                    options={STATUS_OPTIONS}
                    ariaLabel="Filtrar por estado"
                />
                <ModernSelect
                    value={plan}
                    onChange={(value) => {
                        const nextPlan = value as PlanFilter;
                        setPlan(nextPlan);
                        setPage(1);
                        syncUrlParams({ plan: nextPlan, page: 1 });
                    }}
                    options={PLAN_FILTER_OPTIONS}
                    ariaLabel="Filtrar por plan"
                />
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <PanelStatCard label="Usuarios filtrados" value={String(result.summary.total)} meta={vertical === 'all' ? 'En todas las plataformas' : verticalLabel(vertical)} icon={<IconUsers size={17} />} />
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
                <PanelListHeader className="grid-cols-[36px_minmax(220px,1.2fr)_minmax(150px,0.75fr)_120px_minmax(150px,0.75fr)_110px]">
                    <input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} aria-label="Seleccionar usuarios visibles" className="h-4 w-4 accent-[var(--fg)]" />
                    <span>Usuario</span>
                    <span>Plataforma</span>
                    <span>Plan</span>
                    <span>Actividad</span>
                    <span className="text-right">Acciones</span>
                </PanelListHeader>

                {loading ? (
                    <PanelListRow className="p-0"><SkeletonList count={5} /></PanelListRow>
                ) : result.items.length === 0 ? (
                    <PanelListRow className="p-5"><PanelEmptyState title="Sin resultados" description="Ajusta la búsqueda o los filtros." /></PanelListRow>
                ) : result.items.map((user) => {
                    const planBadge = primaryPlanBadge(user);
                    return (
                        <PanelListRow key={user.id} className="grid gap-3 p-4 md:grid-cols-[36px_minmax(220px,1.2fr)_minmax(150px,0.75fr)_120px_minmax(150px,0.75fr)_110px] md:items-center">
                            <input type="checkbox" checked={checkedIds.includes(user.id)} onChange={() => toggleChecked(user.id)} aria-label={`Seleccionar ${user.name}`} className="h-4 w-4 accent-[var(--fg)]" />
                            <button type="button" onClick={() => openUserSheet(user.id)} className="flex min-w-0 items-center gap-3 text-left">
                                <UserAvatar user={user} />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold text-[var(--fg)]">{user.name}</span>
                                    <span className="block truncate text-xs text-[var(--fg-muted)]">{user.email}</span>
                                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                                        <PanelStatusBadge label={roleLabel(user.role)} />
                                        <PanelStatusBadge label={statusLabel(user.status)} tone={statusTone(user.status)} />
                                    </span>
                                </span>
                            </button>
                            <div>
                                <p className="text-sm font-medium text-[var(--fg)]">{user.primaryPlatform?.label ?? verticalLabel(user.likelySignupVertical)}</p>
                                <p className="line-clamp-1 text-xs text-[var(--fg-muted)]">
                                    {user.agendaProfile?.slug ? `/${user.agendaProfile.slug}` : platformSummary(user)}
                                </p>
                            </div>
                            <div>
                                <PanelStatusBadge label={planBadge.label} tone={planBadge.tone} size="sm" />
                            </div>
                            <p className="text-xs text-[var(--fg-muted)]">{activitySummary(user)}</p>
                            <div className="flex items-center justify-end gap-1">
                                {capabilities.manageSubscriptions ? (
                                    <PanelIconButton
                                        label={`Plan de ${user.name}`}
                                        onClick={() => setModal({ type: 'subscriptions', user })}
                                        variant="soft"
                                    >
                                        <IconCreditCard size={15} />
                                    </PanelIconButton>
                                ) : null}
                                {capabilities.sendEmail ? (
                                    <PanelIconButton
                                        label={`Correo a ${user.name}`}
                                        onClick={() => setModal({ type: 'email', user })}
                                        variant="soft"
                                    >
                                        <IconMail size={15} />
                                    </PanelIconButton>
                                ) : null}
                                <PanelIconButton label={`Ver ${user.name}`} onClick={() => openUserSheet(user.id)} variant="soft">
                                    <IconChevronRight size={15} />
                                </PanelIconButton>
                            </div>
                        </PanelListRow>
                    );
                })}
            </PanelList>

            <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--fg-muted)]">
                    Página {result.page} de {result.pageCount} · {result.total} resultado{result.total === 1 ? '' : 's'}
                </p>
                <div className="flex gap-2">
                    <PanelIconButton
                        label="Página anterior"
                        onClick={() => {
                            const nextPage = Math.max(1, page - 1);
                            setPage(nextPage);
                            syncUrlParams({ page: nextPage });
                        }}
                        disabled={result.page <= 1 || loading}
                        variant="soft"
                    >
                        <IconChevronLeft size={16} />
                    </PanelIconButton>
                    <PanelIconButton
                        label="Página siguiente"
                        onClick={() => {
                            const nextPage = Math.min(result.pageCount, page + 1);
                            setPage(nextPage);
                            syncUrlParams({ page: nextPage });
                        }}
                        disabled={result.page >= result.pageCount || loading}
                        variant="soft"
                    >
                        <IconChevronRight size={16} />
                    </PanelIconButton>
                </div>
            </div>

            {selectedUser ? (
                <UserDetailSheet
                    user={selectedUser}
                    capabilities={{ ...capabilities, deleteUsers: capabilities.deleteUsers && selectedUser.id !== currentUser.id }}
                    onClose={closeUserSheet}
                    onEdit={() => setModal({ type: 'edit', user: selectedUser })}
                    onEmail={() => setModal({ type: 'email', user: selectedUser })}
                    onSubscriptions={() => setModal({ type: 'subscriptions', user: selectedUser })}
                    onToggleStatus={(nextStatus) => setModal({ type: 'status', user: selectedUser, nextStatus })}
                    onDelete={() => setModal({ type: 'delete', user: selectedUser })}
                    onSerenatasProfile={(profile) => setModal({ type: 'serenatas', user: selectedUser, profile })}
                />
            ) : null}

            {modal?.type === 'edit' ? (
                <EditUserDialog
                    user={modal.user}
                    currentUserId={currentUser.id}
                    onClose={() => setModal(null)}
                    onCompleted={() => void completeAction(false)}
                />
            ) : null}
            {modal?.type === 'email' ? (
                <EmailUserDialog
                    user={modal.user}
                    userIds={modal.userIds}
                    onClose={() => setModal(null)}
                    onCompleted={() => void completeAction(false)}
                />
            ) : null}
            {modal?.type === 'subscriptions' ? (
                <SubscriptionsDialog
                    user={modal.user}
                    onClose={() => setModal(null)}
                    onCompleted={() => void completeAction(false)}
                />
            ) : null}

            <PanelConfirmDialog
                open={modal?.type === 'delete'}
                title="Eliminar usuario"
                message={modal?.type === 'delete' ? `Eliminarás permanentemente a ${modal.user.name}.` : ''}
                confirmLabel="Eliminar"
                tone="danger"
                busy={confirming}
                onClose={() => setModal(null)}
                onConfirm={() => void confirmAdminAction()}
            />
            <PanelConfirmDialog
                open={modal?.type === 'status'}
                title={modal?.type === 'status' && modal.nextStatus === 'suspended' ? 'Suspender usuario' : 'Reactivar usuario'}
                message={modal?.type === 'status'
                    ? modal.nextStatus === 'suspended'
                        ? `¿Suspender el acceso de ${modal.user.name} (${modal.user.email})? Podrás reactivarlo cuando quieras.`
                        : `¿Reactivar a ${modal.user.name} como cuenta verificada?`
                    : ''}
                confirmLabel={modal?.type === 'status' && modal.nextStatus === 'suspended' ? 'Suspender' : 'Reactivar'}
                tone={modal?.type === 'status' && modal.nextStatus === 'suspended' ? 'danger' : 'default'}
                busy={confirming}
                onClose={() => setModal(null)}
                onConfirm={() => void confirmAdminAction()}
            />
            <PanelConfirmDialog
                open={modal?.type === 'serenatas'}
                title="Agregar perfil de SimpleSerenatas"
                message={modal?.type === 'serenatas'
                    ? `Agregarás el perfil ${SERENATAS_PROFILE_OPTIONS.find((option) => option.value === modal.profile)?.label ?? modal.profile} a ${modal.user.name}. Se conservarán sus perfiles existentes.`
                    : ''}
                confirmLabel="Agregar perfil"
                busy={confirming}
                onClose={() => setModal(null)}
                onConfirm={() => void confirmAdminAction()}
            />
        </div>
    );
}
