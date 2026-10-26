'use client';

import { useState } from 'react';
import { IconSend } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import { PanelButton, PanelNotice, PanelScrollModal } from '@simple/ui/panel';

const CHANNEL_OPTIONS = [
    { value: 'whatsapp_personal', label: 'WhatsApp personal' },
    { value: 'whatsapp_business', label: 'WhatsApp Business de Simple' },
    { value: 'email', label: 'Correo electrónico' },
];

const VERTICAL_OPTIONS = [
    { value: '', label: 'Seleccionar Simple / servicio' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'propiedades', label: 'SimplePropiedades' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'serenatas', label: 'SimpleSerenatas' },
    { value: 'platform', label: 'SimplePlataforma' },
    { value: 'general', label: 'Otro / general' },
];

const PURPOSE_OPTIONS = [
    { value: '', label: 'Seleccionar motivo' },
    { value: 'alliance', label: 'Alianza o inmobiliaria' },
    { value: 'app_invitation', label: 'Invitación a probar una aplicación' },
    { value: 'client_prospecting', label: 'Contacto con un posible cliente' },
    { value: 'follow_up', label: 'Seguimiento a un contacto' },
    { value: 'support', label: 'Soporte a un cliente' },
    { value: 'other', label: 'Otro motivo comercial' },
];

export function RecordOutboundMessageDialog({ onClose, onSave }: {
    onClose: () => void;
    onSave: (input: {
        channel: 'whatsapp_personal' | 'whatsapp_business' | 'email';
        phone?: string;
        email?: string;
        name?: string;
        company?: string;
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
    const [company, setCompany] = useState('');
    const [sourceVertical, setSourceVertical] = useState('');
    const [purpose, setPurpose] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = async () => {
        if (!sourceVertical || !purpose || !message.trim()) {
            setError('Selecciona el servicio y el motivo, y copia el texto que enviaste.');
            return;
        }
        if (channel === 'email' ? !email.trim() : !phone.trim()) {
            setError(channel === 'email' ? 'Indica el correo del destinatario.' : 'Indica el WhatsApp del destinatario.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await onSave({
                channel,
                phone: channel === 'email' ? undefined : phone.trim() || undefined,
                email: channel === 'email' ? email.trim() || undefined : undefined,
                name: name.trim() || undefined,
                company: company.trim() || undefined,
                message: message.trim(),
                sourceVertical: sourceVertical as 'agenda' | 'propiedades' | 'autos' | 'serenatas' | 'platform' | 'general',
                purpose: purpose as 'alliance' | 'app_invitation' | 'client_prospecting' | 'follow_up' | 'support' | 'other',
                campaignName: campaignName.trim() || undefined,
            });
            onClose();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo guardar el mensaje.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <PanelScrollModal
            title="Registrar mensaje enviado"
            description="Guarda el texto exacto, el servicio y el motivo para encontrarlo junto con la respuesta. Este formulario no envía el mensaje."
            onClose={onClose}
            size="md"
            footer={(
                <div className="flex justify-end gap-2 px-5 py-4">
                    <PanelButton variant="secondary" onClick={onClose} disabled={saving}>Cancelar</PanelButton>
                    <PanelButton onClick={() => void save()} loading={saving} disabled={saving}>
                        <IconSend size={16} /> Guardar en historial
                    </PanelButton>
                </div>
            )}
        >
            <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Canal"><ModernSelect value={channel} onChange={(value) => setChannel(value as typeof channel)} options={CHANNEL_OPTIONS} ariaLabel="Canal del mensaje" /></Field>
                <Field label="Simple / servicio"><ModernSelect value={sourceVertical} onChange={setSourceVertical} options={VERTICAL_OPTIONS} ariaLabel="Servicio asociado al mensaje" /></Field>
                {channel === 'email' ? (
                    <Field label="Correo del contacto"><input className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@empresa.cl" type="email" autoComplete="email" /></Field>
                ) : (
                    <Field label="WhatsApp del contacto"><input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56 9 1234 5678" autoComplete="tel" /></Field>
                )}
                <Field label="Nombre del contacto"><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre" autoComplete="name" /></Field>
                <Field label="Empresa"><input className="form-input" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Empresa o inmobiliaria" autoComplete="organization" /></Field>
                <Field label="Motivo"><ModernSelect value={purpose} onChange={setPurpose} options={PURPOSE_OPTIONS} ariaLabel="Motivo del mensaje" /></Field>
                <Field label="Campaña o gestión (opcional)"><input className="form-input" value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Ej. Piloto SimpleAgenda octubre" /></Field>
                <Field label="Texto exacto enviado" className="sm:col-span-2"><textarea className="form-input min-h-32 py-2" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={6000} required placeholder="Pega aquí el texto tal como lo recibió la persona." /></Field>
                <p className="text-xs text-[var(--fg-muted)] sm:col-span-2">Registra solo conversaciones relacionadas con Simple. Los mensajes personales quedan fuera.</p>
                {error ? <PanelNotice tone="error" className="sm:col-span-2">{error}</PanelNotice> : null}
            </div>
        </PanelScrollModal>
    );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return <label className={`block space-y-1.5 ${className ?? ''}`}><span className="text-xs font-medium text-[var(--fg-muted)]">{label}</span>{children}</label>;
}
