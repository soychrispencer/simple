'use client';

import { useState, useEffect } from 'react';
import { 
    IconMapPin, 
    IconClock, 
    IconConfetti, 
    IconTrendingUp,
    IconPlus,
    IconCalendar,
    IconUsers,
    IconArrowRight,
    IconStar,
    IconWallet,
    IconUser,
    IconLoader,
    IconHeart,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';

interface Serenata {
    id: string;
    date: string;
    time: string;
    location: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    clientName: string;
    price: number;
}

export default function InicioPage() {
    const { user, captainProfile, musicianProfile, isLoading: authLoading } = useAuth();
    const [serenatas, setSerenatas] = useState<Serenata[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        completed: 0,
        earnings: 0,
        rating: 5,
    });
    const [isLoading, setIsLoading] = useState(true);

    // Determine user type
    const isCaptain = user?.role === 'captain' || !!captainProfile;
    const isMusician = user?.role === 'musician' || !!musicianProfile;
    const isClient = user?.role === 'client' || (!isCaptain && !isMusician);

    useEffect(() => {
        if (isCaptain) {
            fetchCaptainData();
        } else {
            setIsLoading(false);
        }
    }, [isCaptain]);

    const fetchCaptainData = async () => {
        try {
            const [serenatasRes, statsRes] = await Promise.all([
                fetch(`${API_BASE}/api/serenatas/requests/my/assigned`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/serenatas/captains/me/stats`, { credentials: 'include' }),
            ]);

            if (serenatasRes.ok) {
                const data = await serenatasRes.json();
                if (data.ok) setSerenatas(data.serenatas || []);
            }
            if (statsRes.ok) {
                const data = await statsRes.json();
                if (data.ok) setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || (isLoading && isCaptain)) {
        return (
            <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
                <IconLoader className="animate-spin text-rose-500" size={32} />
            </div>
        );
    }

    // Captain Dashboard
    if (isCaptain) {
        return (
            <div className="min-h-screen bg-zinc-50 pb-20">
                <div className="bg-rose-500 text-white px-6 py-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Hola, {user?.name?.split(' ')[0]}</h1>
                            <p className="text-rose-100 mt-1">
                                Plan {(captainProfile?.subscriptionPlan || 'free').toUpperCase()}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                            <IconUser size={24} />
                        </div>
                    </div>
                </div>

                <div className="px-6 -mt-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-zinc-500 text-sm">Ganancias mes</p>
                            <p className="text-2xl font-bold text-zinc-900">${stats.earnings.toLocaleString()}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 shadow-sm">
                            <p className="text-zinc-500 text-sm">Completadas</p>
                            <p className="text-2xl font-bold text-zinc-900">{stats.completed}</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 mt-6">
                    <div className="grid grid-cols-2 gap-3">
                        <Link href="/cuadrilla" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <IconUsers className="text-rose-500 mb-2" size={24} />
                            <p className="font-medium text-zinc-900">Mi Cuadrilla</p>
                            <p className="text-sm text-zinc-500">Gestionar musicos</p>
                        </Link>
                        <Link href="/disponibilidad" className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <IconCalendar className="text-rose-500 mb-2" size={24} />
                            <p className="font-medium text-zinc-900">Disponibilidad</p>
                            <p className="text-sm text-zinc-500">Configurar horarios</p>
                        </Link>
                    </div>
                </div>

                <div className="px-6 mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-zinc-900">Proximas serenatas</h2>
                        <Link href="/agenda" className="text-rose-500 text-sm font-medium">Ver todo</Link>
                    </div>
                    
                    {serenatas.length === 0 ? (
                        <div className="bg-white rounded-xl p-6 text-center">
                            <IconConfetti size={48} className="mx-auto text-zinc-300 mb-3" />
                            <p className="text-zinc-500">No tienes serenatas programadas</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {serenatas.slice(0, 3).map((serenata) => (
                                <div key={serenata.id} className="bg-white rounded-xl p-4 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                                serenata.status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
                                            }`} />
                                            <span className="font-medium text-zinc-900">{serenata.clientName}</span>
                                        </div>
                                        <span className="font-semibold text-rose-600">${serenata.price}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                                        <span>{new Date(serenata.date).toLocaleDateString('es-CL')}</span>
                                        <span>{serenata.time}</span>
                                        <span>{serenata.location}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Client Dashboard
    if (isClient) {
        return (
            <div className="min-h-screen bg-zinc-50 pb-20">
                <div className="bg-rose-500 text-white px-6 py-8">
                    <h1 className="text-2xl font-bold">Bienvenido, {user?.name?.split(' ')[0]}</h1>
                    <p className="text-rose-100 mt-1">Encuentra el mejor mariachi para tu serenata</p>
                </div>

                <div className="px-6 mt-6">
                    <Link 
                        href="/explorar" 
                        className="block bg-rose-500 text-white text-center py-4 rounded-xl font-medium hover:bg-rose-600 transition-colors"
                    >
                        <IconPlus className="inline mr-2" size={20} />
                        Solicitar serenata
                    </Link>
                </div>
            </div>
        );
    }

    // Musician Dashboard (fallback)
    return (
        <div className="min-h-screen bg-zinc-50 pb-20">
            <div className="bg-zinc-900 text-white px-6 py-8">
                <h1 className="text-2xl font-bold">Hola, {user?.name?.split(' ')[0]}</h1>
            </div>
            <div className="px-6 mt-6">
                <p className="text-zinc-600">Dashboard de musico</p>
            </div>
        </div>
    );
}
