'use client';

import { useState } from 'react';
import {
    IconBrandWhatsapp,
    IconCheck,
    IconCopy,
    IconCreditCard,
    IconEdit,
    IconExternalLink,
    IconMail,
    IconShieldCheck,
    IconShieldOff,
    IconTrash,
} from '@tabler/icons-react';
import { PanelButton, PanelScrollModal, PanelStatusBadge } from '@simple/ui/panel';
import type { AdminUserSnapshot, AdminUserStatus } from '@/lib/api';
import {
    activitySummary,
    formatDateTime,
    getSubscriptionSummary,
    primaryPlanBadge,
    roleLabel,
    SERENATAS_PROFILE_OPTIONS,
    statusLabel,
    statusTone,
    verticalLabel,
    type AdminCapabilities,
    type SerenatasProfile,
} from './user-domain';

type DetailTab = 'overview' | 'subscriptions' | 'platforms' | 'actions';

const TABS: Array<{ id: DetailTab; label: string }> = [
    { id: 'overview', label: 'Resumen' },
    { id: 'subscriptions', label: 'Suscripciones y espacios' },
    { id: 'platforms', label: 'Plataformas y perfiles' },
    { id: 'actions', label: 'Actividad y acciones' },
];

export function UserDetailSheet({
    user,
    capabilities,
    onClose,
    onEdit,
    onEmail,
    onSubscriptions,
    onToggleStatus,
    onDelete,
    onSerenatasProfile,
}: {
    user: AdminUserSnapshot;
    capabilities: AdminCapabilities;
    onClose: () => void;
    onEdit: () => void;
    onEmail: () => void;
    onSubscriptions: () => void;
    onToggleStatus: (nextStatus: AdminUserStatus) => void;
    onDelete: () => void;
    onSerenatasProfile: (profile: SerenatasProfile) => void;
}) {
    const [tab, setTab] = useState<DetailTab>('overview');
    const [copiedField, setCopiedField] = useState<'email' | 'slug' | null>(null);
    const planBadge = primaryPlanBadge(user);
    const waDigits = (user.phone ?? '').replace(/\D/g, '');
    const agendaUrl = user.agendaProfile?.customDomain && user.agendaProfile.customDomainStatus === 'verified'
        ? `https://${user.agendaProfile.customDomain}`
        : user.agendaProfile?.slug
            ? `https://simpleagenda.app/${user.agendaProfile.slug}`
            : null;

    const copyText = async (value: string, key: 'email' | 'slug') => {
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(key);
            setTimeout(() => setCopiedField((current) => (current === key ? null : current)), 1600);
        } catch {
            // Ignora si el portapapeles no está disponible
        }
    };

    const nextToggleStatus: AdminUserStatus = user.status === 'suspended' ? 'verified' : 'suspended';

    return (
        <PanelScrollModal
            title={user.name}
            subtitle={user.email}
            onClose={onClose}
            size="3xl"
            height="tall"
            headerContent={(
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar user={user} size="lg" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate text-base font-semibold text-[var(--fg)]">{user.name}</h2>
                                <PanelStatusBadge label={planBadge.label} tone={planBadge.tone} size="sm" />
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--fg-muted)]">
                                <span className="truncate">{user.email}</span>
                                <button
                                    type="button"
                                    onClick={() => void copyText(user.email, 'email')}
                                    className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px] hover:bg-[var(--bg-subtle)]"
                                    title="Copiar correo"
                                >
                                    {copiedField === 'email' ? <IconCheck size={11} /> : <IconCopy size={11} />}
                                    {copiedField === 'email' ? 'Copiado' : 'Copiar'}
                                </button>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                <PanelStatusBadge label={roleLabel(user.role)} />
                                <PanelStatusBadge label={statusLabel(user.status)} tone={statusTone(user.status)} />
                                <PanelStatusBadge label={user.realness.label} tone="neutral" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {capabilities.manageUsers ? (
                            <PanelButton size="sm" onClick={onEdit}>
                                <IconEdit size={14} /> Editar
                            </PanelButton>
                        ) : null}
                        {capabilities.manageSubscriptions ? (
                            <PanelButton size="sm" variant="secondary" onClick={onSubscriptions}>
                                <IconCreditCard size={14} /> Plan / WhatsApp
                            </PanelButton>
                        ) : null}
                        {capabilities.sendEmail ? (
                            <PanelButton size="sm" variant="secondary" onClick={onEmail}>
                                <IconMail size={14} /> Correo
                            </PanelButton>
                        ) : null}
                        {waDigits ? (
                            <a
                                href={`https://wa.me/${waDigits}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 text-xs font-medium text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
                            >
                                <IconBrandWhatsapp size={14} /> WhatsApp
                            </a>
                        ) : null}
                    </div>
                </div>
            )}
        >
            <div className="border-b border-[var(--border)] bg-[var(--bg-subtle)] px-5">
                <div className="flex gap-1 overflow-x-auto py-2" role="tablist" aria-label="Secciones de la ficha de usuario">
                    {TABS.map((item) => {
                        const active = tab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setTab(item.id)}
                                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    active
                                        ? 'bg-[var(--surface)] text-[var(--fg)] shadow-xs border border-[var(--border)]'
                                        : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
                                }`}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-6 p-5">
                {tab === 'overview' ? (
                    <>
                        <Section title="Identidad y contacto">
                            <dl className="grid gap-3 rounded-xl border border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Info label="Teléfono / WhatsApp" value={user.phone || 'Sin teléfono'} />
                                <Info label="RUT" value={user.rut || 'Sin RUT'} />
                                <Info label="Acceso" value={user.provider === 'google' ? 'Google OAuth' : 'Correo y clave'} />
                                <Info label="Plataforma base" value={verticalLabel(user.primaryVertical)} />
                                <Info label="Actividad" value={activitySummary(user)} />
                                <Info label="Registro" value={formatDateTime(user.createdAt)} />
                                <Info label="Origen de registro" value={user.signupSourceLabel || 'Directo'} />
                                <Info label="ID de usuario" value={user.id} mono />
                            </dl>
                        </Section>

                        {user.agendaProfile ? (
                            <Section
                                title="Perfil en SimpleAgenda"
                                action={agendaUrl ? (
                                    <a
                                        href={agendaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--fg)] hover:underline"
                                    >
                                        Ver página pública <IconExternalLink size={12} />
                                    </a>
                                ) : null}
                            >
                                <dl className="grid gap-3 rounded-xl border border-[var(--border)] p-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <Info label="Nombre público" value={user.agendaProfile.displayName || user.name} />
                                    <div>
                                        <dt className="text-xs text-[var(--fg-muted)]">Enlace / slug</dt>
                                        <dd className="mt-0.5 flex items-center gap-2 text-sm font-medium text-[var(--fg)]">
                                            <span className="truncate">/{user.agendaProfile.slug}</span>
                                            <button
                                                type="button"
                                                onClick={() => void copyText(user.agendaProfile!.slug, 'slug')}
                                                className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px] hover:bg-[var(--bg-subtle)]"
                                            >
                                                {copiedField === 'slug' ? <IconCheck size={10} /> : <IconCopy size={10} />}
                                            </button>
                                        </dd>
                                    </div>
                                    <Info label="Visibilidad" value={user.agendaProfile.isPublished ? 'Publicado' : 'Privado (oculto)'} />
                                    <Info
                                        label="Dominio propio"
                                        value={user.agendaProfile.customDomain
                                            ? `${user.agendaProfile.customDomain} (${user.agendaProfile.customDomainStatus})`
                                            : 'Sin dominio conectado'}
                                    />
                                    <Info
                                        label="Créditos extra WhatsApp"
                                        value={`${user.agendaProfile.whatsappExtraCredits} disponibles`}
                                    />
                                </dl>
                            </Section>
                        ) : null}

                        <Section title="Calidad de cuenta y señales">
                            <div className="rounded-xl border border-[var(--border)] p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-[var(--fg)]">{user.realness.label}</p>
                                    <span className="text-xs font-medium text-[var(--fg-muted)]">Puntaje: {user.realness.score}/100</span>
                                </div>
                                {user.realness.reasons.length > 0 ? (
                                    <ul className="flex flex-wrap gap-1.5">
                                        {user.realness.reasons.map((reason) => (
                                            <li key={reason} className="rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-0.5 text-xs text-[var(--fg-secondary)]">
                                                {reason}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        </Section>
                    </>
                ) : null}

                {tab === 'subscriptions' ? (
                    <>
                        <Section
                            title="Planes actuales"
                            action={capabilities.manageSubscriptions ? (
                                <PanelButton size="sm" onClick={onSubscriptions}>
                                    <IconCreditCard size={14} /> Ajustar planes o créditos WA
                                </PanelButton>
                            ) : null}
                        >
                            <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                                {(['agenda', 'autos', 'propiedades', 'serenatas'] as const).map((vertical) => {
                                    const sub = user.subscriptions?.[vertical];
                                    const expiresAt = sub && 'expiresAt' in sub ? sub.expiresAt : null;
                                    return (
                                        <div key={vertical} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--fg)]">{verticalLabel(vertical)}</p>
                                                {expiresAt ? (
                                                    <p className="text-xs text-[var(--fg-muted)]">
                                                        Vence: {new Date(expiresAt).toLocaleDateString('es-CL')}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <span className="text-xs font-medium text-[var(--fg-secondary)]">{getSubscriptionSummary(user, vertical)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>

                        <Section title="Espacios de trabajo asociados">
                            {user.accounts.length > 0 ? (
                                <div className="space-y-2.5">
                                    {user.accounts.map((account) => (
                                        <div key={account.id} className="rounded-xl border border-[var(--border)] p-3.5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-[var(--fg)]">{account.name}</p>
                                                    <p className="text-xs text-[var(--fg-muted)]">
                                                        {account.isPersonal ? 'Espacio personal' : `Empresa / equipo (${account.type})`} · Rol: {account.role}
                                                    </p>
                                                </div>
                                                {account.isDefault ? <PanelStatusBadge label="Principal" tone="info" size="sm" /> : null}
                                            </div>
                                            {account.subscriptions?.agenda ? (
                                                <p className="mt-2 border-t border-[var(--border)] pt-2 text-xs text-[var(--fg-secondary)]">
                                                    SimpleAgenda: <strong>{account.subscriptions.agenda.plan === 'enterprise' ? 'Negocios' : account.subscriptions.agenda.plan === 'pro' ? 'Pro' : 'Gratis'}</strong> ({account.subscriptions.agenda.status})
                                                </p>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--fg-muted)]">No tiene espacios de trabajo registrados.</p>
                            )}
                        </Section>
                    </>
                ) : null}

                {tab === 'platforms' ? (
                    <>
                        <Section title="Plataformas activadas">
                            {user.platformAccesses.length ? (
                                <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">
                                    {user.platformAccesses.map((access) => (
                                        <div key={access.app} className="flex items-center justify-between gap-3 px-4 py-3">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--fg)]">{access.label}</p>
                                                <p className="text-xs text-[var(--fg-muted)]">
                                                    Activada {formatDateTime(access.activatedAt)}
                                                    {access.lastLoginAt ? ` · Último acceso ${formatDateTime(access.lastLoginAt)}` : ''}
                                                </p>
                                            </div>
                                            <PanelStatusBadge label={access.status === 'active' ? 'Activa' : access.status} tone={access.status === 'active' ? 'success' : 'neutral'} />
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-[var(--fg-muted)]">Sin plataformas activadas.</p>}
                        </Section>

                        <Section title="Actividad en catálogos y citas">
                            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--border)] p-4 sm:grid-cols-4">
                                <Info label="Total registros" value={String(user.totalListings)} />
                                <Info label="Agenda" value={String(user.agendaListings)} />
                                <Info label="Autos" value={String(user.autosListings)} />
                                <Info label="Propiedades" value={String(user.propiedadesListings)} />
                            </dl>
                        </Section>

                        {capabilities.manageSerenatas ? (
                            <Section title="Perfiles en SimpleSerenatas">
                                <div className="grid grid-cols-3 gap-2">
                                    {SERENATAS_PROFILE_OPTIONS.map((option) => {
                                        const active = Boolean(user.serenatas?.[option.value]);
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                disabled={active}
                                                onClick={() => onSerenatasProfile(option.value)}
                                                className="flex min-h-11 flex-col items-center justify-center rounded-xl border px-2 py-2 text-sm font-medium transition-colors disabled:cursor-default"
                                                style={{
                                                    borderColor: active ? 'var(--success)' : 'var(--border)',
                                                    background: active ? 'var(--bg-subtle)' : 'var(--surface)',
                                                    color: 'var(--fg)',
                                                }}
                                            >
                                                <span>{option.label}</span>
                                                <span className="text-[11px] font-normal text-[var(--fg-muted)]">{active ? 'Activo' : 'Agregar'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="mt-2 text-xs text-[var(--fg-muted)]">Los perfiles pueden convivir en una cuenta. Agregar uno conserva los demás.</p>
                            </Section>
                        ) : null}
                    </>
                ) : null}

                {tab === 'actions' ? (
                    <>
                        <Section title="Acciones administrativas rápidas">
                            <div className="grid gap-3 sm:grid-cols-2">
                                {capabilities.manageUsers ? (
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--fg)]">
                                                {user.status === 'suspended' ? 'Reactivar cuenta' : 'Suspender cuenta'}
                                            </p>
                                            <p className="text-xs text-[var(--fg-muted)]">
                                                {user.status === 'suspended'
                                                    ? 'Devuelve acceso completo como verificado.'
                                                    : 'Bloquea acceso al panel sin borrar datos.'}
                                            </p>
                                        </div>
                                        <PanelButton
                                            size="sm"
                                            variant="secondary"
                                            disabled={!capabilities.deleteUsers}
                                            onClick={() => onToggleStatus(nextToggleStatus)}
                                        >
                                            {user.status === 'suspended' ? <IconShieldCheck size={14} /> : <IconShieldOff size={14} />}
                                            {user.status === 'suspended' ? 'Reactivar' : 'Suspender'}
                                        </PanelButton>
                                    </div>
                                ) : null}
                                {capabilities.sendEmail ? (
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--fg)]">Contactar por correo</p>
                                            <p className="text-xs text-[var(--fg-muted)]">Envía aviso con plantillas de Simple.</p>
                                        </div>
                                        <PanelButton size="sm" variant="secondary" onClick={onEmail}>
                                            <IconMail size={14} /> Redactar
                                        </PanelButton>
                                    </div>
                                ) : null}
                            </div>
                        </Section>

                        {capabilities.deleteUsers ? (
                            <Section title="Zona peligrosa">
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-4">
                                    <div>
                                        <p className="text-sm font-semibold text-[var(--fg)]">Eliminar cuenta permanentemente</p>
                                        <p className="text-xs text-[var(--fg-muted)]">Borra usuario, accesos, citas y datos asociados en todas las plataformas.</p>
                                    </div>
                                    <PanelButton size="sm" variant="danger" onClick={onDelete}>
                                        <IconTrash size={14} /> Eliminar cuenta
                                    </PanelButton>
                                </div>
                            </Section>
                        ) : null}
                    </>
                ) : null}
            </div>
        </PanelScrollModal>
    );
}

export function UserAvatar({ user, size = 'md' }: { user: AdminUserSnapshot; size?: 'md' | 'lg' }) {
    const initials = user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || user.email[0]?.toUpperCase() || 'U';
    return (
        <div className={`flex shrink-0 items-center justify-center rounded-full border font-semibold ${size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs'}`} style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)', color: 'var(--fg)' }}>
            {initials}
        </div>
    );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <dt className="text-xs text-[var(--fg-muted)]">{label}</dt>
            <dd className={`mt-0.5 break-all text-sm font-medium text-[var(--fg)] ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
        </div>
    );
}
