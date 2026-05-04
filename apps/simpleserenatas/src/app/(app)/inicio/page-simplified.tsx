'use client';

import { useState, useEffect } from 'react';
import {
    IconPlus,
    IconCalendar,
    IconLoader,
    IconBell,
    IconChevronRight,
    IconMusic,
    IconUser,
    IconMapPin,
    IconClock,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import {
    PanelButton,
    PanelCard,
    PanelList,
    PanelListRow,
    PanelNotice,
    PanelStatusBadge,
} from '@simple/ui';
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
    if (status === 'confirmed') return 'info';
    if (status === 'cancelled') return 'neutral';
    return 'warning';
}

function statusLabel(status: string): string {
    if (status === 'pending') return 'Pendiente';
    if (status === 'confirmed') return 'Confirmada';
    if (status === 'completed') return 'Completada';
    if (status === 'cancelled') return 'Cancelada';
    return 'En curso';
}

function formatDateTime(s: Serenata): string {
    if (s.dateTime) {
        const d = new Date(s.dateTime);
        return `${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (s.date && s.time) {
        return `${new Date(s.date).toLocaleDateString('es-CL')} · ${s.time}`;
    }
    return 'Fecha por definir';
}

function formatPrice(price?: number): string {
    if (typeof price !== 'number') return '';
    return `$${price.toLocaleString('es-CL')}`;
}

export default function InicioPage() {
    const { user, coordinatorProfile, musicianProfile, isLoading: authLoading } = useAuth();
    const [items, setItems] = useState<Serenata[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    const role = user?.role;
    const isCoordinator = role === 'coordinator' || !!coordinatorProfile;
    const isMusician = role === 'musician' || !!musicianProfile;
    const isAdmin = role === 'admin';
    const isClient = role === 'client' || (role == null && !coordinatorProfile && !musicianProfile);

    const firstName = user?.name?.split(' ')[0] ?? 'Usuario';

    useEffect(() => {
        let cancelled = false;

        const finish = () => {
            if (!cancelled) setIsLoading(false);
        };

        const run = async () => {
            setIsLoading(true);
            try {
                // Unificar la carga de datos para todos los roles
                let endpoint = '/api/serenatas/requests';
                if (isCoordinator || isMusician) {
                    endpoint = '/api/serenatas/requests/my/assigned';
                }
                
                const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.ok && data.serenatas) {
                        setItems(data.serenatas);
                        // Calcular estadísticas
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

    if (authLoading || isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center" style={{ background: 'var(--bg)' }}>
                <IconLoader className="animate-spin" style={{ color: 'var(--accent)' }} size={32} />
            </div>
        );
    }

    // Vista simplificada para Clientes
    if (isClient) {
        return (
            <SerenatasPageShell fullWidth>
                {/* Header simplificado */}
                <div className="mb-6">
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                        Hola {firstName}
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                        ¿Necesitas una serenata? ¡Solicítala ahora!
                    </p>
                </div>

                {/* Acción principal */}
                <Link href="/solicitar" className="block mb-6">
                    <div 
                        className="flex items-center gap-4 p-4 rounded-2xl"
                        style={{ background: 'var(--accent)', color: 'white' }}
                    >
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                            <IconPlus size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-lg">Solicitar serenata</p>
                            <p className="text-sm opacity-90">Crea un nuevo pedido en minutos</p>
                        </div>
                        <IconChevronRight size={24} />
                    </div>
                </Link>

                {/* Estadísticas rápidas */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>{stats.total}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Total pedidos</p>
                    </div>
                    <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stats.pending}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Pendientes</p>
                    </div>
                </div>

                {/* Lista de serenatas recientes */}
                <PanelCard size="md">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>Tus pedidos</h2>
                        <Link href="/solicitudes" className="text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                            Ver todos
                            <IconChevronRight size={14} />
                        </Link>
                    </div>
                    
                    {items.length === 0 ? (
                        <div className="space-y-3">
                            <PanelNotice tone="neutral">
                                Aún no tienes pedidos. ¡Crea tu primera serenata!
                            </PanelNotice>
                            <Link href="/solicitar">
                                <PanelButton type="button" className="w-full">
                                    <IconPlus size={18} className="mr-2" />
                                    Solicitar serenata
                                </PanelButton>
                            </Link>
                        </div>
                    ) : (
                        <PanelList className="border-0">
                            {items.slice(0, 5).map((item, index) => (
                                <Link key={item.id} href={`/tracking/${item.id}`} className="block">
                                    <PanelListRow 
                                        divider={index > 0} 
                                        className="flex items-center gap-3 px-0 py-3"
                                    >
                                        <div 
                                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                            style={{ background: 'var(--bg-elevated)' }}
                                        >
                                            <IconMusic size={18} style={{ color: 'var(--accent)' }} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium line-clamp-1" style={{ color: 'var(--fg)' }}>
                                                {item.recipientName || item.clientName || 'Serenata'}
                                            </p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                {formatDateTime(item)}
                                            </p>
                                        </div>
                                        <PanelStatusBadge
                                            label={statusLabel(item.status)}
                                            tone={statusTone(item.status)}
                                        />
                                        <IconChevronRight size={16} style={{ color: 'var(--fg-faint)' }} />
                                    </PanelListRow>
                                </Link>
                            ))}
                        </PanelList>
                    )}
                </PanelCard>
            </SerenatasPageShell>
        );
    }

    // Vista simplificada para Músicos y Coordinadores
    return (
        <SerenatasPageShell fullWidth>
            {/* Header simplificado */}
            <div className="mb-6">
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>
                    Hola {firstName}
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                    {isCoordinator ? 'Gestiona tu cuadrilla y serenatas' : 'Encuentra serenatas disponibles'}
                </p>
            </div>

            {/* Estadísticas rápidas */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{stats.total}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Total</p>
                </div>
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{stats.pending}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Pendientes</p>
                </div>
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>{stats.confirmed}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Confirmadas</p>
                </div>
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{stats.completed}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Completadas</p>
                </div>
            </div>

            {/* Lista de serenatas */}
            <PanelCard size="md">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold" style={{ color: 'var(--fg)' }}>
                        {isCoordinator ? 'Serenatas asignadas' : 'Tus serenatas'}
                    </h2>
                    <Link href="/solicitudes" className="text-sm flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        Ver todas
                        <IconChevronRight size={14} />
                    </Link>
                </div>
                
                {items.length === 0 ? (
                    <PanelNotice tone="neutral">
                        No tienes serenatas asignadas. Revisa las solicitudes disponibles.
                    </PanelNotice>
                ) : (
                    <PanelList className="border-0">
                        {items.slice(0, 8).map((item, index) => (
                            <Link key={item.id} href={`/tracking/${item.id}`} className="block">
                                <PanelListRow 
                                    divider={index > 0} 
                                    className="flex items-center gap-3 px-0 py-3"
                                >
                                    <div 
                                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                        style={{ background: 'var(--bg-elevated)' }}
                                    >
                                        {item.status === 'pending' ? (
                                            <IconClock size={18} style={{ color: 'var(--warning)' }} />
                                        ) : item.status === 'confirmed' ? (
                                            <IconCalendar size={18} style={{ color: 'var(--success)' }} />
                                        ) : (
                                            <IconMusic size={18} style={{ color: 'var(--accent)' }} />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium line-clamp-1" style={{ color: 'var(--fg)' }}>
                                            {item.clientName}
                                        </p>
                                        <p className="text-sm flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                                            <IconMapPin size={12} />
                                            {item.city || item.location || 'Ubicación por definir'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                                            {formatPrice(item.price)}
                                        </p>
                                        <PanelStatusBadge
                                            label={statusLabel(item.status)}
                                            tone={statusTone(item.status)}
                                            className="text-xs mt-1"
                                        />
                                    </div>
                                    <IconChevronRight size={16} style={{ color: 'var(--fg-faint)' }} />
                                </PanelListRow>
                            </Link>
                        ))}
                    </PanelList>
                )}
            </PanelCard>
        </SerenatasPageShell>
    );
}
