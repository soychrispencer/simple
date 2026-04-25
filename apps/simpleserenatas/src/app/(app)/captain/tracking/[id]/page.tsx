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
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';

interface Serenata {
    id: string;
    status: string;
    recipientName: string;
    address: string;
    comuna: string;
    date: string;
    time: string;
    checkInCode?: string;
    lat?: number;
    lng?: number;
}

export default function CaptainTrackingPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const serenataId = params.id as string;

    const [serenata, setSerenata] = useState<Serenata | null>(null);
    const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [checkInCode, setCheckInCode] = useState('');

    useEffect(() => {
        fetchSerenata();
        // Start location tracking
        const interval = setInterval(updateLocation, 30000);
        return () => clearInterval(interval);
    }, [serenataId]);

    const fetchSerenata = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                if (data.ok) {
                    setSerenata(data.serenata);
                }
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateLocation = useCallback(async () => {
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

    const handleCheckIn = async () => {
        setIsUpdating(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ code: checkInCode }),
            });

            if (res.ok) {
                setShowCheckInModal(false);
                fetchSerenata();
            } else {
                const data = await res.json();
                alert(data.error || 'Error en check-in');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCheckOut = async () => {
        setIsUpdating(true);
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}/checkout`, {
                method: 'POST',
                credentials: 'include',
            });

            if (res.ok) {
                fetchSerenata();
            } else {
                const data = await res.json();
                alert(data.error || 'Error en check-out');
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsUpdating(false);
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Confirmada - En camino';
            case 'in_progress': return 'En progreso';
            case 'completed': return 'Completada';
            default: return 'Pendiente';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <IconLoader className="animate-spin text-rose-500" size={32} />
            </div>
        );
    }

    if (!serenata) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <p className="text-zinc-500">Serenata no encontrada</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-zinc-100">
                <button 
                    onClick={() => router.push('/solicitudes')}
                    className="flex items-center gap-2 text-zinc-600 mb-4"
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900">Serenata Activa</h1>
                        <p className="text-sm text-zinc-500">{getStatusText(serenata.status)}</p>
                    </div>
                </div>
            </div>

            {/* Destination Card */}
            <div className="px-6 py-4">
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                        <IconMapPin className="text-rose-500 shrink-0 mt-1" size={20} />
                        <div className="flex-1">
                            <p className="font-medium text-zinc-900">{serenata.address}</p>
                            <p className="text-sm text-zinc-500">{serenata.comuna}</p>
                            <p className="text-sm text-zinc-400 mt-1">
                                Para: {serenata.recipientName}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Location Status */}
            <div className="px-6 py-2">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <IconNavigation className="text-blue-600" size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900">Ubicación activa</p>
                            <p className="text-xs text-blue-600">
                                {currentLocation 
                                    ? `Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}`
                                    : 'Obteniendo ubicación...'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 space-y-3">
                {/* Check In Button */}
                {serenata.status === 'confirmed' && (
                    <button
                        onClick={() => setShowCheckInModal(true)}
                        disabled={isUpdating}
                        className="w-full bg-green-500 text-white py-4 rounded-xl font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <IconDoorEnter size={24} />
                        {isUpdating ? 'Procesando...' : 'Llegué - Check In'}
                    </button>
                )}

                {/* Check Out Button */}
                {serenata.status === 'in_progress' && (
                    <button
                        onClick={handleCheckOut}
                        disabled={isUpdating}
                        className="w-full bg-rose-500 text-white py-4 rounded-xl font-semibold hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <IconDoorExit size={24} />
                        {isUpdating ? 'Procesando...' : 'Finalizar - Check Out'}
                    </button>
                )}

                {/* Status Badge */}
                {serenata.status === 'completed' && (
                    <div className="bg-green-100 text-green-700 py-4 rounded-xl font-semibold text-center">
                        <IconCheck className="inline mr-2" size={20} />
                        Serenata completada
                    </div>
                )}
            </div>

            {/* Check In Modal */}
            {showCheckInModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <IconQrcode className="text-green-600" size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900">Confirmar llegada</h3>
                            <p className="text-sm text-zinc-500">
                                Ingresa el código de 4 dígitos proporcionado por el cliente
                            </p>
                        </div>

                        <input
                            type="text"
                            value={checkInCode}
                            onChange={(e) => setCheckInCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="0000"
                            className="w-full text-center text-3xl font-bold py-4 bg-zinc-100 rounded-xl border-none focus:ring-2 focus:ring-green-500 mb-4"
                            maxLength={4}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCheckInModal(false)}
                                className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCheckIn}
                                disabled={checkInCode.length !== 4 || isUpdating}
                                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50"
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
