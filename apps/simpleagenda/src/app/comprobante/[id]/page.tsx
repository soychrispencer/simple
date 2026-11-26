'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API_BASE } from '@simple/config';

type ReceiptData = {
    id: string;
    clientName: string;
    professionalName: string;
    professionalProfession: string | null;
    professionalSlug: string;
    serviceName: string;
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
    modality: string;
    location: string | null;
    price: string | null;
    currency: string;
    paymentStatus: string;
    status: string;
    timezone: string;
};

const PAYMENT_LABELS: Record<string, string> = {
    paid: 'Pagado',
    pending: 'Pendiente de pago',
    not_required: 'Sin cobro requerido',
    refunded: 'Reembolsado',
};

const STATUS_LABELS: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Por confirmar',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No asistió',
};

export default function ComprobantePage() {
    const { id } = useParams<{ id: string }>();
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        let active = true;
        fetch(`${API_BASE}/api/public/agenda/appointments/${encodeURIComponent(id)}/receipt`)
            .then((res) => res.json())
            .then((data: { ok: boolean; receipt?: ReceiptData; error?: string }) => {
                if (!active) return;
                if (!data.ok || !data.receipt) {
                    setError(data.error ?? 'Comprobante no encontrado.');
                    return;
                }
                setReceipt(data.receipt);
            })
            .catch(() => {
                if (active) setError('No pudimos cargar el comprobante.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-sm" style={{ background: 'var(--bg)', color: 'var(--fg-muted)' }}>
                Cargando comprobante…
            </div>
        );
    }

    if (error || !receipt) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 text-sm" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
                {error || 'Comprobante no disponible.'}
            </div>
        );
    }

    const formattedPrice = receipt.price
        ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: receipt.currency || 'CLP', minimumFractionDigits: 0 }).format(Number(receipt.price))
        : '—';

    const dateLabel = new Date(receipt.startsAt).toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: receipt.timezone || 'America/Santiago',
    });

    const timeLabel = new Date(receipt.startsAt).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: receipt.timezone || 'America/Santiago',
    });

    return (
        <div className="min-h-screen p-4 sm:p-8 print:p-0" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
            <div className="mx-auto max-w-xl space-y-4">
                <div className="flex items-center justify-between print:hidden">
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                        Comprobante de atención
                    </span>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="rounded-xl px-4 py-2 text-xs font-semibold"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast, #fff)' }}
                    >
                        Descargar / Imprimir PDF
                    </button>
                </div>

                <div className="rounded-2xl border p-6 sm:p-8 space-y-6 print:border-0" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    <div className="flex items-start justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
                        <div>
                            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>SimpleAgenda</p>
                            <h1 className="text-xl font-bold mt-1">{receipt.professionalName}</h1>
                            {receipt.professionalProfession ? (
                                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>{receipt.professionalProfession}</p>
                            ) : null}
                        </div>
                        <div className="text-right text-xs" style={{ color: 'var(--fg-muted)' }}>
                            <p>Comprobante N.º</p>
                            <p className="font-mono font-semibold" style={{ color: 'var(--fg)' }}>{receipt.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-xs" style={{ color: 'var(--fg-muted)' }}>Paciente</dt>
                            <dd className="font-medium mt-0.5">{receipt.clientName}</dd>
                        </div>
                        <div>
                            <dt className="text-xs" style={{ color: 'var(--fg-muted)' }}>Servicio</dt>
                            <dd className="font-medium mt-0.5">{receipt.serviceName} ({receipt.durationMinutes} min)</dd>
                        </div>
                        <div>
                            <dt className="text-xs" style={{ color: 'var(--fg-muted)' }}>Fecha y hora</dt>
                            <dd className="font-medium mt-0.5 capitalize">{dateLabel} · {timeLabel}</dd>
                        </div>
                        <div>
                            <dt className="text-xs" style={{ color: 'var(--fg-muted)' }}>Modalidad</dt>
                            <dd className="font-medium mt-0.5">
                                {receipt.modality === 'online' ? 'Online' : (receipt.location || 'Presencial')}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs" style={{ color: 'var(--fg-muted)' }}>Estado de la cita</dt>
                            <dd className="font-medium mt-0.5">{STATUS_LABELS[receipt.status] ?? receipt.status}</dd>
                        </div>
                        <div>
                            <dt className="text-xs" style={{ color: 'var(--fg-muted)' }}>Estado de pago</dt>
                            <dd className="font-medium mt-0.5">{PAYMENT_LABELS[receipt.paymentStatus] ?? receipt.paymentStatus}</dd>
                        </div>
                    </dl>

                    <div className="border-t pt-4 flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>Valor de la atención</span>
                        <span className="text-xl font-bold">{formattedPrice}</span>
                    </div>

                    <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                        Documento informativo de respaldo emitido a través de SimpleAgenda. No reemplaza documento tributario electrónico (SII).
                    </p>
                </div>
            </div>
        </div>
    );
}
