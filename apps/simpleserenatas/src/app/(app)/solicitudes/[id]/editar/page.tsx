'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

const inputClass =
    'w-full rounded-xl border px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-rose-500';

export default function EditarSerenataPage() {
    const params = useParams();
    const id = typeof params?.id === 'string' ? params.id : '';
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

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

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await requestsApi.get(id);
            const body = res.data as {
                ok?: boolean;
                serenata?: {
                    clientName?: string;
                    clientPhone?: string | null;
                    address?: string;
                    city?: string | null;
                    eventDate?: string;
                    eventTime?: string;
                    price?: number | null;
                    eventType?: string | null;
                    recipientName?: string | null;
                    message?: string | null;
                    status?: string;
                };
            };
            if (!res.ok || !body?.ok || !body.serenata) throw new Error('No encontrada');
            const s = body.serenata;
            setStatus(s.status ?? null);
            const editable = [
                'pending',
                'quoted',
                'accepted',
                'payment_pending',
                'confirmed',
            ].includes(s.status ?? '');
            if (!editable) {
                showToast('Esta serenata ya no se puede editar', 'error');
                router.replace(`/solicitudes/${id}`);
                return;
            }
            setClientName(s.clientName ?? '');
            setClientPhone(s.clientPhone ?? '');
            setAddress(s.address ?? '');
            setCity(s.city ?? '');
            setEventDate(String(s.eventDate ?? '').slice(0, 10));
            setEventTime(String(s.eventTime ?? '').slice(0, 5));
            setPrice(s.price != null ? String(s.price) : '');
            if (
                s.eventType &&
                EVENT_TYPES.some((e) => e.value === s.eventType)
            ) {
                setEventType(s.eventType as (typeof EVENT_TYPES)[number]['value']);
            }
            setRecipientName(s.recipientName ?? '');
            setMessage(s.message ?? '');
        } catch {
            showToast('No se pudo cargar', 'error');
            router.push('/solicitudes');
        } finally {
            setLoading(false);
        }
    }, [id, router, showToast]);

    useEffect(() => {
        load();
    }, [load]);

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
            const res = await requestsApi.update(id, {
                clientName: clientName.trim(),
                clientPhone: clientPhone.trim(),
                address: address.trim(),
                city: city.trim(),
                eventDate,
                eventTime: eventTime.slice(0, 5),
                duration: 45,
                price: priceNum,
                eventType,
                recipientName: recipientName.trim() || null,
                message: message.trim() || null,
            });
            const body = res.data as { ok?: boolean } | undefined;
            if (!res.ok || !body?.ok) throw new Error(res.error);
            showToast('Cambios guardados', 'success');
            router.push(`/solicitudes/${id}`);
            router.refresh();
        } catch {
            showToast('No se pudo guardar', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const inputStyle = {
        borderColor: 'var(--border)',
        background: 'var(--bg-elevated)',
        color: 'var(--fg)',
    };

    if (loading) {
        return (
            <SerenatasPageShell width="narrow">
                <div className="animate-pulse space-y-4 py-4">
                    <div className="h-8 w-48 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-40 w-full rounded-2xl bg-zinc-200 dark:bg-zinc-700" />
                </div>
            </SerenatasPageShell>
        );
    }

    if (status && !['pending', 'quoted', 'accepted', 'payment_pending', 'confirmed'].includes(status)) {
        return null;
    }

    return (
        <SerenatasPageShell width="narrow">
            <Link
                href={`/solicitudes/${id}`}
                className="mb-4 inline-flex items-center gap-1 text-sm font-medium"
                style={{ color: 'var(--fg-muted)' }}
            >
                <IconArrowLeft size={18} />
                Volver al detalle
            </Link>
            <SerenatasPageHeader title="Editar serenata" description="Actualiza datos del cliente o del evento." />

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <Field label="Nombre del cliente *">
                    <input
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    />
                </Field>
                <Field label="Teléfono *">
                    <input
                        required
                        inputMode="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    />
                </Field>
                <Field label="Dirección *">
                    <input
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    />
                </Field>
                <Field label="Comuna *">
                    <input
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Fecha *">
                        <input
                            required
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </Field>
                    <Field label="Hora *">
                        <input
                            required
                            type="time"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                            className={inputClass}
                            style={inputStyle}
                        />
                    </Field>
                </div>
                <Field label="Precio (CLP) *">
                    <input
                        required
                        inputMode="numeric"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className={inputClass}
                        style={inputStyle}
                    />
                </Field>
                <Field label="Ocasión">
                    <select
                        value={eventType}
                        onChange={(e) =>
                            setEventType(e.target.value as (typeof EVENT_TYPES)[number]['value'])
                        }
                        className={inputClass}
                        style={inputStyle}
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
                        className={inputClass}
                        style={inputStyle}
                    />
                </Field>
                <Field label="Mensaje (opcional)">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className={`${inputClass} min-h-[88px] resize-y`}
                        style={inputStyle}
                    />
                </Field>

                <button
                    type="submit"
                    disabled={submitting}
                    className="mt-2 w-full rounded-xl py-3.5 font-semibold text-white disabled:opacity-60"
                    style={{ background: 'var(--accent)' }}
                >
                    {submitting ? 'Guardando…' : 'Guardar cambios'}
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
