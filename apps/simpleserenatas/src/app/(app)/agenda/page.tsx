'use client';

import { useState, useEffect } from 'react';
import { 
    IconMapPin, 
    IconClock, 
    IconCalendar,
    IconSearch,
    IconLoader,
    IconChevronRight,
    IconMusic,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@simple/config';
import { SerenatasPageHeader, SerenatasPageShell } from '@/components/shell';

interface Serenata {
    id: string;
    clientName: string;
    address: string;
    dateTime: string;
    status: string;
    price: string;
}

const filters = [
    { key: 'Todas', label: 'Todas' },
    { key: 'Pendientes', label: 'Pendientes' },
    { key: 'Confirmadas', label: 'Confirmadas' },
    { key: 'Completadas', label: 'Completadas' },
];

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
        pending: { bg: 'var(--warning-subtle)', color: 'var(--warning)', label: 'Pendiente' },
        confirmed: { bg: 'var(--success-subtle)', color: 'var(--success)', label: 'Confirmada' },
        completed: { bg: 'var(--bg-muted)', color: 'var(--fg-muted)', label: 'Completada' },
        cancelled: { bg: 'var(--error-subtle)', color: 'var(--error)', label: 'Cancelada' },
    };
    const style = styles[status] || styles.pending;
    
    return (
        <span 
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{ background: style.bg, color: style.color }}
        >
            {style.label}
        </span>
    );
}

export default function AgendaPage() {
    const [activeFilter, setActiveFilter] = useState('Todas');
    const [agendaItems, setAgendaItems] = useState<Serenata[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { user } = useAuth();

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
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        let dayLabel;
        if (date.toDateString() === now.toDateString()) {
            dayLabel = 'Hoy';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            dayLabel = 'Mañana';
        } else {
            dayLabel = date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
        }
        
        return {
            day: date.toLocaleDateString('es-CL', { day: 'numeric' }),
            month: date.toLocaleDateString('es-CL', { month: 'short' }),
            time: date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            dayLabel,
            isToday: date.toDateString() === now.toDateString(),
            isPast: date < now && date.toDateString() !== now.toDateString(),
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
    }, {} as Record<string, Serenata[]>);

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
        new Date(a).getTime() - new Date(b).getTime()
    );

    // Stats
    const stats = {
        total: agendaItems.length,
        confirmed: agendaItems.filter(i => i.status === 'confirmed').length,
        pending: agendaItems.filter(i => i.status === 'pending').length,
        completed: agendaItems.filter(i => i.status === 'completed').length,
    };

    if (isLoading) {
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
                title="Mi agenda"
                description={`${stats.total} serenatas programadas`}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--fg)' }}>{stats.total}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Total</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--accent)' }}>{stats.pending}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Pendientes</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>{stats.confirmed}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Confirmadas</p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <p className="text-xl font-bold" style={{ color: 'var(--fg-muted)' }}>{stats.completed}</p>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Completadas</p>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <div 
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
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

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
                {filters.map((filter) => (
                    <button
                        key={filter.key}
                        onClick={() => setActiveFilter(filter.key)}
                        className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                        style={{
                            background: activeFilter === filter.key ? 'var(--accent)' : 'var(--bg-subtle)',
                            color: activeFilter === filter.key ? 'white' : 'var(--fg)',
                        }}
                    >
                        {filter.label}
                        <span 
                            className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                            style={{ 
                                background: activeFilter === filter.key 
                                    ? 'rgba(255,255,255,0.3)' 
                                    : 'var(--border)',
                                color: activeFilter === filter.key ? 'white' : 'var(--fg-muted)',
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

            {/* Agenda List */}
            {sortedDates.length === 0 ? (
                <div 
                    className="rounded-2xl p-8 text-center"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                    <IconCalendar size={48} className="mx-auto mb-3" style={{ color: 'var(--border-strong)' }} />
                    <p className="font-medium mb-1" style={{ color: 'var(--fg)' }}>No hay serenatas en tu agenda</p>
                    <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                        Las serenatas asignadas aparecerán aquí
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {sortedDates.map((date) => {
                        const items = groupedByDate[date];
                        const { dayLabel, isToday } = formatDateTime(items[0].dateTime);
                        
                        return (
                            <div key={date}>
                                <h2 
                                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                                    style={{ color: 'var(--fg-muted)' }}
                                >
                                    <IconCalendar size={14} />
                                    {dayLabel}
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
                                        const { day, month, time } = formatDateTime(item.dateTime);
                                        return (
                                            <Link
                                                key={item.id}
                                                href={`/serenata/${item.id}`}
                                                className="block p-4 rounded-2xl transition-all hover:opacity-90"
                                                style={{ 
                                                    background: 'var(--bg-elevated)', 
                                                    border: '1px solid var(--border)' 
                                                }}
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Date Box */}
                                                    <div 
                                                        className="flex-shrink-0 text-center w-14 py-2 rounded-xl"
                                                        style={{ background: 'var(--bg-subtle)' }}
                                                    >
                                                        <p className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{day}</p>
                                                        <p className="text-xs uppercase" style={{ color: 'var(--fg-muted)' }}>{month}</p>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <h3 className="font-semibold" style={{ color: 'var(--fg)' }}>
                                                                {item.clientName}
                                                            </h3>
                                                            <StatusBadge status={item.status} />
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-1 text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>
                                                            <IconClock size={14} />
                                                            <span>{time}</span>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-1 text-sm mb-2" style={{ color: 'var(--fg-muted)' }}>
                                                            <IconMapPin size={14} />
                                                            <span className="truncate">{item.address}</span>
                                                        </div>

                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                                                                {formatCurrency(parseInt(item.price || '0'))}
                                                            </span>
                                                            <IconChevronRight size={16} style={{ color: 'var(--fg-faint)' }} />
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
        </SerenatasPageShell>
    );
}
