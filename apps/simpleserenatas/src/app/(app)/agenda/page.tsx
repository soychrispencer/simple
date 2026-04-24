'use client';

import { useState, useEffect } from 'react';
import { 
    IconMapPin, 
    IconClock, 
    IconCheck,
    IconX,
    IconCurrencyDollar,
    IconCalendar,
    IconFilter,
    IconSearch
} from '@tabler/icons-react';
import Link from 'next/link';
import { API_BASE } from '@simple/config';

interface Serenata {
    id: string;
    clientName: string;
    address: string;
    dateTime: string;
    status: string;
    price: string;
}

const filters = [
    { key: 'Todas', label: 'Todas', color: 'var(--fg)' },
    { key: 'Pendientes', label: 'Pendientes', color: 'var(--warning)' },
    { key: 'Confirmadas', label: 'Confirmadas', color: 'var(--success)' },
    { key: 'Completadas', label: 'Completadas', color: 'var(--fg-muted)' },
];

export default function AgendaPage() {
    const [activeFilter, setActiveFilter] = useState('Todas');
    const [agendaItems, setAgendaItems] = useState<Serenata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const loadSerenatas = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/serenatas/requests/my/assigned`, {
                    credentials: 'include',
                });
                const data = await res.json();
                
                if (data.ok && data.serenatas) {
                    setAgendaItems(data.serenatas);
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
            day: date.toLocaleDateString('es-CL', { day: 'numeric' }),
            month: date.toLocaleDateString('es-CL', { month: 'short' }),
            time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            fullDate: date.toLocaleDateString('es-CL', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
            }),
            isToday: date.toDateString() === new Date().toDateString(),
            isPast: date < new Date(),
        };
    };

    const filteredItems = agendaItems.filter(item => {
        const matchesFilter = (() => {
            if (activeFilter === 'Todas') return true;
            if (activeFilter === 'Pendientes') return item.status === 'pending';
            if (activeFilter === 'Confirmadas') return item.status === 'confirmed';
            if (activeFilter === 'Completadas') return item.status === 'completed';
            return true;
        })();
        
        const matchesSearch = searchQuery === '' || 
            item.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.address.toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesFilter && matchesSearch;
    });

    // Group by date
    const groupedByDate = filteredItems.reduce((acc, item) => {
        const date = new Date(item.dateTime).toDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(item);
        return acc;
    }, {} as Record<string, typeof agendaItems>);

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
        new Date(a).getTime() - new Date(b).getTime()
    );

    // Stats
    const stats = {
        total: agendaItems.length,
        confirmed: agendaItems.filter(i => i.status === 'confirmed').length,
        pending: agendaItems.filter(i => i.status === 'pending').length,
        completed: agendaItems.filter(i => i.status === 'completed').length,
        earnings: agendaItems.reduce((sum, i) => sum + parseInt(i.price || '0'), 0),
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold" style={{ color: 'var(--fg)' }}>Mi Agenda</h1>
                    <p style={{ color: 'var(--fg-muted)' }}>{stats.total} serenatas programadas</p>
                </div>
                
                {/* Search - Desktop */}
                <div className="hidden md:flex items-center gap-3">
                    <div 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                    >
                        <IconSearch size={18} style={{ color: 'var(--fg-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar serenata..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent outline-none text-sm w-48"
                            style={{ color: 'var(--fg)' }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Filters */}
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {filters.map((filter) => (
                            <button
                                key={filter.key}
                                onClick={() => setActiveFilter(filter.key)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                    activeFilter === filter.key
                                        ? ''
                                        : 'hover:bg-[var(--bg-subtle)]'
                                }`}
                                style={{
                                    background: activeFilter === filter.key ? 'var(--accent)' : 'var(--bg-subtle)',
                                    color: activeFilter === filter.key ? 'var(--accent-contrast)' : 'var(--fg)',
                                }}
                            >
                                {filter.label}
                                <span 
                                    className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                                    style={{ 
                                        background: activeFilter === filter.key 
                                            ? 'rgba(255,255,255,0.3)' 
                                            : 'var(--border)'
                                    }}
                                >
                                    {filter.key === 'Todas' ? stats.total :
                                     filter.key === 'Pendientes' ? stats.pending :
                                     filter.key === 'Confirmadas' ? stats.confirmed :
                                     stats.completed}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Mobile Search */}
                    <div className="md:hidden">
                        <div 
                            className="flex items-center gap-2 px-4 py-3 rounded-xl border"
                            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                        >
                            <IconSearch size={18} style={{ color: 'var(--fg-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar serenata..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent outline-none text-sm flex-1"
                                style={{ color: 'var(--fg)' }}
                            />
                        </div>
                    </div>

                    {/* Agenda List */}
                    {sortedDates.length === 0 ? (
                        <div 
                            className="rounded-2xl p-8 text-center"
                            style={{ background: 'var(--bg-subtle)' }}
                        >
                            <IconCalendar size={48} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                            <p style={{ color: 'var(--fg-muted)' }}>No hay serenatas en tu agenda</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {sortedDates.map((date) => {
                                const items = groupedByDate[date];
                                const { fullDate, isToday } = formatDateTime(items[0].dateTime);
                                return (
                                    <div key={date}>
                                        <h2 
                                            className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                                            style={{ color: 'var(--fg-muted)' }}
                                        >
                                            <IconCalendar size={14} />
                                            {fullDate}
                                            {isToday && (
                                                <span 
                                                    className="text-xs px-2 py-0.5 rounded-full"
                                                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                                                >
                                                    Hoy
                                                </span>
                                            )}
                                        </h2>
                                        <div className="space-y-3">
                                            {items.map((item) => {
                                                const { time } = formatDateTime(item.dateTime);
                                                return (
                                                    <Link
                                                        key={item.id}
                                                        href={`/serenata/${item.id}`}
                                                        className="card card-hover block"
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            {/* Time */}
                                                            <div className="flex-shrink-0 text-center w-16">
                                                                <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{time}</p>
                                                            </div>

                                                            {/* Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                    <h3 className="font-semibold truncate" style={{ color: 'var(--fg)' }}>
                                                                        {item.clientName}
                                                                    </h3>
                                                                    <StatusBadge status={item.status} />
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-1 text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>
                                                                    <IconMapPin size={14} />
                                                                    <span className="truncate">{item.address}</span>
                                                                </div>

                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                                                                        {formatCurrency(parseInt(item.price || '0'))}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar Stats - Desktop */}
                <div className="hidden lg:block space-y-4">
                    <div className="card">
                        <h3 className="font-semibold mb-4" style={{ color: 'var(--fg)' }}>Resumen</h3>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'var(--accent-subtle)' }}
                                    >
                                        <IconCalendar size={20} style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Total</p>
                                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>{stats.total} serenatas</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'color-mix(in oklab, var(--success) 15%, transparent)' }}
                                    >
                                        <IconCheck size={20} style={{ color: 'var(--success)' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Confirmadas</p>
                                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>{stats.confirmed}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: 'color-mix(in oklab, var(--warning) 15%, transparent)' }}
                                    >
                                        <IconClock size={20} style={{ color: 'var(--warning)' }} />
                                    </div>
                                    <div>
                                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Pendientes</p>
                                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>{stats.pending}</p>
                                    </div>
                                </div>
                            </div>

                            <div 
                                className="p-4 rounded-xl mt-4"
                                style={{ background: 'var(--accent-subtle)' }}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <IconCurrencyDollar size={18} style={{ color: 'var(--accent)' }} />
                                    <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Ganancias esperadas</span>
                                </div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
                                    {formatCurrency(stats.earnings)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const config = {
        confirmed: {
            bg: 'color-mix(in oklab, var(--success) 15%, transparent)',
            color: 'var(--success)',
            icon: IconCheck,
            label: 'Confirmada',
        },
        completed: {
            bg: 'var(--bg-muted)',
            color: 'var(--fg-muted)',
            icon: IconCheck,
            label: 'Completada',
        },
        pending: {
            bg: 'color-mix(in oklab, var(--warning) 15%, transparent)',
            color: 'var(--warning)',
            icon: IconClock,
            label: 'Pendiente',
        },
        cancelled: {
            bg: 'color-mix(in oklab, var(--error) 15%, transparent)',
            color: 'var(--error)',
            icon: IconX,
            label: 'Cancelada',
        },
    };

    const c = config[status as keyof typeof config] || config.pending;
    const Icon = c.icon;

    return (
        <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: c.bg, color: c.color }}
        >
            <Icon size={12} />
            {c.label}
        </span>
    );
}
