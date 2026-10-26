'use client';

import { useState } from 'react';
import { IconBrandWhatsapp, IconMail } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import { PanelButton, PanelNotice, PanelScrollModal } from '@simple/ui/panel';

const SOURCE_OPTIONS = [
    { value: '', label: 'Seleccionar servicio' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'propiedades', label: 'SimplePropiedades' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'serenatas', label: 'SimpleSerenatas' },
    { value: 'platform', label: 'SimplePlataforma' },
    { value: 'general', label: 'Otro / general' },
];

const PURPOSE_OPTIONS = [
    { value: '', label: 'Seleccionar motivo' },
    { value: 'alliance', label: 'Alianza o inmobiliaria' },
    { value: 'app_invitation', label: 'Invitación a probar una aplicación' },
    { value: 'client_prospecting', label: 'Posible cliente' },
    { value: 'follow_up', label: 'Seguimiento' },
    { value: 'support', label: 'Soporte' },
    { value: 'other', label: 'Otro motivo' },
];

const CHANNEL_OPTIONS = [
    { value: 'whatsapp_personal', label: 'WhatsApp personal' },
    { value: 'whatsapp_business', label: 'WhatsApp Business de Simple' },
    { value: 'email', label: 'Correo electrónico' },
];

export function CaptureConversationDialog({ onClose, onCapture }: {
    onClose: () => void;
    onCapture: (input: {
        channel: 'whatsapp_personal' | 'whatsapp_business' | 'email';
        phone?: string;
        email?: string;
        name?: string;
        message: string;
        sourceVertical: 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general';
        purpose: 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other';
        campaignName?: string;
    }) => Promise<void>;
}) {
    const [channel, setChannel] = useState<'whatsapp_personal' | 'whatsapp_business' | 'email'>('whatsapp_personal');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [sourceVertical, setSourceVertical] = useState('');
    const [purpose, setPurpose] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = async () => {
        if (!message.trim() || !sourceVertical || !purpose) {
            setError('Copia la respuesta recibida y clasifícala por servicio y motivo.');
            return;
        }
        if (channel === 'email' ? !email.trim() : !phone.trim()) {
            setError(channel === 'email' ? 'Indica el correo del contacto.' : 'Indica el WhatsApp del contacto.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onCapture({
                channel,
                phone: channel === 'email' ? undefined : phone.trim(),
                email: channel === 'email' ? email.trim() : undefined,
                name: name.trim() || undefined,
                message: message.trim(),
                sourceVertical: sourceVertical as 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general',
                purpose: purpose as 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other',
                campaignName: campaignName.trim() || undefined,
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo registrar el contacto.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PanelScrollModal
            title="Registrar respuesta recibida"
            description="Guarda el texto recibido, el canal, el servicio y la gestión a la que corresponde."
            onClose={onClose}
            size="md"
            footer={(
                <div className="flex justify-end gap-2 px-5 py-4">
                    <PanelButton variant="secondary" onClick={onClose} disabled={saving}>Cancelar</PanelButton>
                    <PanelButton onClick={() => void save()} loading={saving} disabled={saving || (channel === 'email' ? !email.trim() : !phone.trim()) || !message.trim() || !sourceVertical || !purpose}>{channel === 'email' ? <IconMail size={16} /> : <IconBrandWhatsapp size={16} />} Registrar respuesta</PanelButton>
                </div>
            )}
        >
            <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Canal donde llegó" className="sm:col-span-2"><ModernSelect value={channel} onChange={(value) => setChannel(value as typeof channel)} options={CHANNEL_OPTIONS} ariaLabel="Canal donde llegó la respuesta" /></Field>
                {channel === 'email' ? (
                    <Field label="Correo del contacto"><input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.cl" type="email" autoComplete="email" /></Field>
                ) : (
                    <Field label="WhatsApp / teléfono"><input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56 9 1234 5678" autoComplete="tel" /></Field>
                )}
                <Field label="Nombre"><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del contacto" /></Field>
                <Field label="Respuesta recibida" className="sm:col-span-2"><textarea className="form-input min-h-28 py-2" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={6000} required /></Field>
                <Field label="Simple / servicio relacionado" className="sm:col-span-2"><ModernSelect value={sourceVertical} onChange={setSourceVertical} options={SOURCE_OPTIONS} ariaLabel="Servicio relacionado" /></Field>
                <Field label="Motivo del contacto"><ModernSelect value={purpose} onChange={setPurpose} options={PURPOSE_OPTIONS} ariaLabel="Motivo del contacto" /></Field>
                <Field label="Campaña o gestión (opcional)"><input className="form-input" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Ej. Piloto SimpleAgenda octubre" /></Field>
                <p className="text-xs text-[var(--fg-muted)] sm:col-span-2">Los mensajes quedan separados por contacto, canal y servicio. Así SimpleAgenda y las alianzas de SimplePropiedades mantienen historiales distintos.</p>
                {error ? <PanelNotice tone="error" className="sm:col-span-2">{error}</PanelNotice> : null}
            </div>
        </PanelScrollModal>
    );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return <label className={`block space-y-1.5 ${className ?? ''}`}><span className="text-xs font-medium text-[var(--fg-muted)]">{label}</span>{children}</label>;
}
