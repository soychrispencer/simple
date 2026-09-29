'use client';

import { useState } from 'react';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { ModernSelect } from '@simple/ui';
import { PanelButton, PanelNotice, PanelScrollModal } from '@simple/ui/panel';

const SOURCE_OPTIONS = [
    { value: '', label: 'Sin vertical / general' },
    { value: 'autos', label: 'SimpleAutos' },
    { value: 'propiedades', label: 'SimplePropiedades' },
    { value: 'agenda', label: 'SimpleAgenda' },
    { value: 'serenatas', label: 'SimpleSerenatas' },
    { value: 'platform', label: 'Plataforma' },
];

export function CaptureConversationDialog({ onClose, onCapture }: {
    onClose: () => void;
    onCapture: (input: { phone: string; name?: string; message?: string; sourceVertical?: string }) => Promise<void>;
}) {
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [sourceVertical, setSourceVertical] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = async () => {
        setSaving(true);
        setError('');
        try {
            await onCapture({
                phone: phone.trim(),
                name: name.trim() || undefined,
                message: message.trim() || undefined,
                sourceVertical: sourceVertical || undefined,
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
            title="Registrar WhatsApp"
            description="Añade un contacto recibido fuera de los canales conectados."
            onClose={onClose}
            size="md"
            footer={(
                <div className="flex justify-end gap-2 px-5 py-4">
                    <PanelButton variant="secondary" onClick={onClose} disabled={saving}>Cancelar</PanelButton>
                    <PanelButton onClick={() => void save()} loading={saving} disabled={saving || !phone.trim()}><IconBrandWhatsapp size={16} /> Guardar pendiente</PanelButton>
                </div>
            )}
        >
            <div className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="WhatsApp / teléfono"><input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+56912345678" /></Field>
                <Field label="Nombre"><input className="form-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nombre del contacto" /></Field>
                <Field label="Mensaje / motivo" className="sm:col-span-2"><textarea className="form-input min-h-28 py-2" value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
                <Field label="Vertical de origen" className="sm:col-span-2"><ModernSelect value={sourceVertical} onChange={setSourceVertical} options={SOURCE_OPTIONS} ariaLabel="Vertical de origen" /></Field>
                {error ? <PanelNotice tone="error" className="sm:col-span-2">{error}</PanelNotice> : null}
            </div>
        </PanelScrollModal>
    );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return <label className={`block space-y-1.5 ${className ?? ''}`}><span className="text-xs font-medium text-[var(--fg-muted)]">{label}</span>{children}</label>;
}
