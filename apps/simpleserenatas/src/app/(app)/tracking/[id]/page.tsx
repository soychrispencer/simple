'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
    IconArrowLeft,
    IconMapPin,
    IconClock,
    IconCheck,
    IconLoader,
    IconPhone,
    IconMessageCircle,
    IconNavigation,
    IconCalendar,
    IconStar,
    IconCreditCard,
    IconShieldCheck,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { LineupSection } from '@/components/lineup/lineup-section';
import { useToast } from '@/hooks';

interface Location {
    lat: number | string | null;
    lng: number | string | null;
    updatedAt?: string | null;
}

interface Serenata {
    id: string;
    status: 'pending' | 'quoted' | 'accepted' | 'payment_pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
    clientId: string;
    eventDate?: string;
    eventTime?: string;
    duration?: number;
    address: string;
    city?: string;
    recipientName?: string;
    message?: string | null;
    price?: number | null;
    coordinatorId?: string | null;
    coordinatorName?: string | null;
    coordinatorPhone?: string | null;
    coordinatorLat?: number | string | null;
    coordinatorLng?: number | string | null;
    coordinatorLocationUpdatedAt?: string | null;
}

interface PaymentInfo {
    mercadoPagoConfigured?: boolean;
    payment: {
        id: string;
        totalAmount: number;
        platformCommission: number;
        commissionVat: number;
        coordinatorEarnings: number;
        status: 'pending' | 'holding' | 'released' | 'refunded' | 'disputed';
        clientPaidAt?: string | null;
    } | null;
    projected: {
        totalAmount: number;
        platformCommission: number;
        commissionVat: number;
        coordinatorEarnings: number;
        source: string;
    };
}

const STATUS_FLOW: Array<Serenata['status']> = [
    'pending',
    'accepted',
    'payment_pending',
    'confirmed',
    'in_progress',
    'completed',
];

const STATUS_LABEL: Record<Serenata['status'], string> = {
    pending: 'Pendiente',
    quoted: 'Cotizada',
    accepted: 'Aceptada',
    payment_pending: 'Pago pendiente',
    confirmed: 'Confirmada',
    in_progress: 'En camino',
    completed: 'Completada',
    cancelled: 'Cancelada',
    rejected: 'Rechazada',
};

const TIMELINE_STEPS: Array<{ status: Serenata['status']; title: string; description: string }> = [
    {
        status: 'accepted',
        title: 'Coordinador aceptó',
        description: 'El coordinador tomó tu solicitud y está armando el grupo.',
    },
    {
        status: 'confirmed',
        title: 'Serenata confirmada',
        description: 'Día, hora y precio acordados. Solo queda esperar la fecha.',
    },
    {
        status: 'in_progress',
        title: 'En camino',
        description: 'El equipo va al destino con la dedicatoria preparada.',
    },
    {
        status: 'completed',
        title: 'Serenata realizada',
        description: 'La dedicatoria está completa. ¡Cuéntanos cómo estuvo!',
    },
];

function statusIndex(status: Serenata['status']): number {
    if (status === 'quoted') return STATUS_FLOW.indexOf('pending');
    if (status === 'rejected' || status === 'cancelled') return -1;
    return STATUS_FLOW.indexOf(status);
}

function statusStyle(status: Serenata['status']): React.CSSProperties {
    if (status === 'cancelled' || status === 'rejected') {
        return {
            color: '#b91c1c',
            background: 'rgba(185,28,28,0.10)',
        };
    }
    if (status === 'completed') {
        return {
            color: 'var(--fg-secondary)',
            background: 'var(--bg-subtle)',
        };
    }
    if (status === 'in_progress') {
        return {
            color: 'var(--success)',
            background: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)',
        };
    }
    if (['accepted', 'payment_pending', 'confirmed'].includes(status)) {
        return {
            color: 'var(--info)',
            background: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)',
        };
    }
    return {
        color: 'var(--warning)',
        background: 'color-mix(in oklab, var(--surface) 75%, var(--warning) 25%)',
    };
}

export default function TrackingPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { showToast } = useToast();
    const serenataId = params.id as string;

    const [serenata, setSerenata] = useState<Serenata | null>(null);
    const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
    const [coordinatorLocation, setCoordinatorLocation] = useState<Location | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentPending, setPaymentPending] = useState(false);

    const fetchSerenata = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}`, {
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.ok) {
                setError(data?.error || 'No pudimos cargar la serenata');
                return;
            }
            setSerenata(data.serenata as Serenata);
        } catch (err) {
            console.error('Error fetching serenata:', err);
            setError('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    }, [serenataId]);

    const fetchPaymentInfo = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/payments/serenata/${serenataId}`, {
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                setPaymentInfo({
                    mercadoPagoConfigured: data.mercadoPagoConfigured === true,
                    payment: data.payment ?? null,
                    projected: data.projected,
                });
            }
        } catch (err) {
            console.error('Error fetching payment info:', err);
        }
    }, [serenataId]);

    const handlePay = useCallback(async () => {
        setIsPaying(true);
        try {
            const summaryRes = await fetch(
                `${API_BASE}/api/serenatas/payments/serenata/${serenataId}`,
                { credentials: 'include' }
            );
            const summary = await summaryRes.json().catch(() => ({}));
            const useMercadoPago = summary?.mercadoPagoConfigured === true;

            if (useMercadoPago) {
                const res = await fetch(
                    `${API_BASE}/api/serenatas/payments/serenata/${serenataId}/checkout`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                    }
                );
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.ok && data.redirectUrl) {
                    window.location.href = data.redirectUrl as string;
                    return;
                }
                if (data?.alreadyPaid) {
                    showToast('Tu pago ya estaba registrado', 'success');
                    await Promise.all([fetchSerenata(), fetchPaymentInfo()]);
                    return;
                }
                showToast(data?.error || 'No pudimos iniciar el pago con Mercado Pago', 'error');
                return;
            }

            const res = await fetch(`${API_BASE}/api/serenatas/payments/serenata/${serenataId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ paymentMethod: 'simulated' }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                showToast(data.alreadyPaid ? 'Tu pago ya estaba registrado' : 'Pago confirmado', 'success');
                await Promise.all([fetchSerenata(), fetchPaymentInfo()]);
            } else {
                showToast(data?.error || 'No pudimos procesar el pago', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Error de conexión', 'error');
        } finally {
            setIsPaying(false);
        }
    }, [serenataId, fetchSerenata, fetchPaymentInfo, showToast]);

    const fetchCoordinatorLocation = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}/location`, {
                credentials: 'include',
            });
            if (!res.ok) return;
            const data = await res.json();
            if (data.ok && data.location) {
                setCoordinatorLocation(data.location);
            }
        } catch (err) {
            console.error('Error fetching location:', err);
        }
    }, [serenataId]);

    useEffect(() => {
        fetchSerenata();
        fetchPaymentInfo();
    }, [fetchSerenata, fetchPaymentInfo]);

    /** Tras Checkout Pro, Mercado Pago redirige con `payment_id` (y `collection_status`). */
    useEffect(() => {
        const paymentId = searchParams.get('payment_id');
        if (!paymentId || !serenata || !user || serenata.clientId !== user.id) return;

        const collectionStatus = searchParams.get('collection_status');
        if (collectionStatus === 'failure' || collectionStatus === 'null') {
            showToast('El pago no se completó o fue rechazado', 'error');
            router.replace(`/tracking/${serenataId}`);
            return;
        }

        (async () => {
            try {
                const res = await fetch(
                    `${API_BASE}/api/serenatas/payments/serenata/${serenataId}/mercadopago/confirm`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ paymentId }),
                    }
                );
                const data = await res.json().catch(() => ({}));
                if (res.ok && data?.ok) {
                    if (data.pending) {
                        setPaymentPending(true);
                        showToast('Pago en proceso; te avisamos cuando se acredite.', 'success');
                    } else {
                        setPaymentPending(false);
                        showToast(
                            data.alreadyPaid ? 'Tu pago ya estaba registrado' : 'Pago confirmado',
                            'success'
                        );
                    }
                    await Promise.all([fetchSerenata(), fetchPaymentInfo()]);
                } else {
                    showToast(data?.error || 'No pudimos confirmar el pago', 'error');
                }
            } catch (e) {
                console.error(e);
                showToast('Error de conexión al confirmar el pago', 'error');
            } finally {
                router.replace(`/tracking/${serenataId}`);
            }
        })();
    }, [searchParams, serenata, user, serenataId, router, showToast, fetchSerenata, fetchPaymentInfo]);

    useEffect(() => {
        if (!serenata) return;
        if (!['confirmed', 'in_progress'].includes(serenata.status)) return;
        fetchCoordinatorLocation();
        const interval = setInterval(fetchCoordinatorLocation, 30000);
        return () => clearInterval(interval);
    }, [serenata, fetchCoordinatorLocation]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    if (error || !serenata) {
        return (
            <SerenatasPageShell width="default">
                <button
                    type="button"
                    onClick={() => router.push('/inicio')}
                    className="serenatas-interactive mb-4 flex items-center gap-2 rounded-lg"
                    style={{ color: 'var(--fg-secondary)' }}
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <div
                    className="rounded-xl border p-6 text-center"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                    <p style={{ color: 'var(--fg-secondary)' }}>
                        {error || 'Serenata no encontrada'}
                    </p>
                </div>
            </SerenatasPageShell>
        );
    }

    const eventDateLabel = serenata.eventDate
        ? new Date(`${serenata.eventDate}T${serenata.eventTime ?? '00:00'}`).toLocaleString('es-CL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'Sin fecha definida';

    const isOwner = serenata.clientId === user?.id;
    const stepIdx = statusIndex(serenata.status);

    return (
        <div className="pb-8">
            <div className="px-6 py-4 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <button
                    type="button"
                    onClick={() => router.push('/inicio')}
                    className="serenatas-interactive mb-4 flex items-center gap-2 rounded-lg"
                    style={{ color: 'var(--fg-secondary)' }}
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <SerenatasPageHeader
                    title="Seguimiento"
                    description={
                        serenata.recipientName
                            ? `Para: ${serenata.recipientName}`
                            : `Solicitud #${serenata.id.slice(0, 8)}`
                    }
                    trailing={
                        <span
                            className="shrink-0 rounded-full px-3 py-1 text-sm font-medium"
                            style={statusStyle(serenata.status)}
                        >
                            {STATUS_LABEL[serenata.status]}
                        </span>
                    }
                    className="!mb-0"
                />
            </div>

            <SerenatasPageShell width="default" className="space-y-4">
                <div
                    className="rounded-xl p-5 border space-y-3"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                    <div className="flex items-center gap-3">
                        <IconCalendar size={20} style={{ color: 'var(--accent)' }} />
                        <div>
                            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                                Fecha y hora
                            </p>
                            <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                {eventDateLabel}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <IconMapPin size={20} style={{ color: 'var(--accent)' }} />
                        <div>
                            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                                Dirección
                            </p>
                            <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                {serenata.address}
                                {serenata.city ? `, ${serenata.city}` : ''}
                            </p>
                        </div>
                    </div>
                    {typeof serenata.price === 'number' ? (
                        <div className="flex items-center gap-3">
                            <IconClock size={20} style={{ color: 'var(--accent)' }} />
                            <div>
                                <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                                    Precio acordado
                                </p>
                                <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                    ${serenata.price.toLocaleString('es-CL')} CLP
                                    {serenata.duration ? ` · ${serenata.duration} min` : ''}
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Lineup de músicos (informativo para cliente y músico) */}
                <LineupSection serenataId={serenataId} canManage={false} />

                {/* Aviso: pago acreditándose en MP */}
                {paymentPending && !paymentInfo?.payment ? (
                    <div
                        className="rounded-xl border p-4 flex items-start gap-3"
                        style={{
                            background:
                                'color-mix(in oklab, var(--surface) 70%, var(--info) 30%)',
                            borderColor: 'var(--info)',
                            color: 'var(--info)',
                        }}
                    >
                        <IconLoader size={20} className="animate-spin mt-0.5 shrink-0" />
                        <div className="text-sm">
                            <p className="font-semibold">Pago en proceso</p>
                            <p style={{ color: 'var(--fg-secondary)' }}>
                                Mercado Pago todavía está acreditando tu pago. Te avisaremos
                                cuando se confirme — puedes cerrar esta pantalla con tranquilidad.
                            </p>
                        </div>
                    </div>
                ) : null}

                {/* Pago: solo cliente dueño y cuando hay precio acordado */}
                {isOwner && serenata.coordinatorName && (paymentInfo?.payment || ['accepted', 'payment_pending', 'confirmed', 'quoted'].includes(serenata.status)) ? (
                    <div
                        className="rounded-xl p-5 border space-y-3"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                        <div className="flex items-center gap-3">
                            <IconShieldCheck size={20} style={{ color: 'var(--accent)' }} />
                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>
                                {paymentInfo?.payment ? 'Pago' : 'Pagar serenata'}
                            </h3>
                        </div>

                        {paymentInfo?.payment ? (
                            <div className="text-sm space-y-1" style={{ color: 'var(--fg-secondary)' }}>
                                <div className="flex items-center justify-between">
                                    <span>Estado del pago</span>
                                    <span
                                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                                        style={{
                                            background:
                                                paymentInfo.payment.status === 'released'
                                                    ? 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)'
                                                    : paymentInfo.payment.status === 'holding'
                                                      ? 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)'
                                                      : 'var(--bg-subtle)',
                                            color:
                                                paymentInfo.payment.status === 'released'
                                                    ? 'var(--success)'
                                                    : paymentInfo.payment.status === 'holding'
                                                      ? 'var(--info)'
                                                      : 'var(--fg-secondary)',
                                        }}
                                    >
                                        {paymentInfo.payment.status === 'holding'
                                            ? 'En custodia'
                                            : paymentInfo.payment.status === 'released'
                                              ? 'Liberado al coordinador'
                                              : paymentInfo.payment.status === 'refunded'
                                                ? 'Reembolsado'
                                                : paymentInfo.payment.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Total pagado</span>
                                    <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                                        ${paymentInfo.payment.totalAmount.toLocaleString('es-CL')}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="text-sm space-y-1" style={{ color: 'var(--fg-secondary)' }}>
                                    <div className="flex items-center justify-between">
                                        <span>Total a pagar</span>
                                        <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                                            ${(paymentInfo?.projected.totalAmount || serenata.price || 0).toLocaleString('es-CL')} CLP
                                        </span>
                                    </div>
                                    {paymentInfo && paymentInfo.projected.platformCommission > 0 ? (
                                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            Incluye comisión de la plataforma del{' '}
                                            {Math.round(
                                                ((paymentInfo.projected.platformCommission +
                                                    paymentInfo.projected.commissionVat) /
                                                    Math.max(paymentInfo.projected.totalAmount, 1)) *
                                                    100
                                            )}
                                            %.
                                        </p>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={handlePay}
                                    disabled={isPaying || !serenata.price}
                                    className="w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                                >
                                    <IconCreditCard size={18} />
                                    {isPaying ? 'Procesando...' : 'Pagar ahora'}
                                </button>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    Tu pago queda en custodia hasta que la serenata se realice.
                                </p>
                            </>
                        )}
                    </div>
                ) : null}

                {/* Timeline de estados */}
                <div
                    className="rounded-xl p-5 border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                    <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>
                        Estado de la serenata
                    </h3>
                    <div className="space-y-4">
                        {TIMELINE_STEPS.map((step) => {
                            const reached = statusIndex(step.status) <= stepIdx && stepIdx >= 0;
                            return (
                                <div key={step.status} className="flex items-start gap-3">
                                    <div
                                        className="mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                                        style={{
                                            background: reached ? 'var(--success)' : 'var(--bg-subtle)',
                                            color: reached ? 'white' : 'var(--fg-muted)',
                                        }}
                                    >
                                        <IconCheck size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                            {step.title}
                                        </p>
                                        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Mapa solo si hay viaje activo */}
                {['confirmed', 'in_progress'].includes(serenata.status) && (
                    <div
                        className="h-56 rounded-xl relative overflow-hidden border"
                        style={{
                            background: 'linear-gradient(135deg, var(--accent-subtle), var(--bg-subtle))',
                            borderColor: 'var(--border)',
                        }}
                    >
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <IconMapPin size={40} className="mx-auto mb-2" style={{ color: 'var(--accent)' }} />
                                <p className="text-sm font-medium" style={{ color: 'var(--fg-secondary)' }}>
                                    {serenata.address}
                                </p>
                                {coordinatorLocation?.updatedAt ? (
                                    <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
                                        Última posición:{' '}
                                        {new Date(coordinatorLocation.updatedAt).toLocaleTimeString('es-CL', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}

                {/* Coordinador */}
                {serenata.coordinatorName ? (
                    <div
                        className="rounded-xl p-5 border"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                        <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>
                            Tu coordinador
                        </h3>
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center"
                                style={{ background: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)' }}
                            >
                                <span className="font-medium text-lg" style={{ color: 'var(--info)' }}>
                                    {(serenata.coordinatorName || 'C').charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                    {serenata.coordinatorName}
                                </p>
                                <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                    Coordinador asignado
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {serenata.coordinatorPhone ? (
                                    <a
                                        href={`tel:${serenata.coordinatorPhone}`}
                                        className="p-2 rounded-full"
                                        style={{
                                            background: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)',
                                            color: 'var(--success)',
                                        }}
                                        aria-label="Llamar al coordinador"
                                    >
                                        <IconPhone size={20} />
                                    </a>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => router.push('/chat')}
                                    className="p-2 rounded-full"
                                    style={{
                                        background: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)',
                                        color: 'var(--info)',
                                    }}
                                    aria-label="Chat con coordinador"
                                >
                                    <IconMessageCircle size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        className="rounded-xl p-5 border"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                        <p className="font-medium" style={{ color: 'var(--fg)' }}>
                            Buscando coordinador...
                        </p>
                        <p className="text-sm mt-1" style={{ color: 'var(--fg-secondary)' }}>
                            Estamos revisando los coordinadores disponibles para tu fecha y zona.
                            Recibirás una notificación apenas haya uno asignado.
                        </p>
                    </div>
                )}

                {/* CTA review tras completarse */}
                {isOwner && serenata.status === 'completed' ? (
                    <button
                        type="button"
                        onClick={() => router.push(`/review/${serenata.id}`)}
                        className="w-full rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        <IconStar size={18} />
                        Calificar serenata
                    </button>
                ) : null}

                {['confirmed', 'in_progress'].includes(serenata.status) ? (
                    <button
                        type="button"
                        onClick={fetchCoordinatorLocation}
                        className="serenatas-interactive w-full border py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                        style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            color: 'var(--fg-secondary)',
                        }}
                    >
                        <IconNavigation size={18} />
                        Actualizar ubicación
                    </button>
                ) : null}
            </SerenatasPageShell>
        </div>
    );
}
