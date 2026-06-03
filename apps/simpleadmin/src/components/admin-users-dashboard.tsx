'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    IconEdit,
    IconMail,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconUserCheck,
    IconUsers,
    IconX,
} from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import {
    PanelCard,
    PanelEmptyState,
    PanelIconButton,
    PanelList,
    PanelListHeader,
    PanelListRow,
    PanelPageHeader,
    PanelStatCard,
} from '@simple/ui/panel';
import {
    deleteAdminUser,
    fetchAdminUsers,
    sendAdminBulkEmail,
    sendAdminUserEmail,
    updateAdminUser,
    updateAdminUserRole,
    updateAdminUserStatus,
    updateSerenatasProfile,
    type AdminUserRole,
    type AdminUserSnapshot,
    type AdminUserStatus,
    type AdminVertical,
} from '@/lib/api';

type VerticalFilter = 'all' | AdminVertical;
type StatusFilter = 'all' | AdminUserStatus;
type ModalState =
    | { type: 'edit'; user: AdminUserSnapshot }
    | { type: 'email'; user?: AdminUserSnapshot; userIds?: string[] }
    | { type: 'delete'; user: AdminUserSnapshot }
    | null;

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'verified', label: 'Verificados' },
    { value: 'active', label: 'Activos' },
    { value: 'suspended', label: 'Suspendidos' },
];

const ROLE_OPTIONS: Array<{ value: AdminUserRole; label: string }> = [
    { value: 'user', label: 'Usuario' },
    { value: 'admin', label: 'Admin' },
    { value: 'superadmin', label: 'Superadmin' },
];

const SERENATAS_PROFILE_OPTIONS = [
    { value: 'client', label: 'Cliente' },
    { value: 'musician', label: 'Músico' },
    { value: 'owner', label: 'Dueño' },
] as const;

function formatDateTime(value: number | null) {
    if (!value) return 'Sin registro';
    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function statusLabel(status: AdminUserStatus) {
    if (status === 'verified') return 'Verificado';
    if (status === 'suspended') return 'Suspendido';
    return 'Activo';
}

function roleLabel(role: AdminUserRole) {
    if (role === 'superadmin') return 'Superadmin';
    if (role === 'admin') return 'Admin';
    return 'Usuario';
}

function verticalLabel(vertical: AdminVertical | null) {
    if (vertical === 'agenda') return 'SimpleAgenda';
    if (vertical === 'autos') return 'SimpleAutos';
    if (vertical === 'propiedades') return 'SimplePropiedades';
    if (vertical === 'serenatas') return 'SimpleSerenatas';
    return 'Sin vertical';
}

function neutralBadge(label: string) {
    return (
        <span className="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)', background: 'var(--bg-subtle)' }}>
            {label}
        </span>
    );
}

function userMatchesVertical(user: AdminUserSnapshot, vertical: VerticalFilter) {
    if (vertical === 'all') return true;
    if (user.likelySignupVertical === vertical) return true;
    return user.verticalSignals.some((signal) => signal.vertical === vertical);
}

function healthLabel(score: number) {
    if (score >= 70) return 'Alta';
    if (score >= 40) return 'Media';
    return 'Baja';
}

function AccountHealth({ score }: { score: number }) {
    const safeScore = Math.max(0, Math.min(100, score || 0));
    return (
        <div className="min-w-[120px]">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--fg-muted)' }}>
                <span>{healthLabel(safeScore)}</span>
                <span className="font-mono">{safeScore}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-muted)' }}>
                <div className="h-full rounded-full" style={{ width: `${safeScore}%`, background: 'var(--fg)' }} />
            </div>
        </div>
    );
}

function UserAvatar({ user }: { user: AdminUserSnapshot }) {
    const initials = user.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || user.email[0]?.toUpperCase() || 'U';
    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
            {initials}
        </div>
    );
}

function Drawer({ user, onClose, onEdit, onEmail, onDelete, onSerenatasProfile }: {
    user: AdminUserSnapshot;
    onClose: () => void;
    onEdit: () => void;
    onEmail: () => void;
    onDelete: () => void;
    onSerenatasProfile: (profileType: 'client' | 'musician' | 'owner') => void;
}) {
    return (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold" style={{ color: 'var(--fg)' }}>{user.name}</h2>
                        <p className="truncate text-sm" style={{ color: 'var(--fg-muted)' }}>{user.email}</p>
                    </div>
                </div>
                <PanelIconButton label="Cerrar" onClick={onClose} variant="soft" size="md"><IconX size={16} /></PanelIconButton>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <section>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Cuenta</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <Info label="Rol" value={roleLabel(user.role)} />
                        <Info label="Estado" value={statusLabel(user.status)} />
                        <Info label="Teléfono" value={user.phone || 'Sin teléfono'} />
                        <Info label="Proveedor" value={user.provider || 'Email'} />
                        <Info label="Alta" value={user.signupSourceLabel} className="col-span-2" />
                        <Info label="Vertical probable" value={`${verticalLabel(user.likelySignupVertical)} · ${user.verticalConfidence === 'direct' ? 'directa' : user.verticalConfidence === 'inferred' ? 'inferida' : 'sin señal'}`} className="col-span-2" />
                    </div>
                </section>

                <section>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Salud de cuenta</p>
                    <PanelCard size="sm">
                        <AccountHealth score={user.realness.score} />
                        <p className="mt-3 text-sm font-medium" style={{ color: 'var(--fg)' }}>{user.realness.label}</p>
                        {user.realness.reasons.length ? (
                            <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                {user.realness.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                            </ul>
                        ) : null}
                    </PanelCard>
                </section>

                <section>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Señales por vertical</p>
                    <div className="space-y-2">
                        {user.verticalSignals.length ? user.verticalSignals.map((signal, index) => (
                            <div key={`${signal.vertical}-${signal.source}-${index}`} className="rounded-card border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{verticalLabel(signal.vertical)}</p>
                                    {neutralBadge(String(signal.count))}
                                </div>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>{signal.label}</p>
                            </div>
                        )) : (
                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No hay señales suficientes para asignar vertical.</p>
                        )}
                    </div>
                </section>

                {user.likelySignupVertical === 'serenatas' || user.serenatas ? (
                    <section>
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>SimpleSerenatas</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                            {SERENATAS_PROFILE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => onSerenatasProfile(option.value)}
                                    className="rounded-button border px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg)', background: 'var(--bg)' }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t p-4" style={{ borderColor: 'var(--border)' }}>
                <button className="btn btn-outline" type="button" onClick={onEmail}><IconMail size={15} /> Correo</button>
                <button className="btn btn-outline" type="button" onClick={onEdit}><IconEdit size={15} /> Editar</button>
                <button className="btn btn-outline" type="button" onClick={onDelete}><IconTrash size={15} /> Eliminar</button>
            </div>
        </aside>
    );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
    return (
        <div className={className}>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</p>
            <p className="mt-0.5 break-words text-sm font-medium" style={{ color: 'var(--fg)' }}>{value}</p>
        </div>
    );
}

function EditModal({ user, onCancel, onSaved }: { user: AdminUserSnapshot; onCancel: () => void; onSaved: () => void }) {
    const [name, setName] = useState(user.name);
    const [phone, setPhone] = useState(user.phone ?? '');
    const [role, setRole] = useState<AdminUserRole>(user.role);
    const [status, setStatus] = useState<AdminUserStatus>(user.status);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            await updateAdminUser(user.id, { name, phone });
            if (role !== user.role) await updateAdminUserRole(user.id, role);
            if (status !== user.status) await updateAdminUserStatus(user.id, status);
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminModal title="Editar usuario" onCancel={onCancel}>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Nombre</span>
                    <input className="form-input" value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Teléfono</span>
                    <input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56978623828" />
                </label>
                <label className="space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Rol</span>
                    <ModernSelect value={role} onChange={(value) => setRole(value as AdminUserRole)} options={ROLE_OPTIONS} />
                </label>
                <label className="space-y-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Estado</span>
                    <ModernSelect value={status} onChange={(value) => setStatus(value as AdminUserStatus)} options={STATUS_OPTIONS.filter((option) => option.value !== 'all') as Array<{ value: AdminUserStatus; label: string }>} />
                </label>
            </div>
            {error ? <p className="mt-4 text-sm" style={{ color: 'var(--fg)' }}>{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
                <button className="btn btn-outline" type="button" onClick={onCancel}>Cancelar</button>
                <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </AdminModal>
    );
}

function EmailModal({ user, userIds, onCancel, onSent }: { user?: AdminUserSnapshot; userIds?: string[]; onCancel: () => void; onSent: () => void }) {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const send = async () => {
        setSending(true);
        setError('');
        try {
            if (user) await sendAdminUserEmail(user.id, { subject, message });
            else await sendAdminBulkEmail({ userIds: userIds ?? [], subject, message });
            onSent();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo enviar');
        } finally {
            setSending(false);
        }
    };

    return (
        <AdminModal title={user ? `Correo a ${user.name}` : 'Correo seleccionado'} onCancel={onCancel}>
            <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {user ? user.email : `${userIds?.length ?? 0} usuarios seleccionados`}
                </p>
                <label className="space-y-1.5 block">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Asunto</span>
                    <input className="form-input" value={subject} onChange={(event) => setSubject(event.target.value)} />
                </label>
                <label className="space-y-1.5 block">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Mensaje</span>
                    <textarea className="form-input min-h-36 resize-y" value={message} onChange={(event) => setMessage(event.target.value)} />
                </label>
            </div>
            {error ? <p className="mt-4 text-sm" style={{ color: 'var(--fg)' }}>{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
                <button className="btn btn-outline" type="button" onClick={onCancel}>Cancelar</button>
                <button className="btn btn-primary" type="button" onClick={send} disabled={sending || subject.trim().length < 3 || message.trim().length < 5}>{sending ? 'Enviando...' : 'Enviar'}</button>
            </div>
        </AdminModal>
    );
}

function DeleteModal({ user, onCancel, onDeleted }: { user: AdminUserSnapshot; onCancel: () => void; onDeleted: () => void }) {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const confirm = async () => {
        setDeleting(true);
        setError('');
        try {
            await deleteAdminUser(user.id);
            onDeleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo eliminar');
        } finally {
            setDeleting(false);
        }
    };
    return (
        <AdminModal title="Eliminar usuario" onCancel={onCancel} widthClassName="max-w-md">
            <p className="text-sm leading-6" style={{ color: 'var(--fg-secondary)' }}>
                Vas a eliminar a <strong style={{ color: 'var(--fg)' }}>{user.name}</strong>. Esta acción es permanente.
            </p>
            {error ? <p className="mt-4 text-sm" style={{ color: 'var(--fg)' }}>{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
                <button className="btn btn-outline" type="button" onClick={onCancel}>Cancelar</button>
                <button className="btn btn-primary" type="button" onClick={confirm} disabled={deleting}>{deleting ? 'Eliminando...' : 'Eliminar'}</button>
            </div>
        </AdminModal>
    );
}

function AdminModal({ title, children, onCancel, widthClassName = 'max-w-2xl' }: { title: string; children: ReactNode; onCancel: () => void; widthClassName?: string }) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.62)' }} onClick={onCancel}>
            <div className={`w-full ${widthClassName} rounded-card border p-5 shadow-2xl`} style={{ borderColor: 'var(--border)', background: 'var(--surface)' }} onClick={(event) => event.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>{title}</h2>
                    <PanelIconButton label="Cerrar" onClick={onCancel} variant="soft" size="md"><IconX size={16} /></PanelIconButton>
                </div>
                {children}
            </div>
        </div>
    );
}

export function AdminUsersDashboard() {
    const searchParams = useSearchParams();
    const [users, setUsers] = useState<AdminUserSnapshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<StatusFilter>('all');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [checkedIds, setCheckedIds] = useState<string[]>([]);
    const [modal, setModal] = useState<ModalState>(null);
    const vertical = useMemo<VerticalFilter>(() => {
        const raw = searchParams.get('vertical');
        if (raw === 'agenda' || raw === 'autos' || raw === 'propiedades' || raw === 'serenatas') return raw;
        return 'all';
    }, [searchParams]);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const items = await fetchAdminUsers();
            setUsers(items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos cargar usuarios');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const filteredUsers = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return users.filter((user) => {
            if (!userMatchesVertical(user, vertical)) return false;
            if (status !== 'all' && user.status !== status) return false;
            if (!normalized) return true;
            return [user.name, user.email, user.phone ?? '', user.signupSourceLabel, verticalLabel(user.likelySignupVertical)]
                .join(' ')
                .toLowerCase()
                .includes(normalized);
        });
    }, [query, status, users, vertical]);

    const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
    const visibleCheckedIds = checkedIds.filter((id) => filteredUsers.some((user) => user.id === id));
    const allVisibleChecked = filteredUsers.length > 0 && visibleCheckedIds.length === filteredUsers.length;

    const stats = useMemo(() => {
        const verified = filteredUsers.filter((user) => user.status === 'verified').length;
        const suspended = filteredUsers.filter((user) => user.status === 'suspended').length;
        const proSignals = filteredUsers.filter((user) => JSON.stringify(user.subscriptions ?? {}).includes('active')).length;
        return { total: filteredUsers.length, verified, suspended, proSignals };
    }, [filteredUsers]);

    const refreshAfterAction = async () => {
        await loadUsers();
        setModal(null);
    };

    const toggleAllVisible = () => {
        if (allVisibleChecked) {
            setCheckedIds((current) => current.filter((id) => !filteredUsers.some((user) => user.id === id)));
            return;
        }
        setCheckedIds((current) => [...new Set([...current, ...filteredUsers.map((user) => user.id)])]);
    };

    const toggleChecked = (userId: string) => {
        setCheckedIds((current) => current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]);
    };

    const applySerenatasProfile = async (user: AdminUserSnapshot, profileType: 'client' | 'musician' | 'owner') => {
        await updateSerenatasProfile(user.id, {
            profileType,
            removeClientProfile: profileType !== 'client',
            note: 'Ajustado desde SimpleAdmin.',
        });
        await loadUsers();
    };

    return (
        <div className="container-app panel-page py-6">
            <PanelPageHeader
                title="Usuarios"
                actions={
                    <>
                        <button className="btn btn-outline" type="button" onClick={loadUsers} disabled={loading}>
                            <IconRefresh size={15} /> Actualizar
                        </button>
                        <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => setModal({ type: 'email', userIds: visibleCheckedIds })}
                            disabled={visibleCheckedIds.length === 0}
                        >
                            <IconMail size={15} /> Correo masivo
                        </button>
                    </>
                }
            />

            <div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]">
                <label className="relative">
                    <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" size={17} style={{ color: 'var(--fg-muted)' }} />
                    <input
                        className="form-input pl-10"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por nombre, correo, teléfono o vertical..."
                    />
                </label>
                <ModernSelect value={status} onChange={(value) => setStatus(value as StatusFilter)} options={STATUS_OPTIONS} />
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <PanelStatCard label="Usuarios filtrados" value={String(stats.total)} icon={<IconUsers size={16} />} />
                <PanelStatCard label="Verificados" value={String(stats.verified)} icon={<IconUserCheck size={16} />} />
                <PanelStatCard label="Con suscripción activa" value={String(stats.proSignals)} />
                <PanelStatCard label="Suspendidos" value={String(stats.suspended)} />
            </div>

            {error ? (
                <PanelCard className="mb-5" size="sm">
                    <p className="text-sm" style={{ color: 'var(--fg)' }}>{error}</p>
                </PanelCard>
            ) : null}

            <PanelList>
                <PanelListHeader className="grid-cols-[40px_minmax(240px,1.5fr)_minmax(150px,0.8fr)_minmax(170px,0.9fr)_minmax(150px,0.8fr)_120px]">
                    <button type="button" onClick={toggleAllVisible} className="flex h-4 w-4 items-center justify-center rounded border" style={{ borderColor: 'var(--border)', background: allVisibleChecked ? 'var(--fg)' : 'var(--surface)' }} aria-label="Seleccionar visibles" />
                    <span>Usuario</span>
                    <span>Vertical</span>
                    <span>Registro / último login</span>
                    <span>Salud</span>
                    <span className="text-right">Acciones</span>
                </PanelListHeader>

                {loading ? (
                    <PanelListRow className="p-5">
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Cargando usuarios...</p>
                    </PanelListRow>
                ) : filteredUsers.length === 0 ? (
                    <PanelListRow className="p-5">
                        <PanelEmptyState description="No hay usuarios para los filtros seleccionados." />
                    </PanelListRow>
                ) : filteredUsers.map((user) => {
                    const checked = checkedIds.includes(user.id);
                    return (
                        <PanelListRow key={user.id} className="grid gap-3 p-4 md:grid-cols-[40px_minmax(240px,1.5fr)_minmax(150px,0.8fr)_minmax(170px,0.9fr)_minmax(150px,0.8fr)_120px] md:items-center">
                            <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); toggleChecked(user.id); }}
                                className="flex h-5 w-5 items-center justify-center rounded border"
                                style={{ borderColor: 'var(--border)', background: checked ? 'var(--fg)' : 'var(--surface)' }}
                                aria-label={`Seleccionar ${user.name}`}
                            />
                            <button type="button" onClick={() => setSelectedUserId(user.id)} className="flex min-w-0 items-center gap-3 text-left">
                                <UserAvatar user={user} />
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>{user.name}</span>
                                    <span className="block truncate text-sm" style={{ color: 'var(--fg-muted)' }}>{user.email}</span>
                                    <span className="mt-2 flex flex-wrap gap-1.5">
                                        {neutralBadge(roleLabel(user.role))}
                                        {neutralBadge(statusLabel(user.status))}
                                    </span>
                                </span>
                            </button>
                            <div>
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{verticalLabel(user.likelySignupVertical)}</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{user.signupSourceLabel}</p>
                            </div>
                            <div className="font-mono text-xs leading-5" style={{ color: 'var(--fg-muted)' }}>
                                <p>{formatDateTime(user.createdAt)}</p>
                                <p>{formatDateTime(user.lastLoginAt)}</p>
                            </div>
                            <AccountHealth score={user.realness.score} />
                            <div className="flex items-center justify-start gap-1 md:justify-end">
                                <PanelIconButton label="Editar" onClick={() => setModal({ type: 'edit', user })} variant="soft"><IconEdit size={15} /></PanelIconButton>
                                <PanelIconButton label="Enviar correo" onClick={() => setModal({ type: 'email', user })} variant="soft"><IconMail size={15} /></PanelIconButton>
                                <PanelIconButton label="Eliminar" onClick={() => setModal({ type: 'delete', user })} variant="soft"><IconTrash size={15} /></PanelIconButton>
                            </div>
                        </PanelListRow>
                    );
                })}
            </PanelList>

            {selectedUser ? (
                <Drawer
                    user={selectedUser}
                    onClose={() => setSelectedUserId(null)}
                    onEdit={() => setModal({ type: 'edit', user: selectedUser })}
                    onEmail={() => setModal({ type: 'email', user: selectedUser })}
                    onDelete={() => setModal({ type: 'delete', user: selectedUser })}
                    onSerenatasProfile={(profileType) => void applySerenatasProfile(selectedUser, profileType)}
                />
            ) : null}

            {modal?.type === 'edit' ? <EditModal user={modal.user} onCancel={() => setModal(null)} onSaved={refreshAfterAction} /> : null}
            {modal?.type === 'email' ? <EmailModal user={modal.user} userIds={modal.userIds} onCancel={() => setModal(null)} onSent={refreshAfterAction} /> : null}
            {modal?.type === 'delete' ? <DeleteModal user={modal.user} onCancel={() => setModal(null)} onDeleted={refreshAfterAction} /> : null}
        </div>
    );
}
