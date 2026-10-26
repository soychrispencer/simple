'use client';

import { useEffect, useState } from 'react';
import { IconDeviceFloppy, IconPlus } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import { PanelButton, PanelNotice } from '@simple/ui/panel';
import type {
    AdminContactActivityInput,
    AdminContactCreateInput,
    AdminContactProfileInput,
    AdminConversationItem,
} from '@/lib/api';

const VERTICAL_OPTIONS = [
    { value: 'agenda', label: 'SimpleAgenda' }, { value: 'propiedades', label: 'SimplePropiedades' },
    { value: 'autos', label: 'SimpleAutos' }, { value: 'serenatas', label: 'SimpleSerenatas' },
    { value: 'platform', label: 'SimplePlataforma' }, { value: 'general', label: 'Otro / general' },
];
const PURPOSE_OPTIONS = [
    { value: 'alliance', label: 'Alianza o inmobiliaria' }, { value: 'app_invitation', label: 'Invitación a probar' },
    { value: 'client_prospecting', label: 'Posible cliente' }, { value: 'follow_up', label: 'Seguimiento' },
    { value: 'support', label: 'Soporte' }, { value: 'other', label: 'Otro motivo' },
];
const STAGE_OPTIONS = [
    { value: 'new', label: 'Nuevo contacto' }, { value: 'contacted', label: 'Contactado' },
    { value: 'registered', label: 'Registrado' }, { value: 'setup_pending', label: 'Configuración pendiente' },
    { value: 'activated', label: 'Activado' }, { value: 'first_booking', label: 'Primera reserva' },
    { value: 'paid', label: 'Pagó' }, { value: 'paused', label: 'En pausa' }, { value: 'closed', label: 'Cerrado' },
];
const ACTIVITY_OPTIONS = [
    { value: 'message_inbound', label: 'Mensaje recibido' }, { value: 'message_outbound', label: 'Mensaje enviado' },
    { value: 'call', label: 'Llamada' }, { value: 'meeting', label: 'Reunión' },
    { value: 'support', label: 'Soporte' }, { value: 'note', label: 'Nota' }, { value: 'other', label: 'Otro' },
];
const CHANNEL_OPTIONS = [
    { value: 'whatsapp_personal', label: 'WhatsApp personal' }, { value: 'whatsapp_business', label: 'WhatsApp Business de Simple' },
    { value: 'email', label: 'Correo electrónico' }, { value: 'instagram_dm', label: 'Mensaje de Instagram' },
    { value: 'phone', label: 'Teléfono' }, { value: 'meeting', label: 'Reunión' }, { value: 'other', label: 'Otro canal' },
];
const ORIGIN_OPTIONS = [
    { value: 'unknown', label: 'No lo sé todavía' }, { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' }, { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'website', label: 'Sitio web' }, { value: 'referral', label: 'Recomendación' },
    { value: 'personal_network', label: 'Red de contactos personal' }, { value: 'organic_search', label: 'Búsqueda en internet' },
    { value: 'direct', label: 'Contacto directo' }, { value: 'other', label: 'Otro' },
];

type ContactFormValues = {
    name: string; email: string; company: string; sourceVertical: string; purpose: string; campaignName: string;
    origin: string; originDetail: string; referredBy: string; relationshipContext: string; contactStage: string;
    nextAction: string; nextFollowUpDate: string; notes: string;
};

function profileValues(item: AdminConversationItem): ContactFormValues {
    return {
        name: item.name ?? '', email: item.email ?? '', company: item.company ?? '',
        sourceVertical: item.sourceVertical ?? 'general', purpose: item.purpose ?? 'other', campaignName: item.campaignName ?? '',
        origin: item.origin ?? 'unknown', originDetail: item.originDetail ?? '', referredBy: item.referredBy ?? '', relationshipContext: item.relationshipContext ?? '',
        contactStage: item.contactStage || 'new', nextAction: item.nextAction ?? '',
        nextFollowUpDate: item.nextFollowUpDate ?? '', notes: item.notes ?? '',
    };
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
    return <label className={`block space-y-1.5 ${className}`}><span className="text-xs font-medium text-[var(--fg-muted)]">{label}</span>{children}</label>;
}

function ContactFields({ value, onChange, showEmail = true, compact = false }: { value: ContactFormValues; onChange: (value: ContactFormValues) => void; showEmail?: boolean; compact?: boolean }) {
    const set = (key: keyof ContactFormValues, next: string) => onChange({ ...value, [key]: next });
    if (compact) return (
        <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><input className="form-input" value={value.name} onChange={(event) => set('name', event.target.value)} autoComplete="name" maxLength={160} /></Field>
            <Field label="Simple / servicio"><ModernSelect value={value.sourceVertical} onChange={(next) => set('sourceVertical', next)} options={VERTICAL_OPTIONS} ariaLabel="Servicio relacionado" /></Field>
            <Field label="¿De dónde llegó?"><ModernSelect value={value.origin} onChange={(next) => set('origin', next)} options={ORIGIN_OPTIONS} ariaLabel="Origen del contacto" /></Field>
            <Field label="Detalle del origen (opcional)"><input className="form-input" value={value.originDetail} onChange={(event) => set('originDetail', event.target.value)} placeholder="Ej. reel, recomendado por Mari" maxLength={180} /></Field>
        </div>
    );
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre"><input className="form-input" value={value.name} onChange={(event) => set('name', event.target.value)} autoComplete="name" maxLength={160} /></Field>
            <Field label="Empresa"><input className="form-input" value={value.company} onChange={(event) => set('company', event.target.value)} autoComplete="organization" maxLength={160} /></Field>
            {showEmail ? <Field label="Correo"><input className="form-input" type="email" value={value.email} onChange={(event) => set('email', event.target.value)} autoComplete="email" /></Field> : null}
            <Field label="Servicio relacionado"><ModernSelect value={value.sourceVertical} onChange={(next) => set('sourceVertical', next)} options={VERTICAL_OPTIONS} ariaLabel="Servicio relacionado" /></Field>
            <Field label="Motivo"><ModernSelect value={value.purpose} onChange={(next) => set('purpose', next)} options={PURPOSE_OPTIONS} ariaLabel="Motivo del contacto" /></Field>
            <Field label="Etapa"><ModernSelect value={value.contactStage} onChange={(next) => set('contactStage', next)} options={STAGE_OPTIONS} ariaLabel="Etapa comercial" /></Field>
            <Field label="¿De dónde llegó?"><ModernSelect value={value.origin} onChange={(next) => set('origin', next)} options={ORIGIN_OPTIONS} ariaLabel="Origen del contacto" /></Field>
            <Field label="Detalle del origen"><input className="form-input" value={value.originDetail} onChange={(event) => set('originDetail', event.target.value)} placeholder="Ej. reel de configuración" maxLength={180} /></Field>
            <Field label="Quién lo refirió"><input className="form-input" value={value.referredBy} onChange={(event) => set('referredBy', event.target.value)} placeholder="Nombre de quien lo recomendó" maxLength={120} /></Field>
            <Field label="Relación o contexto" className="sm:col-span-2"><input className="form-input" value={value.relationshipContext} onChange={(event) => set('relationshipContext', event.target.value)} placeholder="Ej. amiga de Mari, cliente de SimpleAgenda" maxLength={500} /></Field>
            <Field label="Campaña o gestión"><input className="form-input" value={value.campaignName} onChange={(event) => set('campaignName', event.target.value)} maxLength={160} /></Field>
            <Field label="Próxima acción"><input className="form-input" value={value.nextAction} onChange={(event) => set('nextAction', event.target.value)} placeholder="Ej. ayudar a configurar su agenda" maxLength={500} /></Field>
            <Field label="Fecha de seguimiento"><input className="form-input" type="date" value={value.nextFollowUpDate} onChange={(event) => set('nextFollowUpDate', event.target.value)} /></Field>
            <Field label="Notas" className="sm:col-span-2"><textarea className="form-input min-h-24 py-2" value={value.notes} onChange={(event) => set('notes', event.target.value)} maxLength={3000} placeholder="Información útil para el próximo contacto" /></Field>
        </div>
    );
}

export function NewContactDialog({ onClose, onCreate }: {
    onClose: () => void;
    onCreate: (input: AdminContactCreateInput) => Promise<{ created: boolean }>;
}) {
    const [channel, setChannel] = useState<'whatsapp_personal' | 'whatsapp_business' | 'email'>('whatsapp_personal');
    const [phone, setPhone] = useState('');
    const [value, setValue] = useState<ContactFormValues>({
        name: '', email: '', company: '', sourceVertical: 'agenda', purpose: 'follow_up', campaignName: '', origin: 'unknown', originDetail: '',
        referredBy: '', relationshipContext: '', contactStage: 'new', nextAction: '', nextFollowUpDate: '', notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');
    const actualEmail = value.email.trim();

    const save = async () => {
        if (channel === 'email' ? !actualEmail : !phone.trim()) {
            setError(channel === 'email' ? 'Indica el correo para identificar el contacto.' : 'Indica el teléfono o WhatsApp.');
            return;
        }
        setSaving(true); setError(''); setSaved('');
        try {
            const result = await onCreate({
                channel, phone: phone.trim() || undefined,
                ...value, email: actualEmail || undefined,
                sourceVertical: value.sourceVertical as AdminContactCreateInput['sourceVertical'],
                origin: value.origin as AdminContactCreateInput['origin'],
                purpose: value.purpose as AdminContactCreateInput['purpose'],
                contactStage: value.contactStage as AdminContactCreateInput['contactStage'],
                nextAction: value.nextAction.trim() || undefined, nextFollowUpDate: value.nextFollowUpDate || undefined,
            });
            if (!result.created) {
                setSaved('Ya existía un contacto con esos datos; actualicé su ficha.');
                window.setTimeout(onClose, 1200);
            } else onClose();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar el contacto.');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-labelledby="new-contact-title">
            <div className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
                <header className="border-b border-[var(--border)] px-5 py-4">
                    <h2 id="new-contact-title" className="text-lg font-semibold text-[var(--fg)]">Nuevo contacto</h2>
                    <p className="mt-1 text-sm text-[var(--fg-muted)]">Crea una ficha central en SimpleAdmin. No se envía ningún mensaje.</p>
                </header>
                <div className="max-h-[calc(92vh-140px)] space-y-4 overflow-y-auto p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Canal principal"><ModernSelect value={channel} onChange={(next) => setChannel(next as typeof channel)} options={[{ value: 'whatsapp_personal', label: 'WhatsApp personal' }, { value: 'whatsapp_business', label: 'WhatsApp Business de Simple' }, { value: 'email', label: 'Correo electrónico' }]} ariaLabel="Canal principal" /></Field>
                        {channel === 'email'
                            ? <Field label="Correo para identificarlo"><input className="form-input" type="email" value={value.email} onChange={(event) => setValue({ ...value, email: event.target.value })} autoComplete="email" /></Field>
                            : <Field label="Teléfono / WhatsApp"><input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56 9 1234 5678" autoComplete="tel" />
                                <span className="block text-xs text-[var(--fg-muted)]">Puedes agregar el correo en la ficha.</span></Field>}
                    </div>
                    <ContactFields value={value} onChange={setValue} compact />
                    <details className="rounded-xl border border-[var(--border)] px-4 py-3">
                        <summary className="cursor-pointer text-sm font-medium text-[var(--fg)]">Más datos opcionales</summary>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <Field label="Empresa"><input className="form-input" value={value.company} onChange={(event) => setValue({ ...value, company: event.target.value })} autoComplete="organization" maxLength={160} /></Field>
                            {channel !== 'email'
                                ? <Field label="Correo (opcional)"><input className="form-input" type="email" value={value.email} onChange={(event) => setValue({ ...value, email: event.target.value })} autoComplete="email" /></Field>
                                : <Field label="Teléfono alternativo (opcional)"><input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56 9 1234 5678" autoComplete="tel" /></Field>}
                            <Field label="Motivo"><ModernSelect value={value.purpose} onChange={(next) => setValue({ ...value, purpose: next })} options={PURPOSE_OPTIONS} ariaLabel="Motivo del contacto" /></Field>
                            <Field label="Etapa"><ModernSelect value={value.contactStage} onChange={(next) => setValue({ ...value, contactStage: next })} options={STAGE_OPTIONS} ariaLabel="Etapa comercial" /></Field>
                            <Field label="Quién lo refirió"><input className="form-input" value={value.referredBy} onChange={(event) => setValue({ ...value, referredBy: event.target.value })} placeholder="Nombre" maxLength={120} /></Field>
                            <Field label="Campaña o gestión"><input className="form-input" value={value.campaignName} onChange={(event) => setValue({ ...value, campaignName: event.target.value })} maxLength={160} /></Field>
                            <Field label="Relación o contexto" className="sm:col-span-2"><input className="form-input" value={value.relationshipContext} onChange={(event) => setValue({ ...value, relationshipContext: event.target.value })} placeholder="Ej. amiga de Mari, interesada en SimpleAgenda" maxLength={500} /></Field>
                            <Field label="Próxima acción"><input className="form-input" value={value.nextAction} onChange={(event) => setValue({ ...value, nextAction: event.target.value })} maxLength={500} /></Field>
                            <Field label="Fecha de seguimiento"><input className="form-input" type="date" value={value.nextFollowUpDate} onChange={(event) => setValue({ ...value, nextFollowUpDate: event.target.value })} /></Field>
                            <Field label="Notas" className="sm:col-span-2"><textarea className="form-input min-h-20 py-2" value={value.notes} onChange={(event) => setValue({ ...value, notes: event.target.value })} maxLength={3000} /></Field>
                        </div>
                    </details>
                    {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
                    {saved ? <PanelNotice tone="success">{saved}</PanelNotice> : null}
                </div>
                <footer className="flex justify-end gap-2 border-t border-[var(--border)] px-5 py-4">
                    <PanelButton variant="secondary" onClick={onClose} disabled={saving}>Cancelar</PanelButton>
                    <PanelButton onClick={() => void save()} loading={saving} disabled={saving}><IconPlus size={16} /> Guardar contacto</PanelButton>
                </footer>
            </div>
        </div>
    );
}

export function ContactManagementPanel({ item, onSaveProfile, onLogActivity }: {
    item: AdminConversationItem;
    onSaveProfile: (threadId: string, input: AdminContactProfileInput) => Promise<void>;
    onLogActivity: (threadId: string, input: AdminContactActivityInput) => Promise<void>;
}) {
    const [value, setValue] = useState(() => profileValues(item));
    const [activityType, setActivityType] = useState<AdminContactActivityInput['activityType']>('note');
    const [channel, setChannel] = useState<AdminContactActivityInput['channel']>('whatsapp_personal');
    const [activitySummary, setActivitySummary] = useState('');
    const [nextAction, setNextAction] = useState('');
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingActivity, setSavingActivity] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState('');

    useEffect(() => { setValue(profileValues(item)); }, [item]);

    const saveProfile = async () => {
        setSavingProfile(true); setError(''); setSaved('');
        try {
            await onSaveProfile(item.threadId, {
                name: value.name, email: value.email, company: value.company,
                sourceVertical: value.sourceVertical as AdminContactProfileInput['sourceVertical'],
                purpose: value.purpose as AdminContactProfileInput['purpose'], campaignName: value.campaignName,
                origin: value.origin as AdminContactProfileInput['origin'], originDetail: value.originDetail, referredBy: value.referredBy, relationshipContext: value.relationshipContext,
                contactStage: value.contactStage as AdminContactProfileInput['contactStage'],
                nextAction: value.nextAction, nextFollowUpDate: value.nextFollowUpDate, notes: value.notes,
            });
            setSaved('Ficha guardada.');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la ficha.'); }
        finally { setSavingProfile(false); }
    };

    const logActivity = async () => {
        if (!activitySummary.trim()) { setError('Escribe un resumen antes de guardar la actividad.'); return; }
        setSavingActivity(true); setError(''); setSaved('');
        try {
            await onLogActivity(item.threadId, {
                activityType, channel, summary: activitySummary.trim(),
                ...(nextAction.trim() ? { nextAction: nextAction.trim() } : {}),
                ...(nextFollowUpDate ? { nextFollowUpDate } : {}),
            });
            setActivitySummary(''); setNextAction(''); setNextFollowUpDate(''); setSaved('Actividad registrada.');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo registrar la actividad.'); }
        finally { setSavingActivity(false); }
    };

    return (
        <div className="space-y-5 border-t border-[var(--border)] px-4 py-5 md:px-8">
            <section className="space-y-3">
                <div><h3 className="text-sm font-semibold text-[var(--fg)]">Ficha del contacto</h3><p className="text-xs text-[var(--fg-muted)]">Origen, contexto, etapa comercial y próximo seguimiento.</p></div>
                <ContactFields value={value} onChange={setValue} />
                <div className="flex flex-wrap items-center gap-3">
                    <PanelButton size="sm" onClick={() => void saveProfile()} loading={savingProfile} disabled={savingProfile}><IconDeviceFloppy size={15} /> Guardar ficha</PanelButton>
                    {item.followUpDue ? <span className="text-xs font-medium text-amber-700">Seguimiento vencido</span> : null}
                </div>
            </section>
            <section className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4">
                <div><h3 className="text-sm font-semibold text-[var(--fg)]">Registrar actividad</h3><p className="text-xs text-[var(--fg-muted)]">Anota lo ocurrido. SimpleAdmin no envía mensajes por este formulario.</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Tipo"><ModernSelect value={activityType} onChange={(next) => setActivityType(next as typeof activityType)} options={ACTIVITY_OPTIONS} ariaLabel="Tipo de actividad" /></Field>
                    <Field label="Canal"><ModernSelect value={channel} onChange={(next) => setChannel(next as typeof channel)} options={CHANNEL_OPTIONS} ariaLabel="Canal de actividad" /></Field>
                    <Field label="Resumen de lo ocurrido" className="sm:col-span-2"><textarea className="form-input min-h-20 py-2" value={activitySummary} onChange={(event) => setActivitySummary(event.target.value)} maxLength={6000} placeholder="Ej. Le escribí por WhatsApp y acordamos revisar su perfil el viernes." /></Field>
                    <Field label="Próxima acción (opcional)"><input className="form-input" value={nextAction} onChange={(event) => setNextAction(event.target.value)} maxLength={500} placeholder="Qué queda por hacer" /></Field>
                    <Field label="Fecha de seguimiento (opcional)"><input className="form-input" type="date" value={nextFollowUpDate} onChange={(event) => setNextFollowUpDate(event.target.value)} /></Field>
                </div>
                <div className="flex flex-wrap items-center gap-3"><PanelButton variant="secondary" size="sm" onClick={() => void logActivity()} loading={savingActivity} disabled={savingActivity}><IconPlus size={15} /> Guardar actividad</PanelButton></div>
            </section>
            {error ? <PanelNotice tone="error">{error}</PanelNotice> : null}
            {saved ? <PanelNotice tone="success">{saved}</PanelNotice> : null}
        </div>
    );
}
