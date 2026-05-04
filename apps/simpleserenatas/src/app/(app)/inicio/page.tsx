'use client';

import { useState, useEffect } from 'react';
import {
    IconPlus,
    IconCalendar,
    IconLoader,
    IconBell,
    IconChevronRight,
    IconMusic,
    IconMapPin,
    IconClock,
    IconUsersGroup,
    IconRoute,
    IconWallet,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageShell } from '@/components/shell';

interface Serenata {
    id: string;
    date?: string;
    time?: string;
    dateTime?: string;
    location?: string;
    address?: string;
    city?: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | string;
    clientName: string;
    recipientName?: string;
    price?: number;
    urgency?: string;
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' | 'info' {
    if (status === 'completed') return 'success';
    if (['accepted', 'payment_pending', 'confirmed', 'in_progress'].includes(status)) return 'info';
    if (['cancelled', 'rejected'].includes(status)) return 'neutral';
    return 'warning';
}

function statusLabel(status: string): string {
    if (status === 'pending') return 'Pendiente';
    if (status === 'quoted') return 'Cotizada';
    if (status === 'accepted') return 'Aceptada';
    if (status === 'payment_pending') return 'Pago pendiente';
    if (status === 'confirmed') return 'Confirmada';
    if (status === 'in_progress') return 'En camino';
    if (status === 'completed') return 'Completada';
    if (status === 'cancelled') return 'Cancelada';
    if (status === 'rejected') return 'Rechazada';
    return 'En curso';
}

function formatDateTime(s: Serenata): string {
    if (s.dateTime) {
        const d = new Date(s.dateTime);
        return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (s.date && s.time) {
        const d = new Date(s.date);
        return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · ${s.time}`;
    }
    if (s.date) {
        const d = new Date(s.date);
        return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    }
    return 'Fecha por definir';
}

function formatPrice(price?: number): string {
    if (typeof price !== 'number') return '';
    return `$${price.toLocaleString('es-CL')}`;
}

function serenataHref(id: string, role: 'client' | 'musician' | 'coordinator'): string {
    if (role === 'client') return `/tracking/${id}`;
    if (role === 'coordinator') return `/coordinator/tracking/${id}`;
    return `/serenata/${id}`;
}

export default function InicioPage() {
    const { user, coordinatorProfile, musicianProfile, effectiveRole, isLoading: authLoading } = useAuth();
    const [items, setItems] = useState<Serenata[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const isCoordinator = effectiveRole === 'coordinator' || !!coordinatorProfile;
    const isMusician = effectiveRole === 'musician' || !!musicianProfile;
    const isClient =
        effectiveRole === 'client' ||
        (!effectiveRole && !coordinatorProfile && !musicianProfile);

    const firstName = user?.name?.split(' ')[0] ?? 'Usuario';

    useEffect(() => {
        let cancelled = false;

        const finish = () => {
            if (!cancelled) setIsLoading(false);
        };

        const run = async () => {
            setIsLoading(true);
            try {
                let endpoint = '/api/serenatas/requests';
                if (isCoordinator || isMusician) {
                    endpoint = '/api/serenatas/requests/my/assigned';
                }
                
                const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.ok && data.serenatas) {
                        setItems(data.serenatas);
                        const serenatas = data.serenatas;
                        setStats({
                            total: serenatas.length,
                            pending: serenatas.filter((s: Serenata) => s.status === 'pending').length,
                            confirmed: serenatas.filter((s: Serenata) => s.status === 'confirmed').length,
                            completed: serenatas.filter((s: Serenata) => s.status === 'completed').length,
                        });
                    }
                }
            } catch (e) {
                console.error('Inicio load error:', e);
            } finally {
                finish();
            }
        };

        if (!authLoading) void run();
        else setIsLoading(true);

        return () => {
            cancelled = true;
        };
    }, [authLoading, isCoordinator, isMusician, isClient]);

    // Vista para Clientes
    if (isClient) {
        return (
            <SerenatasPageShell fullWidth>
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                        Hola {firstName}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                        ¿Necesitas una serenata? ¡Solicítala ahora!
                    </p>
                </div>

                <Link href="/solicitar" className="block mb-6">
                    <div 
                        className="flex items-center gap-4 p-4 rounded-2xl"
                        style={{ background: 'var(--accent)', color: 'white' }}
                    >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                            <IconPlus size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">Solicitar serenata</p>
                            <p className="text-sm opacity-90">Crea una nueva solicitud</p>
                        </div>
                        <IconChevronRight size={20} />
                    </div>
                </Link>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                    </div>
                ) : items.length > 0 ? (
                    <div className="space-y-3">
                        <h2 className="font-semibold mb-3" style={{ color: 'var(--fg)' }}>Tus solicitudes</h2>
                        {items.slice(0, 5).map((item) => (
                            <Link key={item.id} href={serenataHref(item.id, 'client')}>
                                <div 
                                    className="flex items-center gap-3 p-3 rounded-xl"
                                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                                >
                                    <div 
                                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: `var(--${statusTone(item.status)}-subtle)` }}
                                    >
                                        <IconMusic size={20} style={{ color: `var(--${statusTone(item.status)})` }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate" style={{ color: 'var(--fg)' }}>
                                            {item.recipientName || item.clientName}
                                        </p>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            {formatDateTime(item)} · {statusLabel(item.status)}
                                        </p>
                                    </div>
                                    <IconChevronRight size={18} style={{ color: 'var(--fg-muted)' }} />
                                </div>
                            </Link>
                        ))}
                        {items.length > 5 && (
                            <Link href="/solicitudes" className="block text-center py-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                                Ver todas ({items.length})
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                        <IconMusic size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No tienes solicitudes activas</p>
                        <Link href="/solicitar" className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--accent)' }}>
                            Crear primera solicitud
                        </Link>
                    </div>
                )}
            </SerenatasPageShell>
        );
    }

    // Vista para Coordinadores
    if (isCoordinator) {
        return (
            <SerenatasPageShell fullWidth>
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                        Panel de Coordinador
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                        Gestiona tus serenatas y equipos
                    </p>
                </div>

                {/* Stats Grid - 4 cols en desktop */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="p-4 rounded-xl" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}>
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stats.pending}</p>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Por asignar</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="text-2xl font-bold" style={{ color: 'var(--info)' }}>{stats.confirmed}</p>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Confirmadas</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{stats.total}</p>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Total mes</p>
                    </div>
                    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{stats.completed}</p>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Completadas</p>
                    </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <Link href="/solicitudes">
                        <div 
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center"
                            style={{ background: 'var(--accent)', color: 'white' }}
                        >
                            <IconBell size={24} />
                            <span className="font-medium text-sm">Buscar Serenatas</span>
                        </div>
                    </Link>
                    <Link href="/cuadrilla">
                        <div 
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center"
                            style={{ background: 'var(--accent)', color: 'white' }}
                        >
                            <IconUsersGroup size={24} />
                            <span className="font-medium text-sm">Mi Cuadrilla</span>
                        </div>
                    </Link>
                    <Link href="/mapa">
                        <div 
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                        >
                            <IconRoute size={24} style={{ color: 'var(--accent)' }} />
                            <span className="font-medium text-sm" style={{ color: 'var(--fg)' }}>Ver Rutas</span>
                        </div>
                    </Link>
                    <Link href="/finanzas">
                        <div 
                            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-center"
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                        >
                            <IconWallet size={24} style={{ color: 'var(--accent)' }} />
                            <span className="font-medium text-sm" style={{ color: 'var(--fg)' }}>Finanzas</span>
                        </div>
                    </Link>
                </div>

                {/* Today's Serenatas */}
                <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Serenatas de hoy</h2>
                        <Link href="/agenda" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                            Ver agenda
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                        </div>
                    ) : items.length > 0 ? (
                        <div className="space-y-3">
                            {items.slice(0, 5).map((item) => (
                                <Link key={item.id} href={serenataHref(item.id, 'coordinator')}>
                                    <div 
                                        className="flex items-center gap-3 p-3 rounded-xl"
                                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                                    >
                                        <div 
                                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ background: `var(--${statusTone(item.status)}-subtle)` }}
                                        >
                                            <IconClock size={20} style={{ color: `var(--${statusTone(item.status)})` }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate" style={{ color: 'var(--fg)' }}>
                                                {item.recipientName || item.clientName}
                                            </p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                {formatDateTime(item)} · {item.location || item.city || 'Sin ubicación'}
                                            </p>
                                        </div>
                                        {item.price && (
                                            <p className="font-medium text-sm" style={{ color: 'var(--success)' }}>
                                                {formatPrice(item.price)}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            ))}
                            {items.length > 5 && (
                                <Link href="/agenda" className="block text-center py-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                                    Ver todas ({items.length})
                                </Link>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                            <IconCalendar size={48} className="mx-auto mb-3 opacity-50" />
                            <p>No tienes serenatas asignadas</p>
                            <Link href="/solicitudes" className="text-sm font-medium mt-2 inline-block" style={{ color: 'var(--accent)' }}>
                                Buscar solicitudes
                            </Link>
                        </div>
                    )}
                </div>
            </SerenatasPageShell>
        );
    }

    // Vista para Músicos
    return (
        <SerenatasPageShell fullWidth>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                    Panel de Músico
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                    Bienvenido, {firstName}
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stats.total}</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Total</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{stats.pending}</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Pendientes</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--info)' }}>{stats.confirmed}</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Confirmadas</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{stats.completed}</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Completadas</p>
                </div>
            </div>

            {/* Acciones rápidas */}
            <div className="space-y-3 mb-6">
                <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Acciones rápidas</h2>
                
                <Link href="/invitaciones">
                    <div
                        className="flex items-center gap-3 p-4 rounded-xl"
                        style={{ background: 'var(--accent)', color: 'white' }}
                    >
                        <IconBell size={20} />
                        <span className="font-medium">Ver invitaciones</span>
                    </div>
                </Link>
                
                <Link href="/agenda">
                    <div 
                        className="flex items-center gap-3 p-4 rounded-xl"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    >
                        <IconCalendar size={20} style={{ color: 'var(--accent)' }} />
                        <span className="font-medium" style={{ color: 'var(--fg)' }}>Ver agenda</span>
                    </div>
                </Link>
            </div>

            {/* Lista de serenatas */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                </div>
            ) : items.length > 0 ? (
                <div className="space-y-3">
                    <h2 className="font-semibold mb-3" style={{ color: 'var(--fg)' }}>Tus serenatas</h2>
                    {items.slice(0, 5).map((item) => (
                        <Link key={item.id} href={serenataHref(item.id, 'musician')}>
                            <div 
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                            >
                                <div 
                                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ background: `var(--${statusTone(item.status)}-subtle)` }}
                                >
                                    <IconClock size={20} style={{ color: `var(--${statusTone(item.status)})` }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" style={{ color: 'var(--fg)' }}>
                                        {item.recipientName || item.clientName}
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                        {formatDateTime(item)} · {item.location || item.city || 'Sin ubicación'}
                                    </p>
                                </div>
                                {item.price && (
                                    <p className="font-medium text-sm" style={{ color: 'var(--success)' }}>
                                        {formatPrice(item.price)}
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                    {items.length > 5 && (
                        <Link href="/agenda" className="block text-center py-3 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                            Ver todas ({items.length})
                        </Link>
                    )}
                </div>
            ) : (
                <div className="text-center py-12" style={{ color: 'var(--fg-muted)' }}>
                    <IconCalendar size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No tienes serenatas asignadas</p>
                </div>
            )}
        </SerenatasPageShell>
    );
}
