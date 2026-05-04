'use client';

import { useState, useEffect } from 'react';
import {
    IconUsers,
    IconPlus,
    IconCalendar,
    IconCheck,
    IconClock,
    IconConfetti,
    IconSearch,
    IconSend,
    IconTrendingUp,
    IconInfoCircle,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

interface Group {
    id: string;
    name: string;
    date: string;
    status: string;
    coordinatorName?: string;
    members: number;
    serenatas: number;
    totalEarnings: number;
}

interface Musician {
    id: string;
    name: string;
    instrument: string;
    /** km desde tu ubicación; `null` si no hay punto de referencia en tu perfil / query. */
    distance: number | null;
}

interface AvailableMusiciansMeta {
    hasOrigin: boolean;
    radiusKm: number;
}

interface CrewMembership {
    crewMembershipId: string;
    /** Alias retrocompatible. */
    profileId?: string;
    membershipStatus: 'active' | 'invited' | 'requested' | 'declined' | 'removed';
    membershipInitiator: 'coordinator' | 'musician' | null;
    membershipInvitedAt: string | null;
    coordinatorProfileId: string | null;
    city: string | null;
    rating: string | null;
    coordinatorName: string | null;
}

function normalizeCrewMembershipsFromApi(raw: unknown[]): CrewMembership[] {
    if (!Array.isArray(raw)) return [];
    return raw.map((row) => {
        const item = row as CrewMembership & { profileId?: string };
        const pid = typeof item.profileId === 'string' ? item.profileId : '';
        const cid =
            typeof item.crewMembershipId === 'string' ? item.crewMembershipId : pid;
        return { ...item, crewMembershipId: cid || pid, profileId: pid || cid };
    });
}

export default function GruposPage() {
    const { musicianProfile, effectiveRole } = useAuth();
    const { showToast } = useToast();
    const [myGroups, setMyGroups] = useState<Group[]>([]);
    const [availableMusicians, setAvailableMusicians] = useState<Musician[]>([]);
    const [musiciansMeta, setMusiciansMeta] = useState<AvailableMusiciansMeta | null>(null);
    const [memberships, setMemberships] = useState<CrewMembership[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDate, setNewGroupDate] = useState('');

    const isMusician = effectiveRole === 'musician' || !!musicianProfile;

    const profileLocationHref =
        effectiveRole === 'musician' || !!musicianProfile
            ? '/musician/edit?section=location'
            : '/perfil';

    useEffect(() => {
        const loadData = async () => {
            try {
                const requests: Promise<Response>[] = [
                    fetch(`${API_BASE}/api/serenatas/groups/my`, { credentials: 'include' }),
                    fetch(`${API_BASE}/api/serenatas/musicians/available?radius=10`, { credentials: 'include' }),
                ];
                if (isMusician) {
                    requests.push(
                        fetch(`${API_BASE}/api/serenatas/musicians/me/coordinators`, {
                            credentials: 'include',
                        })
                    );
                }
                const responses = await Promise.all(requests);
                const groupsData = await responses[0].json().catch(() => ({}));
                const musiciansData = await responses[1].json().catch(() => ({}));
                const membershipsData = responses[2]
                    ? await responses[2].json().catch(() => ({}))
                    : null;

                if (groupsData.ok && groupsData.groups) {
                    setMyGroups(groupsData.groups);
                }
                if (musiciansData.ok && Array.isArray(musiciansData.musicians)) {
                    setAvailableMusicians(musiciansData.musicians);
                    const rawMeta = musiciansData.meta as AvailableMusiciansMeta | undefined;
                    if (
                        rawMeta &&
                        typeof rawMeta.hasOrigin === 'boolean' &&
                        typeof rawMeta.radiusKm === 'number'
                    ) {
                        setMusiciansMeta(rawMeta);
                    } else {
                        const list = musiciansData.musicians as Musician[];
                        const inferredNoOrigin = list.some((m) => m.distance == null);
                        setMusiciansMeta(
                            inferredNoOrigin
                                ? { hasOrigin: false, radiusKm: 10 }
                                : { hasOrigin: true, radiusKm: 10 }
                        );
                    }
                }
                if (membershipsData?.ok && Array.isArray(membershipsData.memberships)) {
                    setMemberships(
                        normalizeCrewMembershipsFromApi(membershipsData.memberships)
                    );
                }
            } catch {
                showToast('Error al cargar datos', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [showToast, isMusician]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CL', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
        });
    };

    const handleCreateGroup = async () => {
        if (!newGroupName || !newGroupDate) return;

        try {
            const res = await fetch(`${API_BASE}/api/serenatas/groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newGroupName, date: newGroupDate }),
            });

            const data = await res.json();
            if (data.ok && data.group) {
                setMyGroups([...myGroups, data.group]);
                setShowCreateModal(false);
                setNewGroupName('');
                setNewGroupDate('');
                showToast('Grupo creado exitosamente', 'success');
            } else {
                showToast(data.error || 'Error al crear grupo', 'error');
            }
        } catch {
            showToast('Error de conexión', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <>
        <SerenatasPageShell width="wide">
            <SerenatasPageHeader
                title="Mis grupos"
                description={`${myGroups.length} grupos activos`}
                trailing={
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="serenatas-interactive flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors"
                        style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
                    >
                        <IconPlus size={20} />
                        Crear grupo
                    </button>
                }
            />

            {isMusician && (
                <SearchCoordinatorPanel
                    onRequestSent={async () => {
                        try {
                            const res = await fetch(
                                `${API_BASE}/api/serenatas/musicians/me/coordinators`,
                                { credentials: 'include' }
                            );
                            const data = await res.json().catch(() => ({}));
                            if (data?.ok && Array.isArray(data.memberships)) {
                                setMemberships(normalizeCrewMembershipsFromApi(data.memberships));
                            }
                        } catch (err) {
                            console.error('refresh memberships failed', err);
                        }
                    }}
                />
            )}

            {isMusician && memberships.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--fg)' }}>
                        Mis cuadrillas
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {memberships.map((m) => (
                            <div key={m.crewMembershipId} className="card">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="font-semibold truncate" style={{ color: 'var(--fg)' }}>
                                            {m.coordinatorName ?? 'Coordinador'}
                                        </h3>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            {m.city ?? '—'}
                                            {m.rating ? ` · ⭐ ${m.rating}` : ''}
                                        </p>
                                    </div>
                                    <span
                                        className="text-xs font-medium px-2 py-1 rounded whitespace-nowrap"
                                        style={
                                            m.membershipStatus === 'active'
                                                ? {
                                                      background: 'var(--success)',
                                                      color: 'var(--accent-contrast)',
                                                  }
                                                : m.membershipStatus === 'invited'
                                                ? {
                                                      background: 'var(--accent-soft)',
                                                      color: 'var(--accent)',
                                                  }
                                                : m.membershipStatus === 'requested'
                                                ? {
                                                      background: 'var(--bg-subtle)',
                                                      color: 'var(--fg-muted)',
                                                  }
                                                : {
                                                      background: 'var(--bg-subtle)',
                                                      color: 'var(--fg-muted)',
                                                  }
                                        }
                                    >
                                        {m.membershipStatus === 'active'
                                            ? 'Activa'
                                            : m.membershipStatus === 'invited'
                                            ? 'Invitación pendiente'
                                            : m.membershipStatus === 'requested'
                                            ? 'Solicitud enviada'
                                            : m.membershipStatus === 'declined'
                                            ? 'Rechazada'
                                            : 'Removido'}
                                    </span>
                                </div>
                                {(m.membershipStatus === 'invited' ||
                                    m.membershipStatus === 'requested') && (
                                    <div className="mt-3">
                                        <Link
                                            href="/invitaciones"
                                            className="text-sm font-medium"
                                            style={{ color: 'var(--accent)' }}
                                        >
                                            Ir a invitaciones →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* My Groups */}
                <div className="lg:col-span-2 space-y-6">
                    {myGroups.length === 0 ? (
                        <div 
                            className="rounded-2xl p-8 text-center"
                            style={{ background: 'var(--bg-subtle)' }}
                        >
                            <IconUsers size={48} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                            <p style={{ color: 'var(--fg-muted)' }}>No tienes grupos activos</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                Crea un grupo para organizar serenatas
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {myGroups.map((group) => (
                                <Link
                                    key={group.id}
                                    href={`/grupo/${group.id}`}
                                    className="card card-hover block"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>{group.name}</h3>
                                            <div className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
                                                <IconCalendar size={14} />
                                                <span>{formatDate(group.date)}</span>
                                            </div>
                                        </div>
                                        <StatusBadge status={group.status} />
                                    </div>

                                    <div className="flex items-center gap-4 text-sm mb-4">
                                        <div className="flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                                            <IconUsers size={16} />
                                            <span>{group.members} músicos</span>
                                        </div>
                                        <div className="flex items-center gap-1" style={{ color: 'var(--fg-muted)' }}>
                                            <IconConfetti size={16} />
                                            <span>{group.serenatas} serenatas</span>
                                        </div>
                                    </div>

                                    <div 
                                        className="pt-3 border-t flex items-center justify-between"
                                        style={{ borderColor: 'var(--border)' }}
                                    >
                                        <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                                            Coordinador: {group.coordinatorName || 'Sin asignar'}
                                        </span>
                                        <span className="font-semibold" style={{ color: 'var(--accent)' }}>
                                            {formatCurrency(group.totalEarnings)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="card">
                        <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>Resumen</h3>
                        <div className="space-y-4">
                            <div 
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{ background: 'var(--bg-subtle)' }}
                            >
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'var(--accent-subtle)' }}
                                >
                                    <IconUsers size={20} style={{ color: 'var(--accent)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Total grupos</p>
                                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>{myGroups.length}</p>
                                </div>
                            </div>
                            <div 
                                className="flex items-center gap-3 p-3 rounded-xl"
                                style={{ background: 'var(--bg-subtle)' }}
                            >
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'color-mix(in oklab, var(--success) 15%, transparent)' }}
                                >
                                    <IconTrendingUp size={20} style={{ color: 'var(--success)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Ganancias totales</p>
                                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>
                                        {formatCurrency(myGroups.reduce((sum, g) => sum + g.totalEarnings, 0))}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Available Musicians */}
                    <div className="card">
                        <div className="flex items-center justify-between mb-4 gap-2">
                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>
                                {musiciansMeta?.hasOrigin === false ? 'Músicos disponibles' : 'Músicos cerca'}
                            </h3>
                            <span
                                className="text-xs px-2 py-1 rounded-full shrink-0"
                                style={{ background: 'var(--bg-subtle)', color: 'var(--fg-muted)' }}
                            >
                                {musiciansMeta?.hasOrigin === false
                                    ? 'Sugeridos'
                                    : `${musiciansMeta?.radiusKm ?? 10} km`}
                            </span>
                        </div>

                        {musiciansMeta?.hasOrigin === false && (
                            <div
                                className="mb-4 flex gap-3 rounded-xl border p-3 text-sm"
                                style={{
                                    borderColor: 'var(--border)',
                                    background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
                                    color: 'var(--fg-secondary)',
                                }}
                            >
                                <IconInfoCircle
                                    size={20}
                                    className="shrink-0 mt-0.5"
                                    style={{ color: 'var(--accent)' }}
                                />
                                <div className="min-w-0 space-y-2">
                                    <p>
                                        Sin ubicación de referencia no podemos calcular distancias. Añade coordenadas en tu
                                        perfil para ver “cerca” según radio.
                                    </p>
                                    <Link
                                        href={profileLocationHref}
                                        className="inline-flex font-medium"
                                        style={{ color: 'var(--accent)' }}
                                    >
                                        Configurar ubicación →
                                    </Link>
                                </div>
                            </div>
                        )}

                        {availableMusicians.length === 0 ? (
                            <p className="text-sm text-center py-4" style={{ color: 'var(--fg-muted)' }}>
                                {musiciansMeta?.hasOrigin === false
                                    ? 'No hay músicos disponibles por ahora'
                                    : 'No hay músicos disponibles en este radio'}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {availableMusicians.slice(0, 5).map((musician) => (
                                    <div
                                        key={musician.id}
                                        className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: 'var(--bg-subtle)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                                style={{ background: 'var(--accent-subtle)' }}
                                            >
                                                <IconConfetti size={18} style={{ color: 'var(--accent)' }} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{musician.name}</p>
                                                <p className="text-xs capitalize" style={{ color: 'var(--fg-muted)' }}>{musician.instrument}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                            {musician.distance != null ? `${musician.distance} km` : '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </SerenatasPageShell>

            {/* Create Group Modal */}
            {showCreateModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
                    style={{ background: 'color-mix(in oklab, var(--fg) 35%, transparent)' }}
                >
                    <div 
                        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                        style={{ background: 'var(--surface)' }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Crear Nuevo Grupo</h2>
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-full transition-colors hover:bg-[var(--bg-subtle)]"
                                style={{ color: 'var(--fg-muted)' }}
                            >
                                <IconX size={24} />
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateGroup(); }}>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                                    Nombre del grupo
                                </label>
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder="Ej: Mariachi Domingo AM"
                                    className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2"
                                    style={{ 
                                        borderColor: 'var(--border)', 
                                        background: 'var(--bg-subtle)',
                                        color: 'var(--fg)'
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--fg)' }}>
                                    Fecha
                                </label>
                                <input
                                    type="date"
                                    value={newGroupDate}
                                    onChange={(e) => setNewGroupDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border outline-none transition-all focus:ring-2"
                                    style={{ 
                                        borderColor: 'var(--border)', 
                                        background: 'var(--bg-subtle)',
                                        color: 'var(--fg)'
                                    }}
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={!newGroupName || !newGroupDate}
                                    className="w-full py-3 rounded-xl font-medium transition-all disabled:opacity-50"
                                    style={{ 
                                        background: 'var(--accent)', 
                                        color: 'var(--accent-contrast)'
                                    }}
                                >
                                    Crear Grupo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

function StatusBadge({ status }: { status: string }) {
    const isConfirmed = status === 'confirmed';
    return (
        <span 
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
                background: isConfirmed 
                    ? 'color-mix(in oklab, var(--success) 15%, transparent)'
                    : 'color-mix(in oklab, var(--warning) 15%, transparent)',
                color: isConfirmed ? 'var(--success)' : 'var(--warning)'
            }}
        >
            {isConfirmed ? <IconCheck size={12} /> : <IconClock size={12} />}
            {isConfirmed ? 'Confirmado' : 'Formando...'}
        </span>
    );
}

function IconX({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    );
}

interface SearchedCoordinator {
    id: string;
    name: string | null;
    email: string | null;
    city: string | null;
    region: string | null;
    rating: string | null;
    totalSerenatas: number;
    isVerified: boolean;
}

function SearchCoordinatorPanel({ onRequestSent }: { onRequestSent: () => Promise<void> }) {
    const { showToast } = useToast();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchedCoordinator[]>([]);
    const [searching, setSearching] = useState(false);
    const [requestingId, setRequestingId] = useState<string | null>(null);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setResults([]);
            return;
        }
        const handle = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(
                    `${API_BASE}/api/serenatas/coordinators/search?q=${encodeURIComponent(q)}`,
                    { credentials: 'include' }
                );
                const data = await res.json().catch(() => ({}));
                if (data?.ok && Array.isArray(data.coordinators)) {
                    setResults(data.coordinators);
                }
            } catch (err) {
                console.error('search failed', err);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(handle);
    }, [query]);

    const handleRequest = async (coord: SearchedCoordinator) => {
        const message = window.prompt(
            `Mensaje para ${coord.name ?? 'el coordinador'} (opcional):`
        );
        setRequestingId(coord.id);
        try {
            const res = await fetch(
                `${API_BASE}/api/serenatas/coordinators/${coord.id}/crew/request`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ message: message ?? undefined }),
                }
            );
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                showToast('Solicitud enviada', 'success');
                setQuery('');
                setResults([]);
                await onRequestSent();
            } else {
                showToast(data?.error || 'No pudimos enviar la solicitud', 'error');
            }
        } finally {
            setRequestingId(null);
        }
    };

    return (
        <section className="mb-6">
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                Buscar cuadrillas
            </h2>
            <p className="text-sm mb-3" style={{ color: 'var(--fg-muted)' }}>
                Encuentra un coordinador y solicita unirte a su cuadrilla.
            </p>
            <div className="relative">
                <IconSearch
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--fg-muted)' }}
                />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre, email o ciudad del coordinador…"
                    className="w-full pl-10 pr-3 py-2.5 rounded-lg border"
                    style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--fg)',
                    }}
                />
            </div>
            {searching && (
                <p className="text-xs mt-2" style={{ color: 'var(--fg-muted)' }}>
                    Buscando…
                </p>
            )}
            {results.length > 0 && (
                <ul className="mt-3 space-y-2">
                    {results.map((c) => (
                        <li
                            key={c.id}
                            className="card flex items-center justify-between gap-3"
                        >
                            <div className="min-w-0">
                                <p className="font-semibold truncate" style={{ color: 'var(--fg)' }}>
                                    {c.name ?? c.email}
                                    {c.isVerified && (
                                        <span
                                            className="ml-2 text-xs"
                                            style={{ color: 'var(--success)' }}
                                        >
                                            ✓ verificado
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                    {c.city ?? '—'}
                                    {c.region ? `, ${c.region}` : ''}
                                    {' · '}
                                    ⭐ {c.rating ?? '—'} · {c.totalSerenatas} serenatas
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={requestingId === c.id}
                                onClick={() => handleRequest(c)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                                style={{
                                    background: 'var(--accent)',
                                    color: 'var(--accent-contrast)',
                                }}
                            >
                                <IconSend size={14} />
                                {requestingId === c.id ? 'Enviando…' : 'Solicitar unirme'}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
