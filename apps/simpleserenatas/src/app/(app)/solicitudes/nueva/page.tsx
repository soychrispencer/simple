'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';
import { useToast } from '@/hooks';
import { requestsApi } from '@/lib/api';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

const EVENT_TYPES = [
    { value: 'serenata', label: 'Serenata' },
    { value: 'cumpleanos', label: 'Cumpleaños' },
    { value: 'aniversario', label: 'Aniversario' },
    { value: 'propuesta', label: 'Propuesta / sorpresa' },
    { value: 'otro', label: 'Otra ocasión' },
] as const;

export default function NuevaSerenataPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [price, setPrice] = useState('');
    const [eventType, setEventType] =
        useState<(typeof EVENT_TYPES)[number]['value']>('serenata');
    const [recipientName, setRecipientName] = useState('');
    const [message, setMessage] = useState('');

    const validate = () => {
        if (!clientName.trim()) return 'Indica el nombre del cliente';
        if (!clientPhone.trim() || clientPhone.replace(/\D/g, '').length < 8)
            return 'Teléfono válido (mín. 8 dígitos)';
        if (!address.trim()) return 'Indica la dirección';
        if (!city.trim()) return 'Indica la comuna';
        if (!eventDate) return 'Indica la fecha';
        if (!eventTime) return 'Indica la hora';
        const p = parseInt(price.replace(/\D/g, ''), 10);
        if (!price.trim() || Number.isNaN(p) || p < 0) return 'Indica un precio válido';
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validate();
        if (err) {
            showToast(err, 'error');
            return;
        }
        const priceNum = parseInt(price.replace(/\D/g, ''), 10);
        setSubmitting(true);
        try {
            const res = await requestsApi.create({
                clientName: clientName.trim(),
                clientPhone: clientPhone.trim(),
                address: address.trim(),
                city: city.trim(),
                region: 'RM',
                eventDate,
                eventTime: eventTime.slice(0, 5),
                duration: 45,
                price: priceNum,
                eventType,
                recipientName: recipientName.trim() || undefined,
                message: message.trim() || undefined,
                capturedByCoordinator: true,
                source: 'self_captured',
            });
            if (!res.ok || !(res.data as { ok?: boolean })?.ok) {
                throw new Error(res.error || 'No se pudo crear');
            }
            showToast('Serenata creada', 'success');
            router.push('/solicitudes');
            router.refresh();
        } catch {
            showToast('No se pudo guardar. Revisa los datos e intenta de nuevo.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <SerenatasPageShell width="narrow">
            <div className="mb-6">
                <Link
                    href="/solicitudes"
                    className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
                    style={{ color: 'var(--fg-muted)' }}
                >
                    <IconArrowLeft size={18} />
                    Volver a la lista
                </Link>
                <SerenatasPageHeader
                    title="Nueva serenata"
                    description="Datos del cliente y del evento. Se guarda como trabajo propio (sin comisión de plataforma)."
                />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Nombre del cliente *">
                    <input
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                        }}
                        placeholder="Ej: María González"
                        autoComplete="name"
                    />
                </Field>
                <Field label="Teléfono *">
                    <input
                        required
                        inputMode="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                        }}
                        placeholder="+56 9 1234 5678"
                        autoComplete="tel"
                    />
                </Field>
                <Field label="Dirección *">
                    <input
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                        }}
                        placeholder="Calle, número, referencia"
                    />
                </Field>
                <Field label="Comuna *">
                    <input
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                        }}
                        placeholder="Ej: Maipú"
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Fecha *">
                        <input
                            required
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                            style={{
                                borderColor: 'var(--border)',
                                background: 'var(--bg-elevated)',
                                color: 'var(--fg)',
                            }}
                        />
                    </Field>
                    <Field label="Hora *">
                        <input
                            required
                            type="time"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                            className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                            style={{
                                borderColor: 'var(--border)',
                                background: 'var(--bg-elevated)',
                                color: 'var(--fg)',
                            }}
                        />
                    </Field>
                </div>
                <Field label="Precio (CLP) *">
                    <input
                        required
                        inputMode="numeric"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                        }}
                        placeholder="Ej: 80000"
                    />
                </Field>
                <Field label="Ocasión">
                    <select
                        value={eventType}
                        onChange={(e) =>
                            setEventType(e.target.value as (typeof EVENT_TYPES)[number]['value'])
                        }
                        className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                        }}
                    >
                        {EVENT_TYPES.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Para quién es (opcional)">
                    <input
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                        }}
                        placeholder="Ej: cumpleañera"
                    />
                </Field>
                <Field label="Mensaje u observaciones (opcional)">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="min-h-[88px] w-full resize-y rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500"
                        style={{
                            borderColor: 'var(--border)',
                            background: 'var(--bg-elevated)',
                            color: 'var(--fg)',
                        }}
                        placeholder="Detalle para el grupo…"
                    />
                </Field>

                <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 w-full rounded-xl py-3.5 font-semibold text-white disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                >
                    {submitting ? 'Guardando…' : 'Guardar serenata'}
                </button>
            </form>
        </SerenatasPageShell>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--fg)' }}>
                {label}
            </label>
            {children}
        </div>
    );
}
