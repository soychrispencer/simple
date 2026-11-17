'use client';

import { IconEdit, IconMail, IconTrash } from '@tabler/icons-react';
import { PanelButton, PanelScrollModal, PanelStatusBadge } from '@simple/ui/panel';
import type { AdminUserSnapshot } from '@/lib/api';
import {
    activitySummary,
    formatDateTime,
    getSubscriptionSummary,
    roleLabel,
    SERENATAS_PROFILE_OPTIONS,
    statusLabel,
    statusTone,
    verticalLabel,
    type AdminCapabilities,
    type SerenatasProfile,
} from './user-domain';

export function UserDetailSheet({
    user,
    capabilities,
    onClose,
    onEdit,
    onEmail,
    onSubscriptions,
    onDelete,
    onSerenatasProfile,
}: {
    user: AdminUserSnapshot;
    capabilities: AdminCapabilities;
    onClose: () => void;
    onEdit: () => void;
    onEmail: () => void;
    onSubscriptions: () => void;
    onDelete: () => void;
    onSerenatasProfile: (profile: SerenatasProfile) => void;
}) {
    return (
        <PanelScrollModal
            title={user.name}
            subtitle={user.email}
            onClose={onClose}
            size="md"
            height="tall"
            headerContent={(
                <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} size="lg" />
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-[var(--fg)]">{user.name}</h2>
                        <p className="truncate text-sm text-[var(--fg-muted)]">{user.email}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            <PanelStatusBadge label={roleLabel(user.role)} />
                            <PanelStatusBadge label={statusLabel(user.status)} tone={statusTone(user.status)} />
                        </div>
                    </div>
                </div>
            )}
        >
            <div className="space-y-6 p-5">
                <div className="flex flex-wrap gap-2">
                    {capabilities.manageUsers ? <PanelButton size="sm" onClick={onEdit}><IconEdit size={15} /> Editar</PanelButton> : null}
                    {capabilities.sendEmail ? <PanelButton size="sm" variant="secondary" onClick={onEmail}><IconMail size={15} /> Correo</PanelButton> : null}
                    {capabilities.manageSubscriptions ? <PanelButton size="sm" variant="secondary" onClick={onSubscriptions}>Suscripciones</PanelButton> : null}
                    {capabilities.deleteUsers ? <PanelButton size="sm" variant="danger" onClick={onDelete}><IconTrash size={15} /> Eliminar</PanelButton> : null}
                </div>

                <Section title="Cuenta">
                    <dl className="grid gap-3 sm:grid-cols-2">
                        <Info label="Teléfono" value={user.phone || 'Sin teléfono'} />
                        <Info label="RUT" value={user.rut || 'Sin RUT'} />
                        <Info label="Proveedor" value={user.provider === 'google' ? 'Google' : 'Email'} />
                        <Info label="Actividad" value={activitySummary(user)} />
                        <Info label="Origen" value={user.signupSourceLabel} />
                    </dl>
                </Section>

                <Section title="Plataformas">
                    {user.platformAccesses.length ? (
                        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                            {user.platformAccesses.map((access) => (
                                <div key={access.app} className="flex items-center justify-between gap-3 py-3">
                                    <div>
                                        <p className="text-sm font-medium text-[var(--fg)]">{access.label}</p>
                                        <p className="text-xs text-[var(--fg-muted)]">Activada {formatDateTime(access.activatedAt)}</p>
                                    </div>
                                    <PanelStatusBadge label={access.status === 'active' ? 'Activa' : access.status} tone={access.status === 'active' ? 'success' : 'neutral'} />
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-[var(--fg-muted)]">Sin plataformas activadas.</p>}
                </Section>

                <Section title="Suscripciones" action={capabilities.manageSubscriptions ? <button type="button" onClick={onSubscriptions} className="text-xs font-medium text-[var(--fg)]">Editar</button> : null}>
                    {user.accounts.find((account) => account.isDefault) ? (
                        <p className="mb-2 text-xs text-[var(--fg-muted)]">Espacio principal: {user.accounts.find((account) => account.isDefault)?.name}</p>
                    ) : null}
                    <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                        {(['agenda', 'autos', 'propiedades', 'serenatas'] as const).map((vertical) => (
                            <div key={vertical} className="flex items-center justify-between gap-3 py-2.5">
                                <span className="text-sm text-[var(--fg)]">{verticalLabel(vertical)}</span>
                                <span className="text-xs text-[var(--fg-muted)]">{getSubscriptionSummary(user, vertical)}</span>
                            </div>
                        ))}
                    </div>
                </Section>

                {capabilities.manageSerenatas ? (
                    <Section title="Perfil SimpleSerenatas">
                        <div className="grid grid-cols-3 gap-2">
                            {SERENATAS_PROFILE_OPTIONS.map((option) => {
                                const active = Boolean(user.serenatas?.[option.value]);
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={active}
                                        onClick={() => onSerenatasProfile(option.value)}
                                        className="flex min-h-11 flex-col items-center justify-center border px-2 py-1 text-sm font-medium transition-colors disabled:cursor-default"
                                        style={{
                                            borderColor: active ? 'var(--success)' : 'var(--border)',
                                            background: active ? 'var(--bg-subtle)' : 'var(--surface)',
                                            color: 'var(--fg)',
                                        }}
                                    >
                                        <span>{option.label}</span>
                                        <span className="text-[11px] font-normal" style={{ color: 'var(--fg-muted)' }}>{active ? 'Activo' : 'Agregar'}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-xs text-[var(--fg-muted)]">Los perfiles pueden convivir en una cuenta. Agregar uno conserva los demás.</p>
                    </Section>
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
                <h3 className="text-xs font-semibold uppercase text-[var(--fg-muted)]">{title}</h3>
                {action}
            </div>
            {children}
        </section>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-xs text-[var(--fg-muted)]">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-[var(--fg)]">{value}</dd>
        </div>
    );
}
