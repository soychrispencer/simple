'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
    IconArrowLeft,
    IconMapPin,
    IconClock,
    IconCheck,
    IconLoader,
    IconPhone,
    IconMessageCircle,
    IconNavigation,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';

interface Location {
    lat: number;
    lng: number;
    updatedAt: string;
}

interface Serenata {
    id: string;
    status: string;
    recipientName: string;
    address: string;
    date: string;
    time: string;
    captainLat?: number;
    captainLng?: number;
    captainName?: string;
    captainPhone?: string;
    captainLocationUpdatedAt?: string;
}

export default function TrackingPage() {
    const router = useRouter();
    const params = useParams();
    const { user } = useAuth();
    const serenataId = params.id as string;

    const [serenata, setSerenata] = useState<Serenata | null>(null);
    const [captainLocation, setCaptainLocation] = useState<Location | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [eta, setEta] = useState<string>('Calculando...');

    useEffect(() => {
        fetchSerenata();
        const interval = setInterval(fetchCaptainLocation, 30000); // Update every 30s
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
                    fetchCaptainLocation();
                }
            }
        } catch (error) {
            console.error('Error fetching serenata:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchCaptainLocation = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/serenatas/${serenataId}/location`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                if (data.ok && data.location) {
                    setCaptainLocation(data.location);
                    calculateEta(data.location);
                }
            }
        } catch (error) {
            console.error('Error fetching location:', error);
        }
    };

    const calculateEta = (location: Location) => {
        // Simple mock calculation - in real app would use distance API
        const minutes = Math.floor(Math.random() * 15) + 5;
        setEta(`${minutes} minutos`);
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Confirmada';
            case 'in_progress': return 'En camino';
            case 'completed': return 'Completada';
            default: return 'Pendiente';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'text-blue-600 bg-blue-50';
            case 'in_progress': return 'text-green-600 bg-green-50';
            case 'completed': return 'text-zinc-600 bg-zinc-100';
            default: return 'text-amber-600 bg-amber-50';
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
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-zinc-100">
                <button 
                    onClick={() => router.push('/inicio')}
                    className="flex items-center gap-2 text-zinc-600 mb-4"
                >
                    <IconArrowLeft size={20} />
                    <span>Volver</span>
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900">Seguimiento</h1>
                        <p className="text-sm text-zinc-500">Para: {serenata.recipientName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(serenata.status)}`}>
                        {getStatusText(serenata.status)}
                    </span>
                </div>
            </div>

            {/* Map Placeholder */}
            <div className="h-64 bg-gradient-to-br from-rose-100 to-blue-100 relative">
                {/* Mock map with dots */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                        <IconMapPin size={48} className="text-rose-500 mx-auto mb-2" />
                        <p className="text-sm text-zinc-600 font-medium">{serenata.address}</p>
                    </div>
                </div>
                
                {/* Captain location dot */}
                {captainLocation && (
                    <div 
                        className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"
                        style={{ 
                            left: '30%', 
                            top: '40%',
                        }}
                    />
                )}
                
                {/* Destination dot */}
                <div 
                    className="absolute w-4 h-4 bg-rose-500 rounded-full border-2 border-white shadow-lg"
                    style={{ 
                        right: '20%', 
                        bottom: '30%',
                    }}
                />
            </div>

            {/* Status Card */}
            <div className="px-6 py-6 space-y-4">
                {/* ETA Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                            <IconClock className="text-rose-500" size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-zinc-500">Tiempo estimado</p>
                            <p className="text-2xl font-bold text-zinc-900">{eta}</p>
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-xl p-5 shadow-sm">
                    <h3 className="font-semibold text-zinc-900 mb-4">Estado de la serenata</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                ['confirmed', 'in_progress', 'completed'].includes(serenata.status) 
                                    ? 'bg-green-500 text-white' : 'bg-zinc-200'
                            }`}>
                                <IconCheck size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-zinc-900">Serenata confirmada</p>
                                <p className="text-sm text-zinc-500">El capitán ha aceptado tu solicitud</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                ['in_progress', 'completed'].includes(serenata.status) 
                                    ? 'bg-green-500 text-white' : 'bg-zinc-200'
                            }`}>
                                <IconCheck size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-zinc-900">En camino</p>
                                <p className="text-sm text-zinc-500">El capitán se dirige al destino</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                serenata.status === 'completed' 
                                    ? 'bg-green-500 text-white' : 'bg-zinc-200'
                            }`}>
                                <IconCheck size={16} />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-zinc-900">Serenata completada</p>
                                <p className="text-sm text-zinc-500">El capitán ha finalizado</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Captain Info */}
                {serenata.captainName && (
                    <div className="bg-white rounded-xl p-5 shadow-sm">
                        <h3 className="font-semibold text-zinc-900 mb-4">Tu capitán</h3>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-lg">
                                    {serenata.captainName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-zinc-900">{serenata.captainName}</p>
                                <p className="text-sm text-zinc-500">Capitán de serenata</p>
                            </div>
                            <div className="flex gap-2">
                                <a 
                                    href={`tel:${serenata.captainPhone}`}
                                    className="p-2 bg-green-100 rounded-full text-green-600"
                                >
                                    <IconPhone size={20} />
                                </a>
                                <button 
                                    onClick={() => router.push(`/chat`)}
                                    className="p-2 bg-blue-100 rounded-full text-blue-600"
                                >
                                    <IconMessageCircle size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Refresh Button */}
                <button
                    onClick={fetchCaptainLocation}
                    className="w-full bg-white border border-zinc-200 py-3 rounded-xl font-medium text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                >
                    <IconNavigation size={18} />
                    Actualizar ubicación
                </button>
            </div>
        </div>
    );
}
