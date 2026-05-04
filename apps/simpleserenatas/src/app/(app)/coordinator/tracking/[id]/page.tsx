'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    IconArrowLeft,
    IconMapPin,
    IconCheck,
    IconLoader,
    IconNavigation,
    IconQrcode,
    IconDoorEnter,
    IconDoorExit,
    IconCalendar,
    IconCircleCheck,
    IconHandStop,
} from '@tabler/icons-react';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { LineupSection } from '@/components/lineup/lineup-section';
import { useToast } from '@/hooks';

type Status =
    | 'pending'
    | 'quoted'
    | 'accepted'
    | 'payment_pending'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled'
    | 'rejected';

interface Serenata {
    id: string;
    status: Status;
    recipientName?: string;
    address: string;
    city?: string;
    eventDate?: string;
    eventTime?: string;
    duration?: number;
    price?: number | null;
    message?: string | null;
    coordinatorId?: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
    pending: 'Pendiente',
    quoted: 'Cotizada',
    accepted: 'Aceptada',
    payment_pending: 'Pago pendiente',
    confirmed: 'Confirmada',
    in_progress: 'En progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
    rejected: 'Rechazada',
};

export default function CoordinatorTrackingPage() {
    const router = useRouter();
    const params = useParams();
    const serenataId = params.id as string;
    const { showToast } = useToast();

    const [serenata, setSerenata] = useState<Serenata | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [checkInCode, setCheckInCode] = useState('');

    const fetchSerenata = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}`, {
                credentials: 'include',
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                setSerenata(data.serenata as Serenata);
            } else {
                showToast(data?.error || 'No pudimos cargar la serenata', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [serenataId, showToast]);

    const updateLocation = useCallback(() => {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ lat: latitude, lng: longitude });

                try {
                    await fetch(`${API_BASE}/api/serenatas/${serenataId}/location`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            lat: latitude,
                            lng: longitude,
                            accuracy: position.coords.accuracy,
                        }),
                    });
                } catch (error) {
                    console.error('Error updating location:', error);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [serenataId]);

    useEffect(() => {
        fetchSerenata();
    }, [fetchSerenata]);

    useEffect(() => {
        if (!serenata) return;
        if (!['confirmed', 'in_progress'].includes(serenata.status)) return;
        updateLocation();
        const interval = setInterval(updateLocation, 30000);
        return () => clearInterval(interval);
    }, [serenata, updateLocation]);

    const callAction = async (path: string, body?: Record<string, unknown>) => {
        setIsUpdating(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}${path}`, {
                method: 'POST',
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                credentials: 'include',
                body: body ? JSON.stringify(body) : undefined,
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                await fetchSerenata();
                return true;
            }
            showToast(data?.error || 'No pudimos completar la acción', 'error');
            return false;
        } catch (error) {
            console.error(error);
            showToast('Error de conexión', 'error');
            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAccept = () => callAction('/accept');
    const handleConfirm = () => callAction('/confirm');
    const handleCancel = () => {
        if (!confirm('¿Cancelar esta serenata? El cliente será notificado.')) return;
        return callAction('/cancel');
    };
    const handleCheckOut = () => callAction('/checkout');

    const handleCheckIn = async () => {
        const ok = await callAction('/checkin', { code: checkInCode });
        if (ok) {
            setShowCheckInModal(false);
            setCheckInCode('');
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    if (!serenata) {
        return (
            <SerenatasPageShell width="default">
                <button
                    type="button"
                    onClick={() => router.push('/solicitudes')}
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
                    <p style={{ color: 'var(--fg-secondary)' }}>Serenata no encontrada</p>
                </div>
            </SerenatasPageShell>
        );
    }

    const eventLabel = serenata.eventDate
        ? new Date(`${serenata.eventDate}T${serenata.eventTime ?? '00:00'}`).toLocaleString('es-CL', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'Sin fecha';

    return (
        <div className="pb-20">
            <div
                className="px-6 py-4 border-b"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            >
                <button
                    type="button"
                    onClick={() => router.push('/solicitudes')}
                    className="serenatas-interactive mb-4 flex items-center gap-2 rounded-lg"
                    style={{ color: 'var(--fg-secondary)' }}
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <SerenatasPageHeader
                    title="Serenata activa"
                    description={STATUS_LABEL[serenata.status]}
                    className="!mb-0"
                />
            </div>

            <SerenatasPageShell width="default" className="space-y-4">
                <div
                    className="rounded-xl p-5 border space-y-3"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                    <div className="flex items-start gap-3">
                        <IconCalendar className="shrink-0 mt-1" size={20} style={{ color: 'var(--accent)' }} />
                        <div>
                            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                                Fecha y hora
                            </p>
                            <p className="font-medium" style={{ color: 'var(--fg)' }}>{eventLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <IconMapPin className="shrink-0 mt-1" size={20} style={{ color: 'var(--accent)' }} />
                        <div>
                            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
                                Dirección
                            </p>
                            <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                {serenata.address}
                                {serenata.city ? `, ${serenata.city}` : ''}
                            </p>
                            {serenata.recipientName ? (
                                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    Para: {serenata.recipientName}
                                </p>
                            ) : null}
                        </div>
                    </div>
                    {typeof serenata.price === 'number' ? (
                        <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                            Precio acordado:{' '}
                            <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                                ${serenata.price.toLocaleString('es-CL')} CLP
                            </span>
                        </p>
                    ) : null}
                    {serenata.message ? (
                        <p className="text-sm italic" style={{ color: 'var(--fg-secondary)' }}>
                            “{serenata.message}”
                        </p>
                    ) : null}
                </div>

                <LineupSection serenataId={serenataId} canManage />

                {['confirmed', 'in_progress'].includes(serenata.status) ? (
                    <div
                        className="rounded-xl p-4 border"
                        style={{
                            background: 'color-mix(in oklab, var(--surface) 75%, var(--info) 25%)',
                            borderColor: 'color-mix(in oklab, var(--surface) 60%, var(--info) 40%)',
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: 'color-mix(in oklab, var(--surface) 55%, var(--info) 45%)' }}
                            >
                                <IconNavigation size={20} style={{ color: 'var(--info)' }} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: 'var(--info)' }}>
                                    Ubicación activa
                                </p>
                                <p className="text-xs" style={{ color: 'var(--info)' }}>
                                    {currentLocation
                                        ? `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`
                                        : 'Obteniendo ubicación...'}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div className="space-y-3 pt-2">
                    {(serenata.status === 'pending' || serenata.status === 'quoted') && (
                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={isUpdating}
                            className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                        >
                            <IconCircleCheck size={22} />
                            {isUpdating ? 'Procesando...' : 'Aceptar serenata'}
                        </button>
                    )}

                    {serenata.status === 'accepted' && (
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isUpdating}
                            className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                            style={{ background: 'var(--info)', color: 'var(--accent-contrast)' }}
                        >
                            <IconCheck size={22} />
                            {isUpdating ? 'Procesando...' : 'Confirmar fecha y precio'}
                        </button>
                    )}

                    {serenata.status === 'payment_pending' && (
                        <div
                            className="rounded-xl border p-4 text-sm"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg-secondary)' }}
                        >
                            El cliente debe completar el pago anticipado antes de confirmar la serenata.
                        </div>
                    )}

                    {serenata.status === 'confirmed' && (
                        <button
                            type="button"
                            onClick={() => setShowCheckInModal(true)}
                            disabled={isUpdating}
                            className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                            style={{ background: 'var(--success)', color: 'var(--accent-contrast)' }}
                        >
                            <IconDoorEnter size={24} />
                            {isUpdating ? 'Procesando...' : 'Llegué — Check In'}
                        </button>
                    )}

                    {serenata.status === 'in_progress' && (
                        <button
                            type="button"
                            onClick={handleCheckOut}
                            disabled={isUpdating}
                            className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2"
                            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                        >
                            <IconDoorExit size={24} />
                            {isUpdating ? 'Procesando...' : 'Finalizar — Check Out'}
                        </button>
                    )}

                    {serenata.status === 'completed' && (
                        <div
                            className="py-4 rounded-xl font-semibold text-center"
                            style={{
                                background: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)',
                                color: 'var(--success)',
                            }}
                        >
                            <IconCheck className="inline mr-2" size={20} />
                            Serenata completada
                        </div>
                    )}

                    {!['completed', 'cancelled'].includes(serenata.status) && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isUpdating}
                            className="w-full py-3 rounded-xl font-medium border flex items-center justify-center gap-2"
                            style={{
                                background: 'var(--surface)',
                                borderColor: 'var(--border)',
                                color: 'var(--fg-secondary)',
                            }}
                        >
                            <IconHandStop size={18} />
                            Cancelar serenata
                        </button>
                    )}
                </div>
            </SerenatasPageShell>

            {showCheckInModal && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50 p-6"
                    style={{ background: 'color-mix(in oklab, var(--fg) 35%, transparent)' }}
                >
                    <div
                        className="rounded-2xl p-6 w-full max-w-sm border"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                        <div className="text-center mb-6">
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'color-mix(in oklab, var(--surface) 75%, var(--success) 25%)' }}
                            >
                                <IconQrcode size={32} style={{ color: 'var(--success)' }} />
                            </div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                                Confirmar llegada
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--fg-secondary)' }}>
                                Ingresa el código de 4 dígitos proporcionado por el cliente.
                            </p>
                        </div>

                        <input
                            type="text"
                            value={checkInCode}
                            onChange={(e) => setCheckInCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="0000"
                            className="w-full text-center text-3xl font-bold py-4 rounded-xl border-none focus:ring-2 mb-4"
                            style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                            maxLength={4}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCheckInModal(false)}
                                className="flex-1 py-3 rounded-xl font-medium"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCheckIn}
                                disabled={checkInCode.length !== 4 || isUpdating}
                                className="flex-1 py-3 rounded-xl font-medium disabled:opacity-50"
                                style={{ background: 'var(--success)', color: 'var(--accent-contrast)' }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
