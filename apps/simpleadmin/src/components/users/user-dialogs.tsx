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

type SubscriptionForm = Record<AdminVertical, { plan: string; status: string; expiresAt: string; trialEndsAt?: string }>;

export function SubscriptionsDialog({ user, onClose, onCompleted }: DialogProps & { user: AdminUserSnapshot }) {
    const [form, setForm] = useState<SubscriptionForm>(() => ({
        agenda: { plan: user.subscriptions?.agenda?.plan ?? 'free', status: user.subscriptions?.agenda?.status ?? 'free', expiresAt: toDateInputValue(user.subscriptions?.agenda?.expiresAt) },
        autos: { plan: user.subscriptions?.autos?.planId ?? 'free', status: user.subscriptions?.autos?.status ?? 'cancelled', expiresAt: toDateInputValue(user.subscriptions?.autos?.expiresAt) },
        propiedades: { plan: user.subscriptions?.propiedades?.planId ?? 'free', status: user.subscriptions?.propiedades?.status ?? 'cancelled', expiresAt: toDateInputValue(user.subscriptions?.propiedades?.expiresAt) },
        serenatas: { plan: user.subscriptions?.serenatas?.planId ?? 'free', status: user.subscriptions?.serenatas?.status ?? 'cancelled', expiresAt: toDateInputValue(user.subscriptions?.serenatas?.expiresAt), trialEndsAt: toDateInputValue(user.serenatas?.trialEndsAt) },
    }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setField = (vertical: AdminVertical, field: string, value: string) => setForm((current) => ({
        ...current,
        [vertical]: { ...current[vertical], [field]: value },
    }));

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            await updateAdminUserSubscriptions(user.id, {
                agenda: { plan: form.agenda.plan, expiresAt: dateInputToIso(form.agenda.expiresAt) },
                autos: { planId: form.autos.plan, status: form.autos.plan === 'free' ? 'cancelled' : form.autos.status, expiresAt: dateInputToIso(form.autos.expiresAt) },
                propiedades: { planId: form.propiedades.plan, status: form.propiedades.plan === 'free' ? 'cancelled' : form.propiedades.status, expiresAt: dateInputToIso(form.propiedades.expiresAt) },
                serenatas: { planId: form.serenatas.plan, status: form.serenatas.plan === 'free' ? 'cancelled' : form.serenatas.status, expiresAt: dateInputToIso(form.serenatas.expiresAt), trialEndsAt: dateInputToIso(form.serenatas.trialEndsAt ?? '') },
            });
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
                    <PanelButton onClick={() => void save()} loading={saving} disabled={saving}>Guardar</PanelButton>
                </div>
            )}
        >
            <div className="space-y-3 p-5">
                {(['agenda', 'autos', 'propiedades', 'serenatas'] as const).map((vertical) => (
                    <section key={vertical} className="border-b border-[var(--border)] pb-4 last:border-0">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-[var(--fg)]">{verticalLabel(vertical)}</h3>
                            <p className="text-xs text-[var(--fg-muted)]">{getSubscriptionSummary(user, vertical)}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Field label="Plan"><ModernSelect value={form[vertical].plan} onChange={(value) => setField(vertical, 'plan', value)} options={PLAN_OPTIONS[vertical]} /></Field>
                            <Field label="Estado"><ModernSelect value={form[vertical].status} onChange={(value) => setField(vertical, 'status', value)} options={SUBSCRIPTION_STATUS_OPTIONS} disabled={form[vertical].plan === 'free'} /></Field>
                            <Field label="Expiración"><input className="form-input" type="date" value={form[vertical].expiresAt} onChange={(event) => setField(vertical, 'expiresAt', event.target.value)} /></Field>
                            {vertical === 'serenatas' ? <Field label="Fin prueba dueño" className="sm:col-start-3"><input className="form-input" type="date" value={form.serenatas.trialEndsAt} onChange={(event) => setField('serenatas', 'trialEndsAt', event.target.value)} /></Field> : null}
                        </div>
                    </section>
                ))}
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
