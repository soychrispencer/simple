'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    IconUser,
    IconChevronRight,
    IconLogout,
    IconEdit,
    IconShield,
    IconMail,
    IconUsersGroup,
    IconMapPin,
    IconPhone,
    IconExternalLink,
    IconBell,
    IconMicrophone,
    IconLoader,
    IconStar,
    IconMusic,
    IconCalendar,
    IconCamera,
    IconBuilding,
    IconFileDescription,
    IconCreditCard,
    IconSettings,
    IconToggleRight,
    IconToggleLeft,
    IconTrash,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';
import { useAvailability } from '@/hooks';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';
import { 
    updateProfile, 
    getAddresses, 
    createAddress, 
    updateAddress, 
    deleteAddress,
    type Address,
    type UpdateProfileData 
} from '@/lib/api-client';

interface ProfileStats {
    rating: number;
    totalSerenatas: number;
    completedSerenatas: number;
}

// Section Card Component
function SectionCard({ 
    title, 
    children, 
    action,
    actionHref,
    onAction 
}: { 
    title: string; 
    children: React.ReactNode; 
    action?: string;
    actionHref?: string;
    onAction?: () => void;
}) {
    return (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
                <h3 className="font-semibold text-sm uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>{title}</h3>
                {action && actionHref && (
                    <Link href={actionHref} className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        {action}
                        <IconEdit size={14} />
                    </Link>
                )}
                {action && onAction && !actionHref && (
                    <button onClick={onAction} className="text-sm font-medium flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                        {action}
                        <IconEdit size={14} />
                    </button>
                )}
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

// Info Row Component
function InfoRow({ icon: Icon, label, value, fallback = 'No especificado' }: { 
    icon: any; 
    label: string; 
    value?: string | null; 
    fallback?: string;
}) {
    return (
        <div className="flex items-start gap-3 py-2">
            <Icon size={18} style={{ color: 'var(--fg-muted)', marginTop: '2px' }} />
            <div className="flex-1 min-w-0">
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{label}</p>
                <p className="font-medium truncate" style={{ color: value ? 'var(--fg)' : 'var(--fg-muted)' }}>
                    {value || fallback}
                </p>
            </div>
        </div>
    );
}

// Toggle Switch Component
function ToggleSwitch({ 
    checked, 
    onChange, 
    disabled,
    label,
    description 
}: { 
    checked: boolean; 
    onChange: () => void; 
    disabled?: boolean;
    label: string;
    description: string;
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <div>
                <p className="font-medium" style={{ color: 'var(--fg)' }}>{label}</p>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{description}</p>
            </div>
            <button
                type="button"
                disabled={disabled}
                onClick={onChange}
                className="relative h-7 w-12 rounded-full transition-colors disabled:opacity-50"
                style={{ background: checked ? 'var(--accent)' : 'var(--fg-muted)' }}
            >
                <span
                    className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full shadow transition-transform ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                    style={{ background: 'var(--surface)' }}
                />
            </button>
        </div>
    );
}

// Menu Item Component
function MenuItem({ href, icon: Icon, label, description, badge }: {
    href: string;
    icon: any;
    label: string;
    description?: string;
    badge?: string | number;
}) {
    return (
        <Link href={href} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-subtle)]" style={{ background: 'var(--bg-elevated)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--accent-subtle)' }}>
                <Icon size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium" style={{ color: 'var(--fg)' }}>{label}</p>
                    {badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent)', color: 'white' }}>
                            {badge}
                        </span>
                    )}
                </div>
                {description && <p className="text-sm truncate" style={{ color: 'var(--fg-muted)' }}>{description}</p>}
            </div>
            <IconChevronRight size={18} style={{ color: 'var(--fg-muted)' }} />
        </Link>
    );
}

export default function PerfilPage() {
    const { user, musicianProfile, coordinatorProfile, logout } = useAuth();
    const { showToast } = useToast();
    const [stats, setStats] = useState<ProfileStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Estados para edición de perfil de cliente
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    
    // Estados para direcciones del cliente
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    
    const {
        isAvailable: availGeneral,
        availableNow: availNow,
        isLoading: availLoading,
        toggleAvailability,
        toggleAvailableNow,
    } = useAvailability();

    const role = user?.role;
    // Usar solo el rol del user para determinar el tipo de cuenta
    const isMusician = role === 'musician';
    const isCoordinator = role === 'coordinator';
    const isClient = role === 'client';
    const isAdmin = role === 'admin' || role === 'superadmin';
    const hasBothRoles = isMusician && isCoordinator;

    const personaLabel = useMemo(() => {
        if (hasBothRoles) return 'Coordinador y músico';
        if (isCoordinator) return 'Coordinador';
        if (isMusician) return 'Músico';
        if (isAdmin) return 'Administrador';
        return 'Cliente';
    }, [isMusician, isCoordinator, isAdmin, hasBothRoles]);

    useEffect(() => {
        if (!isMusician) {
            setIsLoading(false);
            return;
        }

        const loadStats = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/serenatas/musicians/me/stats`, {
                    credentials: 'include',
                });
                const data = await res.json();
                if (data.ok && data.stats) setStats(data.stats);
            } catch {
                showToast('Error al cargar estadísticas', 'error');
            } finally {
                setIsLoading(false);
            }
        };
        void loadStats();
    }, [isMusician, showToast]);

    // Cargar direcciones del cliente
    useEffect(() => {
        if (isClient) {
            loadAddresses();
        }
    }, [isClient]);

    const loadAddresses = async () => {
        setIsLoadingAddresses(true);
        try {
            const data = await getAddresses();
            setAddresses(data);
        } catch (error) {
            console.error('Error loading addresses:', error);
        } finally {
            setIsLoadingAddresses(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!editName.trim()) {
            showToast('El nombre es obligatorio', 'error');
            return;
        }
        setIsSavingProfile(true);
        try {
            await updateProfile({ name: editName, phone: editPhone });
            showToast('Perfil actualizado correctamente', 'success');
            setIsEditingProfile(false);
            window.location.reload();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Error al actualizar perfil', 'error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta dirección?')) return;
        try {
            await deleteAddress(addressId);
            showToast('Dirección eliminada', 'success');
            loadAddresses();
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Error al eliminar dirección', 'error');
        }
    };

    if (isLoading || !user) {
        return (
            <SerenatasPageShell fullWidth>
                <div className="flex items-center justify-center h-64">
                    <IconLoader className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
                </div>
            </SerenatasPageShell>
        );
    }

    return (
        <SerenatasPageShell fullWidth>
            <SerenatasPageHeader
                title="Mi perfil"
                description={`${personaLabel} · ${user.email}`}
            />

            {/* Profile Header Card */}
            <div className="mb-6">
                <div 
                    className="p-6 rounded-2xl"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                    <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--accent-subtle)' }}
                            >
                                {user.avatarUrl ? (
                                    <img 
                                        src={user.avatarUrl} 
                                        alt={user.name} 
                                        className="w-full h-full rounded-full object-cover" 
                                    />
                                ) : (
                                    <IconUser size={40} style={{ color: 'var(--accent)' }} />
                                )}
                            </div>
                            {isMusician && (
                                <Link 
                                    href="/musician/edit?section=avatar" 
                                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                                    style={{ background: 'var(--accent)' }}
                                >
                                    <IconCamera size={16} color="white" />
                                </Link>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                                {user.name || 'Usuario'}
                            </h2>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                {personaLabel}
                            </p>
                            <p className="text-sm truncate" style={{ color: 'var(--fg-muted)' }}>
                                {user.email}
                            </p>

                            {isMusician && (
                                <div
                                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mt-2"
                                    style={{
                                        background: musicianProfile?.isAvailable
                                            ? 'color-mix(in oklab, var(--success) 15%, transparent)'
                                            : 'var(--bg-muted)',
                                        color: musicianProfile?.isAvailable ? 'var(--success)' : 'var(--fg-muted)',
                                    }}
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: musicianProfile?.isAvailable ? 'var(--success)' : 'var(--fg-muted)' }}
                                    />
                                    {musicianProfile?.isAvailable ? 'Disponible' : 'No disponible'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats - Músicos */}
            {isMusician && stats && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <IconStar size={20} className="mx-auto mb-1" style={{ color: 'var(--accent)' }} />
                        <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{stats.rating ?? 0}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Calificación</p>
                    </div>
                    <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <IconMusic size={20} className="mx-auto mb-1" style={{ color: 'var(--success)' }} />
                        <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{stats.completedSerenatas ?? 0}</p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Completadas</p>
                    </div>
                    <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                        <IconCalendar size={20} className="mx-auto mb-1" style={{ color: 'var(--warning)' }} />
                        <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>
                            {Math.max(0, (stats.totalSerenatas ?? 0) - (stats.completedSerenatas ?? 0))}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>En curso</p>
                    </div>
                </div>
            )}

            {/* Músico sin perfil completo */}
            {isMusician && !musicianProfile && (
                <div className="mb-6">
                    <div 
                        className="p-4 rounded-2xl"
                        style={{ background: 'var(--warning-subtle)', border: '1px solid var(--warning)' }}
                    >
                        <p className="font-medium mb-2" style={{ color: 'var(--warning)' }}>
                            Completa tu perfil de músico
                        </p>
                        <p className="text-sm mb-3" style={{ color: 'var(--fg)' }}>
                            Añade tu instrumento, experiencia, ubicación y biografía para aparecer en las búsquedas de coordinadores.
                        </p>
                        <Link href="/musician/edit">
                            <div 
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
                                style={{ background: 'var(--accent)', color: 'white' }}
                            >
                                <IconEdit size={16} />
                                Completar perfil
                            </div>
                        </Link>
                    </div>
                </div>
            )}


            {/* Información Personal - Músicos */}
            {isMusician && musicianProfile && (
                <div className="space-y-4 mb-6">
                    <SectionCard title="Información personal" action="Editar" actionHref="/perfil/configuracion/perfil">
                        <div className="space-y-1">
                            <InfoRow 
                                icon={IconUser} 
                                label="Nombre completo" 
                                value={user.name} 
                            />
                            <InfoRow 
                                icon={IconMicrophone} 
                                label="Instrumento" 
                                value={musicianProfile.instrument} 
                            />
                            <InfoRow 
                                icon={IconStar} 
                                label="Años de experiencia" 
                                value={musicianProfile.experienceYears != null ? `${musicianProfile.experienceYears} años` : null} 
                            />
                            <InfoRow 
                                icon={IconPhone} 
                                label="Teléfono" 
                                value={musicianProfile.phone} 
                            />
                        </div>
                    </SectionCard>

                    {/* Ubicación */}
                    <SectionCard title="Ubicación" action="Editar" actionHref="/perfil/configuracion/perfil">
                        <div className="space-y-1">
                            <InfoRow 
                                icon={IconMapPin} 
                                label="Comuna" 
                                value={musicianProfile.comuna} 
                            />
                            <InfoRow 
                                icon={IconBuilding} 
                                label="Región" 
                                value={musicianProfile.region} 
                            />
                            {(musicianProfile as any).address && (
                                <InfoRow 
                                    icon={IconMapPin} 
                                    label="Dirección" 
                                    value={(musicianProfile as any).address} 
                                />
                            )}
                        </div>
                    </SectionCard>

                    {/* Biografía */}
                    <SectionCard title="Biografía" action="Editar" actionHref="/perfil/configuracion/perfil">
                        {musicianProfile.bio ? (
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--fg)' }}>
                                {musicianProfile.bio}
                            </p>
                        ) : (
                            <p className="text-sm italic" style={{ color: 'var(--fg-muted)' }}>
                                Aún no has añadido una biografía. Edita tu perfil para contar tu historia como músico.
                            </p>
                        )}
                    </SectionCard>

                    {/* Disponibilidad */}
                    <SectionCard title="Disponibilidad">
                        <div className="space-y-3">
                            <ToggleSwitch
                                checked={availGeneral}
                                onChange={() => void toggleAvailability()}
                                disabled={availLoading}
                                label="Disponible para serenatas"
                                description="Aparecer en búsquedas de coordinadores"
                            />
                            <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                            <ToggleSwitch
                                checked={availNow}
                                onChange={() => void toggleAvailableNow()}
                                disabled={availLoading || !availGeneral}
                                label="Disponible ahora"
                                description="Para encargos urgentes de último momento"
                            />
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* Suscripción - Coordinadores */}
            {isCoordinator && (
                <div className="space-y-4 mb-6">
                    <SectionCard title="Suscripción" action="Gestionar" actionHref="/coordinator/subscription">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ background: 'var(--accent-subtle)' }}
                            >
                                <IconCreditCard size={24} style={{ color: 'var(--accent)' }} />
                            </div>
                            <div>
                                <p className="font-semibold" style={{ color: 'var(--fg)' }}>
                                    Plan {coordinatorProfile?.subscriptionPlan?.toUpperCase() || 'FREE'}
                                </p>
                                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    {coordinatorProfile?.subscriptionPlan === 'premium' 
                                        ? 'Todas las funciones habilitadas'
                                        : 'Actualiza para más funciones'
                                    }
                                </p>
                            </div>
                        </div>
                    </SectionCard>
                </div>
            )}

            {/* Upgrade a Coordinador - Solo músicos sin coordinación */}
            {!isCoordinator && isMusician && (
                <div className="mb-6">
                    <Link href="/onboarding/coordinator">
                        <div 
                            className="flex items-center gap-4 p-4 rounded-xl"
                            style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent)' }}
                        >
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                                <IconUsersGroup size={24} color="white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold" style={{ color: 'var(--accent)' }}>Conviértete en coordinador</p>
                                <p className="text-sm" style={{ color: 'var(--accent)', opacity: 0.8 }}>
                                    Forma cuadrillas y recibe leads · 3 meses gratis
                                </p>
                            </div>
                            <IconChevronRight size={20} style={{ color: 'var(--accent)' }} />
                        </div>
                    </Link>
                </div>
            )}

            {/* Menú de acciones - Músicos */}
            {isMusician && (
                <div className="space-y-4 mb-6">
                    <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>Acciones rápidas</h3>
                    <div className="space-y-2">
                        <MenuItem 
                            href="/perfil/configuracion/perfil" 
                            icon={IconEdit} 
                            label="Editar perfil" 
                            description="Nombre, instrumento, biografía, fotos..."
                        />
                        {musicianProfile?.id && (
                            <MenuItem 
                                href={`/musician/${musicianProfile.id}`} 
                                icon={IconExternalLink} 
                                label="Ver perfil público" 
                                description="Cómo te ven los coordinadores"
                            />
                        )}
                        <MenuItem 
                            href="/invitaciones" 
                            icon={IconBell} 
                            label="Invitaciones" 
                            description="Acepta o rechaza llamados de coordinadores"
                        />
                        <MenuItem 
                            href="/perfil/configuracion/disponibilidad"
                            icon={IconCalendar}
                            label="Disponibilidad"
                            description="Define horarios y días en que puedes tocar"
                        />
                    </div>
                </div>
            )}

            {/* Sección de Cliente - Editar perfil y direcciones */}
            {isClient && (
                <div className="space-y-6 mb-6">
                    {/* Información Personal */}
                    <SectionCard 
                        title="Información personal" 
                        action={isEditingProfile ? undefined : 'Editar'}
                        onAction={() => {
                            setEditName(user?.name || '');
                            setEditPhone(user?.phone || '');
                            setIsEditingProfile(true);
                        }}
                    >
                        {isEditingProfile ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border"
                                        style={{ 
                                            background: 'var(--bg)', 
                                            borderColor: 'var(--border)',
                                            color: 'var(--fg)'
                                        }}
                                        placeholder="Tu nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border"
                                        style={{ 
                                            background: 'var(--bg)', 
                                            borderColor: 'var(--border)',
                                            color: 'var(--fg)'
                                        }}
                                        placeholder="+56 9 1234 5678"
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setIsEditingProfile(false)}
                                        className="flex-1 px-4 py-2 rounded-xl font-medium"
                                        style={{ background: 'var(--bg-muted)', color: 'var(--fg)' }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={isSavingProfile}
                                        className="flex-1 px-4 py-2 rounded-xl font-medium"
                                        style={{ 
                                            background: 'var(--accent)', 
                                            color: 'white',
                                            opacity: isSavingProfile ? 0.7 : 1
                                        }}
                                    >
                                        {isSavingProfile ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <InfoRow icon={IconUser} label="Nombre" value={user?.name || 'No especificado'} />
                                <InfoRow icon={IconMail} label="Email" value={user?.email || ''} />
                                <InfoRow icon={IconPhone} label="Teléfono" value={user?.phone || 'No especificado'} />
                            </div>
                        )}
                    </SectionCard>

                    {/* Mis Direcciones */}
                    <SectionCard 
                        title="Mis direcciones"
                        action={showAddressForm ? undefined : addresses.length > 0 ? undefined : 'Agregar'}
                        onAction={() => {
                            setEditingAddress(null);
                            setShowAddressForm(true);
                        }}
                    >
                        {isLoadingAddresses ? (
                            <div className="flex items-center justify-center py-8">
                                <IconLoader className="animate-spin" size={24} style={{ color: 'var(--accent)' }} />
                            </div>
                        ) : addresses.length === 0 && !showAddressForm ? (
                            <div className="text-center py-6">
                                <IconMapPin size={40} className="mx-auto mb-3" style={{ color: 'var(--fg-muted)' }} />
                                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                    No tienes direcciones guardadas
                                </p>
                                <button
                                    onClick={() => setShowAddressForm(true)}
                                    className="mt-3 px-4 py-2 rounded-xl text-sm font-medium"
                                    style={{ background: 'var(--accent)', color: 'white' }}
                                >
                                    Agregar dirección
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {addresses.map((address) => (
                                    <div 
                                        key={address.id}
                                        className="p-3 rounded-xl border"
                                        style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium" style={{ color: 'var(--fg)' }}>
                                                        {address.label || 'Dirección'}
                                                    </p>
                                                    {address.isDefault && (
                                                        <span 
                                                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                                            style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                                                        >
                                                            Principal
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                    {address.addressLine1}
                                                    {address.addressLine2 && `, ${address.addressLine2}`}
                                                </p>
                                                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                                    {address.communeName}, {address.regionName}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingAddress(address);
                                                        setShowAddressForm(true);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-[var(--bg-subtle)]"
                                                    style={{ color: 'var(--fg-muted)' }}
                                                >
                                                    <IconEdit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAddress(address.id)}
                                                    className="p-2 rounded-lg hover:bg-[var(--error-subtle)]"
                                                    style={{ color: 'var(--error)' }}
                                                >
                                                    <IconTrash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {!showAddressForm && (
                                    <button
                                        onClick={() => {
                                            setEditingAddress(null);
                                            setShowAddressForm(true);
                                        }}
                                        className="w-full py-3 rounded-xl border-2 border-dashed text-sm font-medium"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        + Agregar otra dirección
                                    </button>
                                )}
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}

            {/* Seguridad - Todos */}
            <div className="space-y-4 mb-6">
                <SectionCard title="Seguridad">
                    <Link href="/auth/recuperar" className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors">
                        <div className="flex items-center gap-3">
                            <IconShield size={18} style={{ color: 'var(--fg-muted)' }} />
                            <span className="font-medium" style={{ color: 'var(--fg)' }}>Cambiar contraseña</span>
                        </div>
                        <IconChevronRight size={18} style={{ color: 'var(--fg-muted)' }} />
                    </Link>
                </SectionCard>
            </div>

            {/* Cerrar sesión */}
            <button
                type="button"
                onClick={() => void logout()}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl font-medium transition-colors mb-4"
                style={{
                    background: 'color-mix(in oklab, var(--error) 10%, transparent)',
                    color: 'var(--error)',
                }}
            >
                <IconLogout size={20} />
                Cerrar sesión
            </button>

            <p className="text-center text-xs" style={{ color: 'var(--fg-muted)' }}>
                SimpleSerenatas v1.0.0
            </p>
        </SerenatasPageShell>
    );
}
