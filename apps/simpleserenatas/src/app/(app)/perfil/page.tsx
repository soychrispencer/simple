'use client';

import { useState, useEffect } from 'react';
import { 
    IconUser, 
    IconMapPin,
    IconStar,
    IconSettings,
    IconChevronRight,
    IconLogout,
    IconEdit,
    IconMusic,
    IconBriefcase,
    IconClock,
    IconBell,
    IconShield,
    IconHelpCircle,
    IconPalette
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';
import { useTheme } from 'next-themes';

interface ProfileStats {
    rating: number;
    totalSerenatas: number;
    completedSerenatas: number;
}

const menuItems = [
    { icon: IconUser, label: 'Editar Perfil', href: '/musician/edit' },
    { icon: IconMusic, label: 'Mi Instrumento', href: '/musician/edit' },
    { icon: IconMapPin, label: 'Mi Ubicación', href: '/musician/edit' },
    { icon: IconClock, label: 'Disponibilidad', href: '/musician/edit' },
    { icon: IconBriefcase, label: 'Historial de Trabajo', href: '/agenda' },
    { icon: IconStar, label: 'Mis Calificaciones', href: '/perfil' },
    { icon: IconBell, label: 'Notificaciones', href: '/notificaciones' },
    { icon: IconSettings, label: 'Configuración', href: '/perfil' },
    { icon: IconHelpCircle, label: 'Ayuda y Soporte', href: '/perfil' },
];

export default function PerfilPage() {
    const { user, musicianProfile, logout } = useAuth();
    const { showToast } = useToast();
    const { theme, setTheme } = useTheme();
    const [stats, setStats] = useState<ProfileStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/stats`, {
                    credentials: 'include',
                });
                const data = await res.json();
                
                if (data.ok && data.stats) {
                    setStats(data.stats);
                }
            } catch {
                showToast('Error al cargar estadísticas', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadStats();
    }, [showToast]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    if (isLoading || !user) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Mi Perfil</h1>
                        <p style={{ color: 'var(--fg-muted)' }}>Gestiona tu información y preferencias</p>
                    </div>
                    <Link
                        href="/musician/edit"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--fg)' }}
                    >
                        <IconEdit size={18} />
                        Editar Perfil
                    </Link>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Profile Card */}
                    <div className="lg:col-span-1">
                        <div className="card sticky top-20">
                            <div className="flex flex-col items-center text-center">
                                <div 
                                    className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
                                    style={{ background: 'var(--accent-subtle)' }}
                                >
                                    {user?.avatarUrl ? (
                                        <img 
                                            src={user.avatarUrl} 
                                            alt={user.name}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <IconUser size={48} style={{ color: 'var(--accent)' }} />
                                    )}
                                </div>
                                
                                <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                                    {user?.name || 'Usuario'}
                                </h2>
                                <p className="capitalize" style={{ color: 'var(--fg-muted)' }}>
                                    {musicianProfile?.instrument || 'Músico'} · {musicianProfile?.experienceYears || 0} años exp.
                                </p>

                                {/* Availability Badge */}
                                <div 
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mt-3"
                                    style={{
                                        background: musicianProfile?.isAvailable 
                                            ? 'color-mix(in oklab, var(--success) 15%, transparent)'
                                            : 'var(--bg-muted)',
                                        color: musicianProfile?.isAvailable ? 'var(--success)' : 'var(--fg-muted)'
                                    }}
                                >
                                    <span 
                                        className="w-2 h-2 rounded-full"
                                        style={{ 
                                            background: musicianProfile?.isAvailable ? 'var(--success)' : 'var(--fg-muted)'
                                        }} 
                                    />
                                    {musicianProfile?.isAvailable ? 'Disponible' : 'No disponible'}
                                </div>

                                <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>
                                    {musicianProfile?.comuna || 'Sin ubicación'}
                                </p>
                            </div>

                            {/* Stats */}
                            <div 
                                className="grid grid-cols-3 gap-4 mt-6 pt-6"
                                style={{ borderTop: '1px solid var(--border)' }}
                            >
                                <div className="text-center">
                                    <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                                        {stats?.rating || musicianProfile?.rating || 0}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Calificación</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                                        {stats?.completedSerenatas || 0}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Completadas</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>
                                        {(stats?.totalSerenatas || 0) - (stats?.completedSerenatas || 0)}
                                    </p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Pendientes</p>
                                </div>
                            </div>
                        </div>

                        {/* Theme Toggle - Desktop */}
                        <div className="card mt-4 hidden lg:block">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'var(--bg-subtle)' }}
                                    >
                                        <IconPalette size={20} style={{ color: 'var(--fg)' }} />
                                    </div>
                                    <span className="font-medium" style={{ color: 'var(--fg)' }}>Tema</span>
                                </div>
                                <div 
                                    className="flex rounded-lg p-1"
                                    style={{ background: 'var(--bg-subtle)' }}
                                >
                                    <button
                                        onClick={() => setTheme('light')}
                                        className="px-3 py-1 rounded-md text-sm font-medium transition-all"
                                        style={{
                                            background: theme === 'light' ? 'var(--surface)' : 'transparent',
                                            color: theme === 'light' ? 'var(--fg)' : 'var(--fg-muted)',
                                            boxShadow: theme === 'light' ? 'var(--shadow-sm)' : 'none'
                                        }}
                                    >
                                        Claro
                                    </button>
                                    <button
                                        onClick={() => setTheme('dark')}
                                        className="px-3 py-1 rounded-md text-sm font-medium transition-all"
                                        style={{
                                            background: theme === 'dark' ? 'var(--surface)' : 'transparent',
                                            color: theme === 'dark' ? 'var(--fg)' : 'var(--fg-muted)',
                                            boxShadow: theme === 'dark' ? 'var(--shadow-sm)' : 'none'
                                        }}
                                    >
                                        Oscuro
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Menu */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Quick Actions */}
                        <div className="card">
                            <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>Acciones Rápidas</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <QuickAction 
                                    icon={IconClock}
                                    label="Disponibilidad"
                                    href="/musician/edit"
                                />
                                <QuickAction 
                                    icon={IconMapPin}
                                    label="Ubicación"
                                    href="/musician/edit"
                                />
                                <QuickAction 
                                    icon={IconMusic}
                                    label="Instrumento"
                                    href="/musician/edit"
                                />
                                <QuickAction 
                                    icon={IconBriefcase}
                                    label="Agenda"
                                    href="/agenda"
                                />
                            </div>
                        </div>

                        {/* Menu Items */}
                        <div className="card" style={{ padding: 0 }}>
                            {menuItems.map((item, index) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className="flex items-center justify-between p-4 hover:bg-[var(--bg-subtle)] transition-colors"
                                        style={{
                                            borderBottom: index !== menuItems.length - 1 ? '1px solid var(--border)' : 'none'
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                style={{ background: 'var(--bg-subtle)' }}
                                            >
                                                <Icon size={20} style={{ color: 'var(--fg-secondary)' }} />
                                            </div>
                                            <span className="font-medium" style={{ color: 'var(--fg)' }}>{item.label}</span>
                                        </div>
                                        <IconChevronRight size={20} style={{ color: 'var(--fg-muted)' }} />
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Security */}
                        <div className="card">
                            <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>Seguridad</h3>
                            <div className="space-y-3">
                                <button 
                                    className="w-full flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
                                    style={{ border: '1px solid var(--border)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ background: 'var(--bg-subtle)' }}
                                        >
                                            <IconShield size={20} style={{ color: 'var(--fg-secondary)' }} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium" style={{ color: 'var(--fg)' }}>Cambiar Contraseña</p>
                                            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Actualiza tu contraseña</p>
                                        </div>
                                    </div>
                                    <IconChevronRight size={20} style={{ color: 'var(--fg-muted)' }} />
                                </button>
                            </div>
                        </div>

                        {/* Logout */}
                        <button 
                            onClick={() => logout()}
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl font-medium transition-colors"
                            style={{ 
                                background: 'color-mix(in oklab, var(--error) 10%, transparent)',
                                color: 'var(--error)'
                            }}
                        >
                            <IconLogout size={20} />
                            Cerrar Sesión
                        </button>

                        {/* Version */}
                        <p className="text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
                            SimpleSerenatas v1.0.0
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function QuickAction({ icon: Icon, label, href }: { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; label: string; href: string }) {
    return (
        <Link
            href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ border: '1px solid var(--border)' }}
        >
            <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--accent-subtle)' }}
            >
                <Icon size={24} style={{ color: 'var(--accent)' }} />
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{label}</span>
        </Link>
    );
}
