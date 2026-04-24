'use client';

import { useState, useEffect } from 'react';
import { 
    IconMapPin, 
    IconClock, 
    IconMusic, 
    IconTrendingUp,
    IconPlus,
    IconRadio,
    IconCalendar,
    IconUsers,
    IconArrowRight,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useAvailability } from '@/hooks/useAvailability';
import { API_BASE } from '@simple/config';

interface Serenata {
    id: string;
    clientName: string;
    address: string;
    dateTime: string;
    status: string;
    price: string;
}

export default function HomePage() {
    const { musicianProfile } = useAuth();
    const { isAvailable, availableNow, toggleAvailableNow, isLoading: isToggling } = useAvailability();
    const [serenatas, setSerenatas] = useState<Serenata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [todayEarnings, setTodayEarnings] = useState(0);

    // Load serenatas from API
    useEffect(() => {
        const loadSerenatas = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/serenatas/requests/my/assigned`, {
                    credentials: 'include',
                });
                const data = await res.json();
                
                if (data.ok && data.serenatas) {
                    setSerenatas(data.serenatas);
                    const today = new Date().toDateString();
                    const todayTotal = data.serenatas
                        .filter((s: Serenata) => new Date(s.dateTime).toDateString() === today)
                        .reduce((sum: number, s: Serenata) => sum + parseInt(s.price || '0'), 0);
                    setTodayEarnings(todayTotal);
                }
            } catch (error) {
                console.error('Failed to load serenatas:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSerenatas();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDateTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
            time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        };
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Welcome Header - Desktop */}
            <div className="hidden md:block">
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                    ¡Hola, {musicianProfile?.instrument || 'Músico'}!
                </h1>
                <p style={{ color: 'var(--fg-muted)' }}>
                    Aquí está el resumen de tu día
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Availability Toggle - Adaptativo */}
                    <div 
                        className={`rounded-2xl p-5 md:p-6 text-white shadow-lg transition-all ${
                            availableNow 
                                ? 'gradient-hero' 
                                : ''
                        }`}
                        style={!availableNow ? { background: 'var(--bg-muted)' } : {}}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div 
                                    className={`p-3 rounded-full ${availableNow ? 'bg-white/20' : 'bg-[var(--surface)]'}`}
                                >
                                    <IconRadio size={24} style={{ color: availableNow ? 'white' : 'var(--fg-muted)' }} />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg" style={{ color: availableNow ? 'white' : 'var(--fg)' }}>
                                        {availableNow ? 'Disponible Ahora' : 'No Disponible'}
                                    </p>
                                    <p style={{ color: availableNow ? 'rgba(255,255,255,0.8)' : 'var(--fg-muted)' }}>
                                        {availableNow 
                                            ? 'Recibiendo solicitudes urgentes' 
                                            : 'Activa para recibir trabajo'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={toggleAvailableNow}
                                disabled={isToggling}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
                                    availableNow ? 'bg-white' : 'bg-[var(--border-strong)]'
                                }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-6 h-6 rounded-full transition-transform duration-300 ${
                                        availableNow ? 'translate-x-6' : 'translate-x-0'
                                    }`}
                                    style={{ background: availableNow ? 'var(--accent)' : 'var(--surface)' }}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Quick Stats - Grid adaptativo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card card-hover">
                            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--fg-muted)' }}>
                                <IconTrendingUp size={16} />
                                <span className="text-xs font-medium">Hoy</span>
                            </div>
                            <p className="text-xl md:text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                                {formatCurrency(todayEarnings)}
                            </p>
                        </div>
                        <div className="card card-hover">
                            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--fg-muted)' }}>
                                <IconMusic size={16} />
                                <span className="text-xs font-medium">Próximas</span>
                            </div>
                            <p className="text-xl md:text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                                {serenatas.length}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>serenatas</p>
                        </div>
                        <div className="card card-hover hidden md:block">
                            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--fg-muted)' }}>
                                <IconCalendar size={16} />
                                <span className="text-xs font-medium">Esta semana</span>
                            </div>
                            <p className="text-xl md:text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                                {serenatas.filter(s => {
                                    const d = new Date(s.dateTime);
                                    const now = new Date();
                                    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    return diff >= 0 && diff <= 7;
                                }).length}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>programadas</p>
                        </div>
                        <div className="card card-hover hidden md:block">
                            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--fg-muted)' }}>
                                <IconUsers size={16} />
                                <span className="text-xs font-medium">Grupos</span>
                            </div>
                            <p className="text-xl md:text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                                Activo
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{musicianProfile?.instrument}</p>
                        </div>
                    </div>

                    {/* Upcoming Serenatas - Lista adaptativa */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>
                                Próximas Serenatas
                            </h2>
                            <Link 
                                href="/agenda" 
                                className="flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-80"
                                style={{ color: 'var(--accent)' }}
                            >
                                Ver todas
                                <IconArrowRight size={16} />
                            </Link>
                        </div>

                        {serenatas.length === 0 ? (
                            <div 
                                className="rounded-2xl p-8 text-center"
                                style={{ background: 'var(--bg-subtle)' }}
                            >
                                <IconMusic size={48} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                                <p style={{ color: 'var(--fg-muted)' }}>No tienes serenatas programadas</p>
                                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                    Activa "Disponible Ahora" para recibir solicitudes
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {serenatas.slice(0, 5).map((serenata) => {
                                    const { date, time } = formatDateTime(serenata.dateTime);
                                    return (
                                        <Link
                                            key={serenata.id}
                                            href={`/serenata/${serenata.id}`}
                                            className="card card-hover block"
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span 
                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                                            style={{ 
                                                                background: 'color-mix(in oklab, var(--success) 15%, transparent)',
                                                                color: 'var(--success)'
                                                            }}
                                                        >
                                                            Confirmada
                                                        </span>
                                                        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                                            {formatCurrency(parseInt(serenata.price || '0'))}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-semibold truncate" style={{ color: 'var(--fg)' }}>
                                                        {serenata.clientName}
                                                    </h3>
                                                    <div className="flex items-center gap-1 text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                                        <IconMapPin size={14} />
                                                        <span className="truncate">{serenata.address}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{time}</p>
                                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{date}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - Sidebar Desktop */}
                <div className="hidden lg:block space-y-6">
                    {/* Quick Actions */}
                    <div className="card">
                        <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>Acciones Rápidas</h3>
                        <div className="space-y-3">
                            <Link
                                href="/grupos"
                                className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
                                style={{ border: '1px solid var(--border)' }}
                            >
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'var(--accent-subtle)' }}
                                >
                                    <IconPlus size={20} style={{ color: 'var(--accent)' }} />
                                </div>
                                <div>
                                    <p className="font-medium text-sm" style={{ color: 'var(--fg)' }}>Crear Grupo</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Forma un nuevo equipo</p>
                                </div>
                            </Link>
                            <Link
                                href="/mapa"
                                className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
                                style={{ border: '1px solid var(--border)' }}
                            >
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'var(--accent-subtle)' }}
                                >
                                    <IconMapPin size={20} style={{ color: 'var(--accent)' }} />
                                </div>
                                <div>
                                    <p className="font-medium text-sm" style={{ color: 'var(--fg)' }}>Ver Mapa</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Encuentra serenatas cerca</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Today's Schedule Mini */}
                    <div className="card">
                        <div className="flex items-center gap-2 mb-4">
                            <IconClock size={18} style={{ color: 'var(--accent)' }} />
                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Horario de Hoy</h3>
                        </div>
                        {serenatas.filter(s => new Date(s.dateTime).toDateString() === new Date().toDateString()).length === 0 ? (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--fg-muted)' }}>
                                Sin serenatas hoy
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {serenatas
                                    .filter(s => new Date(s.dateTime).toDateString() === new Date().toDateString())
                                    .slice(0, 3)
                                    .map(s => {
                                        const { time } = formatDateTime(s.dateTime);
                                        return (
                                            <div 
                                                key={s.id} 
                                                className="flex items-center gap-3 p-2 rounded-lg"
                                                style={{ background: 'var(--bg-subtle)' }}
                                            >
                                                <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                                                    {time}
                                                </span>
                                                <span className="text-sm truncate" style={{ color: 'var(--fg)' }}>
                                                    {s.clientName}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Quick Actions - Solo visible en móvil */}
            <div className="grid grid-cols-2 gap-3 md:hidden">
                <Link
                    href="/grupos"
                    className="flex items-center justify-center gap-2 rounded-xl p-4 font-medium transition-colors"
                    style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                >
                    <IconPlus size={20} />
                    <span>Crear Grupo</span>
                </Link>
                <Link
                    href="/mapa"
                    className="flex items-center justify-center gap-2 rounded-xl p-4 font-medium transition-colors"
                    style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                >
                    <IconMapPin size={20} />
                    <span>Ver Mapa</span>
                </Link>
            </div>
        </div>
    );
}
