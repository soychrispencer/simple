'use client';

import { useState } from 'react';
import { ModernSelect } from '@simple/ui';
import { PanelButton, PanelNotice, PanelScrollModal } from '@simple/ui/panel';
import {
    sendAdminBulkEmail,
    sendAdminUserEmail,
    updateAdminUser,
    updateAdminUserSubscriptions,
    type AdminUserRole,
    type AdminUserSnapshot,
    type AdminUserStatus,
    type AdminVertical,
} from '@/lib/api';
import { EMAIL_TEMPLATES } from './email-templates';
import {
    dateInputToIso,
    getSubscriptionSummary,
    PLAN_OPTIONS,
    PRIMARY_VERTICAL_OPTIONS,
    ROLE_OPTIONS,
    STATUS_OPTIONS,
    SUBSCRIPTION_STATUS_OPTIONS,
    toDateInputValue,
    verticalLabel,
    type PrimaryVerticalValue,
} from './user-domain';

type DialogProps = { onClose: () => void; onCompleted: () => void };

export function EditUserDialog({ user, currentUserId, onClose, onCompleted }: DialogProps & { user: AdminUserSnapshot; currentUserId: string }) {
    const [name, setName] = useState(user.name);
    const [phone, setPhone] = useState(user.phone ?? '');
    const [rut, setRut] = useState(user.rut ?? '');
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
                name: name.trim(),
                phone: phone.trim() || null,
                rut: rut.trim() || null,
                primaryVertical: primaryVertical === 'none' ? null : primaryVertical,
                role,
                status,
            });
            onCompleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo guardar el usuario.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PanelScrollModal
            title="Editar usuario"
            subtitle={user.email}
            onClose={onClose}
            size="md"
            footer={(
                <div className="flex justify-end gap-2 px-5 py-4">
                    <PanelButton variant="secondary" onClick={onClose} disabled={saving}>Cancelar</PanelButton>
                    <PanelButton onClick={() => void save()} loading={saving} disabled={saving || !name.trim()}>Guardar</PanelButton>
                </div>
            )}
        >
            <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Nombre"><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} /></Field>
                <Field label="Teléfono"><input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56978623828" /></Field>
                <Field label="RUT"><input className="form-input" value={rut} onChange={(event) => setRut(event.target.value)} placeholder="12345678-9" /></Field>
                <Field label="Rol"><ModernSelect value={role} onChange={(value) => setRole(value as AdminUserRole)} options={ROLE_OPTIONS} disabled={user.id === currentUserId} /></Field>
                <Field label="Estado"><ModernSelect value={status} onChange={(value) => setStatus(value as AdminUserStatus)} options={STATUS_OPTIONS.filter((option) => option.value !== 'all') as Array<{ value: AdminUserStatus; label: string }>} disabled={user.id === currentUserId} /></Field>
                <Field label="Plataforma base" className="sm:col-span-2"><ModernSelect value={primaryVertical} onChange={(value) => setPrimaryVertical(value as PrimaryVerticalValue)} options={PRIMARY_VERTICAL_OPTIONS} /></Field>
                {error ? <PanelNotice tone="error" className="sm:col-span-2">{error}</PanelNotice> : null}
            </div>
        </PanelScrollModal>
    );
}

export function EmailUserDialog({ user, userIds, onClose, onCompleted }: DialogProps & { user?: AdminUserSnapshot; userIds?: string[] }) {
    const [templateId, setTemplateId] = useState('custom');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [actionLabel, setActionLabel] = useState('');
    const [actionUrl, setActionUrl] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const brandVertical = user?.likelySignupVertical ?? user?.primaryVertical ?? null;

    const applyTemplate = (id: string) => {
        setTemplateId(id);
        const template = EMAIL_TEMPLATES.find((item) => item.id === id);
        if (!template || template.id === 'custom') return;
        setSubject(template.subject);
        setMessage(user ? template.message.replaceAll('{{name}}', user.name || 'tu cuenta') : template.message);
        setActionLabel(template.actionLabel);
        setActionUrl(template.actionUrl);
    };

    const send = async () => {
        setSending(true);
        setError('');
        try {
            const payload = {
                subject: subject.trim(),
                message: message.trim(),
                actionLabel: actionLabel.trim() || undefined,
                actionUrl: actionUrl.trim() || undefined,
                brandVertical,
            };
            if (user) await sendAdminUserEmail(user.id, payload);
            else await sendAdminBulkEmail({ userIds: userIds ?? [], ...payload });
            onCompleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo enviar el correo.');
        } finally {
            setSending(false);
        }
    };

    return (
        <PanelScrollModal
            title={user ? `Correo a ${user.name}` : 'Correo masivo'}
            subtitle={user?.email ?? `${userIds?.length ?? 0} usuarios seleccionados`}
            onClose={onClose}
            size="lg"
            height="tall"
            footer={(
                <div className="flex justify-end gap-2 px-5 py-4">
                    <PanelButton variant="secondary" onClick={onClose} disabled={sending}>Cancelar</PanelButton>
                    <PanelButton onClick={() => void send()} loading={sending} disabled={sending || subject.trim().length < 3 || message.trim().length < 5}>Enviar</PanelButton>
                </div>
            )}
        >
            <div className="space-y-4 p-5">
                <Field label="Plantilla"><ModernSelect value={templateId} onChange={applyTemplate} options={EMAIL_TEMPLATES.map((template) => ({ value: template.id, label: template.label }))} /></Field>
                <Field label="Asunto"><input className="form-input" value={subject} onChange={(event) => setSubject(event.target.value)} /></Field>
                <Field label="Mensaje"><textarea className="form-input min-h-40 resize-y py-2" value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
                <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                    <Field label="Texto del botón"><input className="form-input" value={actionLabel} onChange={(event) => setActionLabel(event.target.value)} placeholder="Abrir panel" /></Field>
                    <Field label="Enlace"><input className="form-input" value={actionUrl} onChange={(event) => setActionUrl(event.target.value)} placeholder="https://..." /></Field>
                </div>
                <p className="text-xs text-[var(--fg-muted)]">Marca: {brandVertical ? verticalLabel(brandVertical) : 'SimplePlataforma'}</p>
                {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            </div>
        </PanelScrollModal>
    );
}

type SubscriptionFields = { plan: string; status: string; expiresAt: string; trialEndsAt: string };
type SubscriptionForm = {
    agenda: { plan: string; status: string; expiresAt: string };
    autos: { plan: string; status: string; expiresAt: string };
    propiedades: { plan: string; status: string; expiresAt: string };
    serenatas: { provider: SubscriptionFields; musician: SubscriptionFields };
};

function subscriptionFormFor(user: AdminUserSnapshot, accountId: string): SubscriptionForm {
    const account = user.accounts.find((item) => item.id === accountId);
    const subscriptions = account?.subscriptions ?? (user.accounts.length === 0 ? user.subscriptions : undefined);
    const personalSubscriptions = user.accounts.find((item) => item.isPersonal)?.subscriptions;
    const serenatasProviderSubscription = personalSubscriptions?.serenatasProvider
        ?? user.subscriptions?.serenatasProvider
        ?? personalSubscriptions?.serenatas
        ?? user.subscriptions?.serenatas;
    const serenatasMusicianSubscription = personalSubscriptions?.serenatasMusician
        ?? user.subscriptions?.serenatasMusician;
    const serenatasFields = (
        subscription: typeof serenatasProviderSubscription,
        trialEndsAt?: string | null,
    ): SubscriptionFields => ({
        plan: subscription?.planId ?? 'free',
        status: subscription?.status ?? 'cancelled',
        expiresAt: toDateInputValue(subscription?.expiresAt),
        trialEndsAt: toDateInputValue(trialEndsAt),
    });
    return {
        agenda: {
            plan: subscriptions?.agenda?.plan ?? 'free',
            status: subscriptions?.agenda?.status ?? 'free',
            expiresAt: toDateInputValue(subscriptions?.agenda?.expiresAt),
        },
        autos: { plan: subscriptions?.autos?.planId ?? 'free', status: subscriptions?.autos?.status ?? 'cancelled', expiresAt: toDateInputValue(subscriptions?.autos?.expiresAt) },
        propiedades: { plan: subscriptions?.propiedades?.planId ?? 'free', status: subscriptions?.propiedades?.status ?? 'cancelled', expiresAt: toDateInputValue(subscriptions?.propiedades?.expiresAt) },
        serenatas: {
            provider: serenatasFields(serenatasProviderSubscription, user.serenatas?.trialEndsAt),
            musician: serenatasFields(serenatasMusicianSubscription, user.serenatas?.musicianTrialEndsAt),
        },
    };
}

export function SubscriptionsDialog({ user, onClose, onCompleted }: DialogProps & { user: AdminUserSnapshot }) {
    const [accountId, setAccountId] = useState(user.accounts.find((item) => item.isDefault)?.id ?? user.accounts[0]?.id ?? '');
    const [form, setForm] = useState<SubscriptionForm>(() => subscriptionFormFor(user, user.accounts.find((item) => item.isDefault)?.id ?? user.accounts[0]?.id ?? ''));
    const [dirtyVerticals, setDirtyVerticals] = useState<Set<'agenda' | 'autos' | 'propiedades'>>(() => new Set());
    const [dirtySerenatasProfiles, setDirtySerenatasProfiles] = useState<Set<'provider' | 'musician'>>(() => new Set());
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const selectedAccount = user.accounts.find((item) => item.id === accountId) ?? null;
    const personalSubscriptions = user.accounts.find((item) => item.isPersonal)?.subscriptions;
    const serenatasProviderSubscription = personalSubscriptions?.serenatasProvider
        ?? user.subscriptions?.serenatasProvider
        ?? personalSubscriptions?.serenatas
        ?? user.subscriptions?.serenatas;
    const serenatasMusicianSubscription = personalSubscriptions?.serenatasMusician
        ?? user.subscriptions?.serenatasMusician;
    const selectedSubscriptions = selectedAccount?.subscriptions ?? (user.accounts.length === 0 ? user.subscriptions : undefined);
    const summaryUser = {
        ...user,
        subscriptions: selectedSubscriptions || serenatasProviderSubscription || serenatasMusicianSubscription
            ? {
                ...selectedSubscriptions,
                serenatas: serenatasProviderSubscription,
                serenatasProvider: serenatasProviderSubscription,
                serenatasMusician: serenatasMusicianSubscription,
            }
            : undefined,
    };

    const changeAccount = (nextAccountId: string) => {
        setAccountId(nextAccountId);
        setForm(subscriptionFormFor(user, nextAccountId));
        setDirtyVerticals(new Set());
        setDirtySerenatasProfiles(new Set());
        setError('');
    };

    const setField = (vertical: 'agenda' | 'autos' | 'propiedades', field: string, value: string) => {
        setForm((current) => {
            const resetAgendaExpiration = vertical === 'agenda'
                && field === 'plan'
                && (value === 'pro' || value === 'pro_plus')
                && current.agenda.plan !== value;
            return {
                ...current,
                [vertical]: {
                    ...current[vertical],
                    [field]: value,
                    ...(resetAgendaExpiration ? { expiresAt: '' } : {}),
                },
            };
        });
        setDirtyVerticals((current) => new Set(current).add(vertical));
    };

    const setSerenatasField = (profileType: 'provider' | 'musician', field: keyof SubscriptionFields, value: string) => {
        setForm((current) => ({
            ...current,
            serenatas: {
                ...current.serenatas,
                [profileType]: { ...current.serenatas[profileType], [field]: value },
            },
        }));
        setDirtySerenatasProfiles((current) => new Set(current).add(profileType));
    };

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            const changes: Record<string, unknown> = {};
            for (const vertical of dirtyVerticals) {
                if (vertical === 'agenda') {
                    changes.agenda = { plan: form.agenda.plan, expiresAt: dateInputToIso(form.agenda.expiresAt) };
                } else {
                    changes[vertical] = {
                        planId: form[vertical].plan,
                        status: form[vertical].plan === 'free' ? 'cancelled' : form[vertical].status,
                        expiresAt: dateInputToIso(form[vertical].expiresAt),
                    };
                }
            }
            for (const profileType of dirtySerenatasProfiles) {
                const fields = form.serenatas[profileType];
                const key = profileType === 'provider' ? 'serenatasProvider' : 'serenatasMusician';
                changes[key] = {
                    planId: fields.plan,
                    status: fields.plan === 'free' ? 'cancelled' : fields.status,
                    expiresAt: dateInputToIso(fields.expiresAt),
                    trialEndsAt: dateInputToIso(fields.trialEndsAt),
                };
            }
            await updateAdminUserSubscriptions(user.id, accountId || null, changes);
            onCompleted();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudieron guardar las suscripciones.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PanelScrollModal
            title="Suscripciones"
            subtitle={user.name}
            onClose={onClose}
            size="3xl"
            height="tall"
            footer={(
                <div className="flex justify-end gap-2 px-5 py-4">
                    <PanelButton variant="secondary" onClick={onClose} disabled={saving}>Cancelar</PanelButton>
                    <PanelButton onClick={() => void save()} loading={saving} disabled={saving || (dirtyVerticals.size === 0 && dirtySerenatasProfiles.size === 0)}>Guardar</PanelButton>
                </div>
            )}
        >
            <div className="space-y-3 p-5">
                {user.accounts.length > 1 ? (
                    <Field label="Espacio de trabajo">
                        <ModernSelect
                            value={accountId}
                            onChange={changeAccount}
                            options={user.accounts.map((account) => ({
                                value: account.id,
                                label: `${account.name}${account.isPersonal ? ' · Personal' : ''}${account.isDefault ? ' · Principal' : ''}`,
                            }))}
                        />
                    </Field>
                ) : selectedAccount ? (
                    <div className="border-b border-[var(--border)] pb-3">
                        <p className="text-sm font-medium text-[var(--fg)]">{selectedAccount.name}</p>
                        <p className="text-xs text-[var(--fg-muted)]">{selectedAccount.isPersonal ? 'Espacio personal' : 'Planes de este espacio de trabajo'}</p>
                    </div>
                ) : (
                    <PanelNotice tone="info">Este usuario aún no tiene un espacio de trabajo. Al asignar un plan, se creará su espacio personal.</PanelNotice>
                )}
                {(['agenda', 'autos', 'propiedades'] as const).map((vertical) => (
                    <section key={vertical} className="border-b border-[var(--border)] pb-4 last:border-0">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-[var(--fg)]">{verticalLabel(vertical)}</h3>
                            <p className="text-xs text-[var(--fg-muted)]">{getSubscriptionSummary(summaryUser, vertical)}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                                <Field label="Plan"><ModernSelect value={form[vertical].plan} onChange={(value) => setField(vertical, 'plan', value)} options={PLAN_OPTIONS[vertical]} /></Field>
                                {vertical !== 'agenda' ? <Field label="Estado"><ModernSelect value={form[vertical].status} onChange={(value) => setField(vertical, 'status', value)} options={SUBSCRIPTION_STATUS_OPTIONS} disabled={form[vertical].plan === 'free'} /></Field> : null}
                                {vertical !== 'agenda' || form.agenda.plan === 'pro' || form.agenda.plan === 'pro_plus' ? (
                                    <Field label="Expiración"><input className="form-input" type="date" value={form[vertical].expiresAt} onChange={(event) => setField(vertical, 'expiresAt', event.target.value)} /></Field>
                                ) : null}
                                {vertical === 'agenda' ? (
                                    <div className="sm:col-span-3">
                                        <PanelNotice tone="info">
                                            Las cuentas nuevas reciben 30 días de Pro y luego continúan en Gratis. En esta pantalla puedes asignar Gratis, Pro o Pro+; Empresa / Negocios se cotiza según el tamaño del equipo.
                                        </PanelNotice>
                                    </div>
                                ) : null}
                        </div>
                    </section>
                ))}
                {user.serenatas?.owner || user.serenatas?.musician ? (
                    <section className="border-b border-[var(--border)] pb-4 last:border-0">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-[var(--fg)]">SimpleSerenatas</h3>
                            <p className="text-xs text-[var(--fg-muted)]">Cada perfil conserva su propio plan, prueba y comisión.</p>
                        </div>
                        <div className="space-y-4">
                            {(['provider', 'musician'] as const).map((profileType) => {
                                const profileExists = profileType === 'provider' ? user.serenatas?.owner : user.serenatas?.musician;
                                if (!profileExists) return null;
                                const fields = form.serenatas[profileType];
                                const label = profileType === 'provider' ? 'Proveedor' : 'Músico';
                                return (
                                    <div key={profileType} className="rounded-xl border border-[var(--border)] p-3">
                                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--fg-muted)]">Perfil {label}</h4>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            <Field label="Plan">
                                                <ModernSelect value={fields.plan} onChange={(value) => setSerenatasField(profileType, 'plan', value)} options={PLAN_OPTIONS.serenatas} />
                                            </Field>
                                            <Field label="Estado">
                                                <ModernSelect value={fields.status} onChange={(value) => setSerenatasField(profileType, 'status', value)} options={SUBSCRIPTION_STATUS_OPTIONS} disabled={fields.plan === 'free'} />
                                            </Field>
                                            <Field label="Expiración">
                                                <input className="form-input" type="date" value={fields.expiresAt} onChange={(event) => setSerenatasField(profileType, 'expiresAt', event.target.value)} />
                                            </Field>
                                            <Field label="Fin de prueba">
                                                <input className="form-input" type="date" value={fields.trialEndsAt} onChange={(event) => setSerenatasField(profileType, 'trialEndsAt', event.target.value)} />
                                            </Field>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ) : null}
                {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            </div>
        </PanelScrollModal>
    );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <label className={`block space-y-1.5 ${className ?? ''}`}>
            <span className="text-xs font-medium text-[var(--fg-muted)]">{label}</span>
            {children}
        </label>
    );
}
