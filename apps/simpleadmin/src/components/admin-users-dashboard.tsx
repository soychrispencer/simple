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
    updateAdminUserSubscriptions,
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
    | { type: 'subscriptions'; user: AdminUserSnapshot }
    | { type: 'delete'; user: AdminUserSnapshot }
    | null;

type PrimaryVerticalValue = 'none' | 'autos' | 'propiedades' | 'agenda';
type SubscriptionStatusValue = 'active' | 'cancelled' | 'expired';

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

const PRIMARY_VERTICAL_OPTIONS: Array<{ value: PrimaryVerticalValue; label: string }> = [
    { value: 'none', label: 'Sin plataforma base' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'propiedades', label: 'SimplePropiedades' },
];

const SUBSCRIPTION_STATUS_OPTIONS: Array<{ value: SubscriptionStatusValue; label: string }> = [
    { value: 'active', label: 'Activa' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'expired', label: 'Expirada' },
];

const PLAN_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
    agenda: [
        { value: 'free', label: 'Gratis' },
        { value: 'pro', label: 'Pro' },
    ],
    autos: [
        { value: 'free', label: 'Gratis' },
        { value: 'pro', label: 'Pro' },
        { value: 'enterprise', label: 'Enterprise' },
    ],
    propiedades: [
        { value: 'free', label: 'Gratis' },
        { value: 'pro', label: 'Pro' },
        { value: 'enterprise', label: 'Enterprise' },
    ],
    serenatas: [
        { value: 'free', label: 'Gratis' },
        { value: 'pro', label: 'Pro' },
    ],
};

const EMAIL_TEMPLATES = [
    {
        id: 'custom',
        label: 'Mensaje personalizado',
        subject: '',
        message: '',
        actionLabel: '',
        actionUrl: '',
    },
    {
        id: 'agenda-follow-up',
        label: 'Seguimiento SimpleAgenda',
        subject: '¿Te ayudamos a dejar tu agenda funcionando?',
        message: `Hola {{name}},

Vimos que creaste tu cuenta en SimpleAgenda y queríamos acompañarte en los primeros pasos.

La idea es simple: que puedas ordenar tus horarios, citas, pacientes y cobros desde un solo lugar, sin depender de mensajes sueltos o planillas.

Si te faltó configurar disponibilidad, servicios o pagos, responde este correo y te orientamos directamente.

Saludos,
Equipo SimpleAgenda`,
        actionLabel: 'Entrar a SimpleAgenda',
        actionUrl: 'https://simpleagenda.app/panel',
    },
    {
        id: 'agenda-reactivation',
        label: 'Recuperación SimpleAgenda',
        subject: 'Tu cuenta de SimpleAgenda sigue lista para usar',
        message: `Hola {{name}},

Tu cuenta sigue disponible para que puedas continuar configurando tu agenda profesional.

Si la probaste y la dejaste pendiente, puede que solo falte un ajuste: horarios, servicios, datos de contacto o forma de pago.

Queremos que SimpleAgenda sea útil de verdad para tu operación. Si algo no te hizo sentido, respóndenos este correo y lo revisamos contigo.

Saludos,
Equipo SimpleAgenda`,
        actionLabel: 'Retomar configuración',
        actionUrl: 'https://simpleagenda.app/panel',
    },
    {
        id: 'welcome-platform',
        label: 'Bienvenida corporativa',
        subject: 'Bienvenido al ecosistema Simple',
        message: `Hola {{name}},

Gracias por crear tu cuenta en el ecosistema Simple.

Cada plataforma está pensada para resolver un flujo concreto: agenda, publicaciones, clientes, oportunidades comerciales o gestión operativa.

Si necesitas ayuda para ubicarte o elegir por dónde continuar, responde este correo y te orientamos.

Saludos,
Equipo Simple`,
        actionLabel: 'Ir al ecosistema Simple',
        actionUrl: 'https://simpleplataforma.app',
    },
    {
        id: 'subscription-help',
        label: 'Apoyo plan Pro',
        subject: 'Revisemos si tu plan actual calza con tu operación',
        message: `Hola {{name}},

Te escribimos para ayudarte a revisar si tu configuración actual es suficiente o si un plan de pago puede darte más control para operar mejor.

La idea no es venderte un plan que no necesitas. Queremos entender cómo estás usando la plataforma y recomendarte el camino correcto.

Saludos,
Equipo Simple`,
        actionLabel: 'Revisar mi cuenta',
        actionUrl: 'https://simpleplataforma.app',
    },
] as const;

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
    return 'Sin plataforma';
}

function platformStatusLabel(status: string) {
    if (status === 'active') return 'Activa';
    if (status === 'suspended') return 'Suspendida';
    if (status === 'inactive') return 'No activada';
    return status;
}

function platformRoleLabel(role: string | null | undefined) {
    if (role === 'professional') return 'Profesional';
    if (role === 'publisher') return 'Publicador';
    if (role === 'owner') return 'Dueño';
    if (role === 'musician') return 'Músico';
    return 'Usuario';
}

function platformSummary(user: AdminUserSnapshot) {
    if (!user.platformAccesses?.length) return 'Sin plataforma activada';
    return user.platformAccesses.map((access) => access.label).join(', ');
}

function activitySummary(user: AdminUserSnapshot) {
    if (user.lastLoginAt) return `Último ingreso ${formatDateTime(user.lastLoginAt)}`;
    return `Registro ${formatDateTime(user.createdAt)}`;
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
    if (user.platformAccesses?.some((access) => access.vertical === vertical)) return true;
    if (user.likelySignupVertical === vertical) return true;
    return user.verticalSignals.some((signal) => signal.vertical === vertical);
}

function AccessState({ user, compact = false }: { user: AdminUserSnapshot; compact?: boolean }) {
    const hasPlatform = (user.platformAccesses ?? []).some((access) => access.status === 'active');
    const items = [
        { label: user.status === 'verified' ? 'Correo verificado' : 'Correo pendiente', ok: user.status === 'verified' },
        { label: user.lastLoginAt ? 'Con ingreso' : 'Sin ingreso', ok: Boolean(user.lastLoginAt) },
        { label: hasPlatform ? 'Plataforma activa' : 'Sin plataforma', ok: hasPlatform },
        { label: user.provider === 'google' ? 'Google' : 'Email', ok: true },
    ];
    return (
        <div className={compact ? 'flex flex-wrap gap-1.5' : 'grid gap-2'}>
            {items.map((item) => (
                <span
                    key={item.label}
                    className="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium"
                    style={{
                        borderColor: item.ok ? 'rgba(22,163,74,0.22)' : 'var(--border)',
                        color: item.ok ? '#166534' : 'var(--fg-secondary)',
                        background: item.ok ? 'rgba(22,163,74,0.08)' : 'var(--bg-subtle)',
                    }}
                >
                    {item.label}
                </span>
            ))}
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

function Drawer({ user, onClose, onEdit, onEmail, onSubscriptions, onDelete, onSerenatasProfile }: {
    user: AdminUserSnapshot;
    onClose: () => void;
    onEdit: () => void;
    onEmail: () => void;
    onSubscriptions: () => void;
    onDelete: () => void;
    onSerenatasProfile: (profileType: 'client' | 'musician' | 'owner') => void;
}) {
    const activePlatforms = user.platformAccesses ?? [];
    const distinctActivity = user.verticalSignals.filter((signal) => (
        !activePlatforms.some((access) => access.vertical === signal.vertical && signal.source === 'signup_app')
    ));
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
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Resumen</p>
                    <div className="grid gap-2 text-sm">
                        <div className="rounded-card border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                            <div className="flex flex-wrap items-center gap-2">
                                {neutralBadge(roleLabel(user.role))}
                                {neutralBadge(statusLabel(user.status))}
                                {user.provider === 'google' ? neutralBadge('Google') : neutralBadge('Email')}
                            </div>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                <Info label="Teléfono" value={user.phone || 'Sin teléfono'} />
                                <Info label="Actividad" value={activitySummary(user)} />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Plataformas</p>
                    <div className="space-y-2">
                        {activePlatforms.length ? activePlatforms.map((access) => (
                            <div key={access.app} className="rounded-card border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{access.label}</p>
                                    {neutralBadge(platformStatusLabel(access.status))}
                                </div>
                                <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    {platformRoleLabel(access.role)} · Activada {formatDateTime(access.activatedAt)}
                                </p>
                            </div>
                        )) : (
                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>No tiene plataformas activadas todavía.</p>
                        )}
                    </div>
                </section>

                {!activePlatforms.length && distinctActivity.length ? (
                    <section>
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Actividad detectada</p>
                        <div className="space-y-2">
                            {distinctActivity.map((signal, index) => (
                                <div key={`${signal.vertical}-${signal.source}-${index}`} className="rounded-card border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{verticalLabel(signal.vertical)}</p>
                                        {neutralBadge(String(signal.count))}
                                    </div>
                                    <p className="mt-1 text-sm" style={{ color: 'var(--fg-muted)' }}>{signal.label}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                <section>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--fg-muted)' }}>Suscripciones</p>
                        <button type="button" className="text-sm font-medium" style={{ color: 'var(--fg)' }} onClick={onSubscriptions}>
                            Editar
                        </button>
                    </div>
                    <div className="grid gap-2">
                        {(['agenda', 'autos', 'propiedades', 'serenatas'] as const).map((vertical) => {
                            const value = getSubscriptionSummary(user, vertical);
                            return (
                                <div key={vertical} className="flex items-center justify-between gap-3 rounded-card border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                                    <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{verticalLabel(vertical)}</span>
                                    <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>{value}</span>
                                </div>
                            );
                        })}
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
                <button className="btn btn-outline" type="button" onClick={onSubscriptions}>Suscripción</button>
                <button className="btn btn-outline" type="button" onClick={onDelete}><IconTrash size={15} /> Eliminar</button>
            </div>
        </aside>
    );
}

function getSubscriptionSummary(user: AdminUserSnapshot, vertical: 'agenda' | 'autos' | 'propiedades' | 'serenatas') {
    const subscriptions = user.subscriptions as Record<string, any> | undefined;
    const item = subscriptions?.[vertical];
    if (!item) return 'Sin plan';
    const plan = vertical === 'agenda' ? item.plan : item.planId;
    const status = item.status ? ` · ${item.status}` : '';
    return `${plan || 'free'}${status}`;
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
    const [primaryVertical, setPrimaryVertical] = useState<PrimaryVerticalValue>(user.primaryVertical ?? 'none');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            await updateAdminUser(user.id, {
                name,
                phone,
                primaryVertical: primaryVertical === 'none' ? null : primaryVertical,
            });
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
                <label className="space-y-1.5 sm:col-span-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Plataforma base</span>
                    <ModernSelect value={primaryVertical} onChange={(value) => setPrimaryVertical(value as PrimaryVerticalValue)} options={PRIMARY_VERTICAL_OPTIONS} />
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
    const [templateId, setTemplateId] = useState('custom');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [actionLabel, setActionLabel] = useState('');
    const [actionUrl, setActionUrl] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const brandVertical = user?.likelySignupVertical ?? user?.primaryVertical ?? null;

    const send = async () => {
        setSending(true);
        setError('');
        try {
            const payload = {
                subject,
                message,
                actionLabel: actionLabel.trim() || undefined,
                actionUrl: actionUrl.trim() || undefined,
                brandVertical,
            };
            if (user) await sendAdminUserEmail(user.id, payload);
            else await sendAdminBulkEmail({ userIds: userIds ?? [], ...payload });
            onSent();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo enviar');
        } finally {
            setSending(false);
        }
    };

    const applyTemplate = (id: string) => {
        setTemplateId(id);
        const template = EMAIL_TEMPLATES.find((item) => item.id === id);
        if (!template || template.id === 'custom') return;
        setSubject(template.subject);
        setMessage(user ? template.message.replaceAll('{{name}}', user.name || 'tu cuenta') : template.message);
        setActionLabel(template.actionLabel);
        setActionUrl(template.actionUrl);
    };

    return (
        <AdminModal title={user ? `Correo a ${user.name}` : 'Correo seleccionado'} onCancel={onCancel}>
            <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                    {user ? user.email : `${userIds?.length ?? 0} usuarios seleccionados`}
                </p>
                <label className="space-y-1.5 block">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Plantilla</span>
                    <ModernSelect
                        value={templateId}
                        onChange={applyTemplate}
                        options={EMAIL_TEMPLATES.map((template) => ({ value: template.id, label: template.label }))}
                    />
                </label>
                <label className="space-y-1.5 block">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Asunto</span>
                    <input className="form-input" value={subject} onChange={(event) => setSubject(event.target.value)} />
                </label>
                <label className="space-y-1.5 block">
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Mensaje</span>
                    <textarea className="form-input min-h-36 resize-y" value={message} onChange={(event) => setMessage(event.target.value)} />
                </label>
                <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                    <label className="space-y-1.5 block">
                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Texto del botón</span>
                        <input className="form-input" value={actionLabel} onChange={(event) => setActionLabel(event.target.value)} placeholder="Abrir panel" />
                    </label>
                    <label className="space-y-1.5 block">
                        <span className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Link del botón</span>
                        <input className="form-input" value={actionUrl} onChange={(event) => setActionUrl(event.target.value)} placeholder="https://..." />
                    </label>
                </div>
                <p className="text-xs leading-5" style={{ color: 'var(--fg-muted)' }}>
                    Marca sugerida: {brandVertical ? verticalLabel(brandVertical) : 'SimplePlataforma'}. El correo puede salir desde el dominio central, pero el nombre visible y el diseño serán de la plataforma.
                </p>
            </div>
            {error ? <p className="mt-4 text-sm" style={{ color: 'var(--fg)' }}>{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
                <button className="btn btn-outline" type="button" onClick={onCancel}>Cancelar</button>
                <button className="btn btn-primary" type="button" onClick={send} disabled={sending || subject.trim().length < 3 || message.trim().length < 5}>{sending ? 'Enviando...' : 'Enviar'}</button>
            </div>
        </AdminModal>
    );
}

function SubscriptionModal({ user, onCancel, onSaved }: { user: AdminUserSnapshot; onCancel: () => void; onSaved: () => void }) {
    const subscriptions = user.subscriptions as Record<string, any> | undefined;
    const [form, setForm] = useState(() => ({
        agenda: {
            plan: subscriptions?.agenda?.plan ?? 'free',
            status: subscriptions?.agenda?.status === 'expired' ? 'expired' : subscriptions?.agenda?.status === 'active' ? 'active' : 'cancelled',
            expiresAt: toDateInputValue(subscriptions?.agenda?.expiresAt),
        },
        autos: {
            plan: subscriptions?.autos?.planId ?? 'free',
            status: subscriptions?.autos?.status ?? 'cancelled',
            expiresAt: toDateInputValue(subscriptions?.autos?.expiresAt),
        },
        propiedades: {
            plan: subscriptions?.propiedades?.planId ?? 'free',
            status: subscriptions?.propiedades?.status ?? 'cancelled',
            expiresAt: toDateInputValue(subscriptions?.propiedades?.expiresAt),
        },
        serenatas: {
            plan: subscriptions?.serenatas?.planId ?? 'free',
            status: subscriptions?.serenatas?.status ?? 'cancelled',
            expiresAt: toDateInputValue(subscriptions?.serenatas?.expiresAt),
            trialEndsAt: toDateInputValue(user.serenatas?.trialEndsAt),
        },
    }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setVerticalField = (vertical: keyof typeof form, field: string, value: string) => {
        setForm((current) => ({
            ...current,
            [vertical]: {
                ...current[vertical],
                [field]: value,
            },
        }));
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            await updateAdminUserSubscriptions(user.id, {
                agenda: {
                    plan: form.agenda.plan,
                    expiresAt: dateInputToIso(form.agenda.expiresAt),
                },
                autos: {
                    planId: form.autos.plan,
                    status: form.autos.plan === 'free' ? 'cancelled' : form.autos.status,
                    expiresAt: dateInputToIso(form.autos.expiresAt),
                },
                propiedades: {
                    planId: form.propiedades.plan,
                    status: form.propiedades.plan === 'free' ? 'cancelled' : form.propiedades.status,
                    expiresAt: dateInputToIso(form.propiedades.expiresAt),
                },
                serenatas: {
                    planId: form.serenatas.plan,
                    status: form.serenatas.plan === 'free' ? 'cancelled' : form.serenatas.status,
                    expiresAt: dateInputToIso(form.serenatas.expiresAt),
                    trialEndsAt: dateInputToIso(form.serenatas.trialEndsAt),
                },
            });
            onSaved();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar la suscripción');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminModal title={`Suscripciones · ${user.name}`} onCancel={onCancel} widthClassName="max-w-3xl">
            <div className="space-y-3">
                {(['agenda', 'autos', 'propiedades', 'serenatas'] as const).map((vertical) => (
                    <div key={vertical} className="grid gap-3 rounded-card border p-3 md:grid-cols-[1fr_150px_150px_150px]" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{verticalLabel(vertical)}</p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{getSubscriptionSummary(user, vertical)}</p>
                        </div>
                        <ModernSelect
                            value={form[vertical].plan}
                            onChange={(value) => setVerticalField(vertical, 'plan', value)}
                            options={PLAN_OPTIONS[vertical]}
                        />
                        <ModernSelect
                            value={form[vertical].status}
                            onChange={(value) => setVerticalField(vertical, 'status', value)}
                            options={SUBSCRIPTION_STATUS_OPTIONS}
                            disabled={form[vertical].plan === 'free'}
                        />
                        <input
                            className="form-input"
                            type="date"
                            value={form[vertical].expiresAt}
                            onChange={(event) => setVerticalField(vertical, 'expiresAt', event.target.value)}
                            aria-label={`Expiración ${vertical}`}
                        />
                        {vertical === 'serenatas' ? (
                            <label className="md:col-start-4">
                                <span className="mb-1 block text-xs" style={{ color: 'var(--fg-muted)' }}>Fin prueba dueño</span>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={form.serenatas.trialEndsAt}
                                    onChange={(event) => setVerticalField('serenatas', 'trialEndsAt', event.target.value)}
                                />
                            </label>
                        ) : null}
                    </div>
                ))}
            </div>
            {error ? <p className="mt-4 text-sm" style={{ color: 'var(--fg)' }}>{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
                <button className="btn btn-outline" type="button" onClick={onCancel}>Cancelar</button>
                <button className="btn btn-primary" type="button" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </AdminModal>
    );
}

function toDateInputValue(value: unknown) {
    if (typeof value !== 'string' || !value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

function dateInputToIso(value: string) {
    if (!value) return null;
    return new Date(`${value}T23:59:59.000Z`).toISOString();
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
            return [user.name, user.email, user.phone ?? '', user.signupSourceLabel, platformSummary(user), verticalLabel(user.likelySignupVertical)]
                .join(' ')
                .toLowerCase()
                .includes(normalized);
        });
    }, [query, status, users, vertical]);

    const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
    const visibleCheckedIds = checkedIds.filter((id) => filteredUsers.some((user) => user.id === id));
    const allVisibleChecked = filteredUsers.length > 0 && visibleCheckedIds.length === filteredUsers.length;

    const stats = useMemo(() => {
        const suspended = filteredUsers.filter((user) => user.status === 'suspended').length;
        const withPlatform = filteredUsers.filter((user) => (user.platformAccesses ?? []).some((access) => access.status === 'active')).length;
        const proSignals = filteredUsers.filter((user) => JSON.stringify(user.subscriptions ?? {}).includes('active')).length;
        return { total: filteredUsers.length, suspended, withPlatform, proSignals };
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
                        placeholder="Buscar por nombre, correo, teléfono o plataforma..."
                    />
                </label>
                <ModernSelect value={status} onChange={(value) => setStatus(value as StatusFilter)} options={STATUS_OPTIONS} />
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <PanelStatCard label="Usuarios filtrados" value={String(stats.total)} icon={<IconUsers size={16} />} />
                <PanelStatCard label="Con plataforma activa" value={String(stats.withPlatform)} icon={<IconUserCheck size={16} />} />
                <PanelStatCard label="Con suscripción activa" value={String(stats.proSignals)} />
                {stats.suspended > 0 ? <PanelStatCard label="Suspendidos" value={String(stats.suspended)} /> : null}
            </div>

            {error ? (
                <PanelCard className="mb-5" size="sm">
                    <p className="text-sm" style={{ color: 'var(--fg)' }}>{error}</p>
                </PanelCard>
            ) : null}

            <PanelList>
                <PanelListHeader className="grid-cols-[40px_minmax(280px,1.5fr)_minmax(190px,0.9fr)_minmax(210px,1fr)_120px]">
                    <button type="button" onClick={toggleAllVisible} className="flex h-4 w-4 items-center justify-center rounded border" style={{ borderColor: 'var(--border)', background: allVisibleChecked ? 'var(--fg)' : 'var(--surface)' }} aria-label="Seleccionar visibles" />
                    <span>Usuario</span>
                    <span>Plataforma</span>
                    <span>Actividad</span>
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
                        <PanelListRow key={user.id} className="grid gap-3 p-4 md:grid-cols-[40px_minmax(280px,1.5fr)_minmax(190px,0.9fr)_minmax(210px,1fr)_120px] md:items-center">
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
                                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{user.primaryPlatform?.label ?? verticalLabel(user.likelySignupVertical)}</p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{platformSummary(user)}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{activitySummary(user)}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {neutralBadge(user.status === 'verified' ? 'Verificado' : user.status === 'suspended' ? 'Suspendido' : 'Activo')}
                                    {user.provider === 'google' ? neutralBadge('Google') : null}
                                </div>
                            </div>
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
                    onSubscriptions={() => setModal({ type: 'subscriptions', user: selectedUser })}
                    onDelete={() => setModal({ type: 'delete', user: selectedUser })}
                    onSerenatasProfile={(profileType) => void applySerenatasProfile(selectedUser, profileType)}
                />
            ) : null}

            {modal?.type === 'edit' ? <EditModal user={modal.user} onCancel={() => setModal(null)} onSaved={refreshAfterAction} /> : null}
            {modal?.type === 'email' ? <EmailModal user={modal.user} userIds={modal.userIds} onCancel={() => setModal(null)} onSent={refreshAfterAction} /> : null}
            {modal?.type === 'subscriptions' ? <SubscriptionModal user={modal.user} onCancel={() => setModal(null)} onSaved={refreshAfterAction} /> : null}
            {modal?.type === 'delete' ? <DeleteModal user={modal.user} onCancel={() => setModal(null)} onDeleted={refreshAfterAction} /> : null}
        </div>
    );
}
