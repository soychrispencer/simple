'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
    IconCreditCard,
    IconPlus,
    IconLoader2,
    IconCheck,
    IconX,
    IconCash,
    IconBuildingBank,
    IconEdit,
    IconTrash,
    IconBrandWhatsapp,
    IconAlertTriangle,
    IconDownload,
    IconChartBar,
    IconLock,
} from '@tabler/icons-react';
import { AgendaScrollModal } from '@/components/panel/agenda-scroll-modal';
import {
    fetchAgendaPayments,
    createAgendaPayment,
    patchAgendaPayment,
    deleteAgendaPayment,
    fetchAgendaClients,
    fetchAgendaAppointments,
    fetchAgendaProfile,
    hasAgendaFullAccess,
    type AgendaPayment,
    type AgendaClient,
    type AgendaAppointment,
} from '@/lib/agenda-api';
import { fmtCLP, fmtDateMedium as fmtDate } from '@/lib/format';
import { vocab } from '@/lib/vocabulary';
import { AGENDA_FINANCE_PAGE } from '@simple/ui/panel';

const METHOD_LABELS: Record<string, string> = {
    transfer: 'Transferencia',
    cash: 'Efectivo',
    card: 'Tarjeta',
    mercadopago: 'MercadoPago',
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    refunded: 'Devuelto',
    waived: 'Condonado',
};

const STATUS_COLORS: Record<string, string> = {
    pending: '#d97706',
    paid: 'var(--accent)',
    refunded: '#6366F1',
    waived: '#9CA3AF',
};

type Period = 'month' | '30d' | '90d' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
    month: 'Este mes',
    '30d': '30 d├¡as',
    '90d': '90 d├¡as',
    all: 'Todo',
};

const OVERDUE_DAYS = 7;

const startOfPeriod = (period: Period): Date | null => {
    const now = new Date();
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === '30d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 30);
        return d;
    }
    if (period === '90d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 90);
        return d;
    }
    return null;
};

const monthLabel = (d: Date) =>
    d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '');

const csvEscape = (val: string | number | null | undefined) => {
    const s = val == null ? '' : String(val);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
};

const sanitizePhone = (phone: string | null | undefined) => {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
};

export default function PagosPage() {
    const [payments, setPayments] = useState<AgendaPayment[]>([]);
    const [clients, setClients] = useState<AgendaClient[]>([]);
    const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPro, setIsPro] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [markingPaid, setMarkingPaid] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [editingPayment, setEditingPayment] = useState<AgendaPayment | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editMethod, setEditMethod] = useState('transfer');
    const [editNotes, setEditNotes] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const [period, setPeriod] = useState<Period>('month');

    const [form, setForm] = useState({
        clientId: '',
        appointmentId: '',
        amount: '',
        method: 'transfer',
        notes: '',
        status: 'pending',
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        const profile = await fetchAgendaProfile();
        const canUsePayments = profile ? hasAgendaFullAccess(profile) : false;
        setIsPro(canUsePayments);
        if (!canUsePayments) {
            setPayments([]);
            setClients([]);
            setAppointments([]);
            setLoading(false);
            return;
        }
        const [p, c, a] = await Promise.all([
            fetchAgendaPayments(),
            fetchAgendaClients(),
            fetchAgendaAppointments(),
        ]);
        setPayments(p);
        setClients(c);
        // Only show appointments with a price that don't already have a payment
        const paidApptIds = new Set(p.map((pay) => pay.appointmentId).filter(Boolean));
        setAppointments(a.filter((appt) => appt.price && !paidApptIds.has(appt.id)));
        setLoading(false);
    }, []);

    useEffect(() => { void load(); }, [load]);

    const pending = useMemo(() => payments.filter((p) => p.status === 'pending'), [payments]);
    const totalPendingAmount = useMemo(() => pending.reduce((s, p) => s + Number(p.amount), 0), [pending]);

    const periodStart = useMemo(() => startOfPeriod(period), [period]);

    const paidInPeriod = useMemo(
        () =>
            payments.filter((p) => {
                if (p.status !== 'paid' || !p.paidAt) return false;
                if (!periodStart) return true;
                return new Date(p.paidAt).getTime() >= periodStart.getTime();
            }),
        [payments, periodStart],
    );

    const totalInPeriod = useMemo(
        () => paidInPeriod.reduce((s, p) => s + Number(p.amount), 0),
        [paidInPeriod],
    );

    const avgInPeriod = useMemo(
        () => (paidInPeriod.length === 0 ? 0 : Math.round(totalInPeriod / paidInPeriod.length)),
        [paidInPeriod, totalInPeriod],
    );

    // Mini gr├ífico: ├║ltimos 6 meses (incluye actual)
    const monthlySeries = useMemo(() => {
        const now = new Date();
        const buckets: { label: string; total: number }[] = [];
        for (let i = 5; i >= 0; i -= 1) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({ label: monthLabel(d), total: 0 });
        }
        payments.forEach((p) => {
            if (p.status !== 'paid' || !p.paidAt) return;
            const d = new Date(p.paidAt);
            const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
            if (diff < 0 || diff > 5) return;
            const idx = 5 - diff;
            buckets[idx].total += Number(p.amount);
        });
        const max = Math.max(...buckets.map((b) => b.total), 1);
        return { buckets, max };
    }, [payments]);

    // Breakdown por m├®todo dentro del per├¡odo
    const methodBreakdown = useMemo(() => {
        const totals: Record<string, number> = {};
        paidInPeriod.forEach((p) => {
            const key = p.method ?? 'otro';
            totals[key] = (totals[key] ?? 0) + Number(p.amount);
        });
        const sum = Object.values(totals).reduce((s, n) => s + n, 0);
        return Object.entries(totals)
            .map(([key, value]) => ({
                key,
                label: METHOD_LABELS[key] ?? key,
                value,
                pct: sum === 0 ? 0 : Math.round((value / sum) * 100),
            }))
            .sort((a, b) => b.value - a.value);
    }, [paidInPeriod]);

    const overdueIds = useMemo(() => {
        const cutoff = Date.now() - OVERDUE_DAYS * 86400 * 1000;
        return new Set(
            pending
                .filter((p) => new Date(p.createdAt).getTime() < cutoff)
                .map((p) => p.id),
        );
    }, [pending]);

    const handleMarkPaid = async (payment: AgendaPayment) => {
        setMarkingPaid(payment.id);
        await patchAgendaPayment(payment.id, { status: 'paid' });
        setMarkingPaid(null);
        await load();
    };

    const handleOpenEdit = (payment: AgendaPayment) => {
        setEditingPayment(payment);
        setEditAmount(String(payment.amount));
        setEditMethod(payment.method ?? 'transfer');
        setEditNotes(payment.notes ?? '');
    };

    const handleSaveEdit = async () => {
        if (!editingPayment) return;
        if (!editAmount || Number(editAmount) <= 0) return;
        setEditSaving(true);
        try {
            await patchAgendaPayment(editingPayment.id, {
                amount: editAmount,
                method: editMethod,
                notes: editNotes || undefined,
            });
            setEditingPayment(null);
            await load();
        } finally {
            setEditSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteAgendaPayment(id);
            setConfirmDeleteId(null);
            await load();
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreate = async () => {
        setCreateError('');
        if (!form.amount || Number(form.amount) <= 0) {
            setCreateError('Ingresa un monto v├ílido.');
            return;
        }
        setCreating(true);
        try {
            // If appointment selected, pre-fill client
            let clientId = form.clientId;
            if (form.appointmentId && !clientId) {
                const appt = appointments.find((a) => a.id === form.appointmentId);
                if (appt?.clientId) clientId = appt.clientId;
            }

            await createAgendaPayment({
                clientId: clientId || undefined,
                appointmentId: form.appointmentId || undefined,
                amount: form.amount,
                method: form.method,
                notes: form.notes || undefined,
                status: form.status,
            } as Partial<AgendaPayment>);
            setShowCreate(false);
            setForm({ clientId: '', appointmentId: '', amount: '', method: 'transfer', notes: '', status: 'pending' });
            await load();
        } catch {
            setCreateError('Error de conexi├│n. Intenta nuevamente.');
        } finally {
            setCreating(false);
        }
    };

    const clientName = (clientId: string | null) => {
        if (!clientId) return null;
        const c = clients.find((cl) => cl.id === clientId);
        return c ? `${c.firstName} ${c.lastName ?? ''}`.trim() : null;
    };

    const buildReminderHref = (payment: AgendaPayment) => {
        if (!payment.clientId) return null;
        const client = clients.find((c) => c.id === payment.clientId);
        if (!client) return null;
        const phone = sanitizePhone(client.whatsapp ?? client.phone);
        if (!phone) return null;
        const greeting = `Hola ${client.firstName}`;
        const body = `te recuerdo el cobro pendiente de ${fmtCLP(payment.amount)}. Si ya lo realizaste, av├¡same para registrarlo. ┬íGracias!`;
        const text = encodeURIComponent(`${greeting}, ${body}`);
        return `https://wa.me/${phone}?text=${text}`;
    };

    const handleExportCsv = () => {
        const header = ['Fecha', 'Cliente', 'Monto', 'Moneda', 'M├®todo', 'Estado', 'Notas'];
        const rows = payments.map((p) => [
            (p.paidAt ?? p.createdAt).slice(0, 10),
            clientName(p.clientId) ?? '',
            p.amount,
            p.currency || 'CLP',
            METHOD_LABELS[p.method ?? ''] ?? p.method ?? '',
            STATUS_LABELS[p.status] ?? p.status,
            p.notes ?? '',
        ]);
        const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);
        link.href = url;
        link.download = `finanzas-${today}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!loading && !isPro) {
        return (
            <div className="container-app panel-page py-4 lg:py-8">
                <div className="flex items-start justify-between gap-3 mb-5 lg:mb-6 flex-wrap">
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold agenda-pagos-title">Cobros</h1>
                        <p className="text-sm mt-0.5 agenda-pagos-muted">
                            Registra y controla los pagos de tus sesiones.
                        </p>
                    </div>
                </div>
                <div className="rounded-2xl border p-6 sm:p-8 agenda-pagos-surface">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <IconLock size={22} />
                    </div>
                    <h2 className="text-xl font-bold agenda-pagos-title mb-2">Cobros es una funci├│n Pro</h2>
                    <p className="text-sm agenda-pagos-muted max-w-xl mb-5">
                        Activa el plan Profesional para registrar pagos, controlar pendientes, exportar cobros y conectar medios de pago.
                    </p>
                    <a href="/panel/mi-cuenta/suscripcion" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold agenda-pagos-btn-accent">
                        Ver planes
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-4 lg:py-8">
            <div className="flex items-start justify-between gap-3 mb-5 lg:mb-6 flex-wrap">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold agenda-pagos-title">{AGENDA_FINANCE_PAGE.title}</h1>
                    <p className="text-sm mt-0.5 agenda-pagos-muted">
                        {AGENDA_FINANCE_PAGE.description}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {payments.length > 0 && (
                        <button
                            onClick={handleExportCsv}
                            aria-label="Descargar hist├│rico en CSV"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle) agenda-pagos-btn-outline"
                            title="Descargar hist├│rico en CSV"
                        >
                            <IconDownload size={14} />
                            <span className="hidden sm:inline">CSV</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowCreate(true)}
                        aria-label="Registrar cobro"
                        className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 agenda-pagos-btn-accent"
                    >
                        <IconPlus size={15} />
                        <span className="hidden sm:inline">Registrar cobro</span>
                    </button>
                </div>
            </div>

            {/* Period filter */}
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0" role="tablist" aria-label="Per├¡odo del dashboard">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => {
                    const active = period === p;
                    return (
                        <button
                            key={p}
                            role="tab"
                            aria-selected={active}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors agenda-pagos-tab ${active ? 'agenda-pagos-tab--active' : ''}`}
                        >
                            {PERIOD_LABELS[p]}
                        </button>
                    );
                })}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {loading ? null : (
                    <>
                        <div className="p-4 rounded-2xl border agenda-pagos-surface">
                            <p className="text-xl sm:text-2xl font-bold tracking-tight agenda-pagos-stat-accent">{fmtCLP(totalInPeriod)}</p>
                            <p className="text-xs mt-0.5 agenda-pagos-muted">Cobrado ┬À {PERIOD_LABELS[period].toLowerCase()}</p>
                        </div>
                        <div className="p-4 rounded-2xl border agenda-pagos-surface">
                            <p className="text-xl sm:text-2xl font-bold tracking-tight agenda-pagos-stat-warning">{fmtCLP(totalPendingAmount)}</p>
                            <p className="text-xs mt-0.5 agenda-pagos-muted">
                                Pendientes
                                {overdueIds.size > 0 && (
                                    <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium agenda-pagos-overdue">
                                        <IconAlertTriangle size={9} /> {overdueIds.size} atrasados
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="p-4 rounded-2xl border agenda-pagos-surface">
                            <p className="text-xl sm:text-2xl font-bold tracking-tight agenda-pagos-stat-fg">{paidInPeriod.length}</p>
                            <p className="text-xs mt-0.5 agenda-pagos-muted">Cobros realizados</p>
                        </div>
                        <div className="p-4 rounded-2xl border agenda-pagos-surface">
                            <p className="text-xl sm:text-2xl font-bold tracking-tight agenda-pagos-stat-fg">{fmtCLP(avgInPeriod)}</p>
                            <p className="text-xs mt-0.5 agenda-pagos-muted">Promedio por cobro</p>
                        </div>
                    </>
                )}
            </div>

            {/* Mini chart + method breakdown */}
            {!loading && payments.some((p) => p.status === 'paid') && (
                <div className="grid lg:grid-cols-3 gap-3 mb-8">
                    {/* 6-month bars */}
                    <div className="lg:col-span-2 p-4 rounded-2xl border agenda-pagos-surface">
                        <div className="flex items-center gap-2 mb-3">
                            <IconChartBar size={14} className="agenda-pagos-muted" />
                            <p className="text-xs font-semibold uppercase tracking-wider agenda-pagos-muted">
                                ├Ültimos 6 meses
                            </p>
                        </div>
                        <div className="flex items-end gap-2 h-28">
                            {monthlySeries.buckets.map((b, i) => {
                                const heightPct = (b.total / monthlySeries.max) * 100;
                                const isCurrent = i === monthlySeries.buckets.length - 1;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0" title={fmtCLP(b.total)}>
                                        <div className="flex-1 w-full flex items-end">
                                            <div
                                                className="w-full rounded-md transition-all"
                                                style={{
                                                    height: `${Math.max(heightPct, b.total > 0 ? 6 : 2)}%`,
                                                    background: isCurrent ? 'var(--accent)' : 'var(--accent-soft)',
                                                    border: '1px solid var(--accent-border, var(--border))',
                                                    opacity: b.total === 0 ? 0.4 : 1,
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] capitalize truncate w-full text-center" style={{ color: 'var(--fg-muted)' }}>
                                            {b.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Method breakdown */}
                    <div className="p-4 rounded-2xl border agenda-pagos-surface">
                        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--fg-muted)' }}>
                            Por m├®todo
                        </p>
                        {methodBreakdown.length === 0 ? (
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>Sin cobros en este per├¡odo.</p>
                        ) : (
                            <div className="flex flex-col gap-2.5">
                                {methodBreakdown.map((m) => (
                                    <div key={m.key}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs" style={{ color: 'var(--fg)' }}>{m.label}</span>
                                            <span className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>{m.pct}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{ width: `${m.pct}%`, background: 'var(--accent)' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Payments list */}
            {loading ? null : payments.length === 0 ? (
                <div
                    className="rounded-2xl border flex flex-col items-center justify-center py-24 text-center"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <IconCreditCard size={24} />
                    </div>
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>Sin cobros registrados</h2>
                    <p className="text-sm max-w-sm" style={{ color: 'var(--fg-muted)' }}>
                        Una vez que tengas citas confirmadas, podr├ís registrar y controlar los cobros aqu├¡.
                    </p>
                </div>
            ) : (
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    {/* Pending first, then paid */}
                    {[...payments].sort((a, b) => {
                        const order = { pending: 0, paid: 1, refunded: 2, waived: 3 };
                        return (order[a.status as keyof typeof order] ?? 4) - (order[b.status as keyof typeof order] ?? 4);
                    }).map((payment, i, arr) => (
                        <div
                            key={payment.id}
                            className="flex items-center gap-4 p-4"
                            style={{
                                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                                background: 'var(--surface)',
                            }}
                        >
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: `${STATUS_COLORS[payment.status] ?? 'var(--border)'}18`, color: STATUS_COLORS[payment.status] ?? 'var(--fg-muted)' }}
                            >
                                {payment.method === 'cash' ? <IconCash size={16} /> : <IconBuildingBank size={16} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                        {fmtCLP(payment.amount)}
                                    </p>
                                    <span
                                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                                        style={{ background: `${STATUS_COLORS[payment.status]}20`, color: STATUS_COLORS[payment.status] ?? 'var(--fg-muted)' }}
                                    >
                                        {STATUS_LABELS[payment.status] ?? payment.status}
                                    </span>
                                    {overdueIds.has(payment.id) && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
                                            <IconAlertTriangle size={10} />
                                            Atrasado
                                        </span>
                                    )}
                                    {payment.method && (
                                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {METHOD_LABELS[payment.method] ?? payment.method}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mt-0.5 agenda-pagos-muted">
                                    {clientName(payment.clientId) ?? 'ÔÇö'}
                                    {payment.notes ? ` ┬À ${payment.notes}` : ''}
                                    {' ┬À '}
                                    {payment.paidAt ? `Pagado ${fmtDate(payment.paidAt)}` : `Creado ${fmtDate(payment.createdAt)}`}
                                </p>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                {payment.status === 'pending' && (() => {
                                    const reminderHref = buildReminderHref(payment);
                                    return reminderHref ? (
                                        <a
                                            href={reminderHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label="Enviar recordatorio por WhatsApp"
                                            className="inline-flex items-center justify-center gap-1 w-9 h-9 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-(--bg-subtle)"
                                            style={{ borderColor: 'var(--border)', color: '#25D366' }}
                                            title="Enviar recordatorio por WhatsApp"
                                        >
                                            <IconBrandWhatsapp size={15} />
                                            <span className="hidden sm:inline">Recordar</span>
                                        </a>
                                    ) : null;
                                })()}
                                {payment.status === 'pending' && (
                                    <button
                                        onClick={() => void handleMarkPaid(payment)}
                                        disabled={markingPaid === payment.id}
                                        aria-label="Marcar como pagado"
                                        className="inline-flex items-center justify-center gap-1.5 w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                        style={{ background: 'var(--accent)', color: '#fff' }}
                                    >
                                        {markingPaid === payment.id ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                                        <span className="hidden sm:inline">Pagado</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    aria-label="Editar cobro"
                                    onClick={() => handleOpenEdit(payment)}
                                    className="w-9 h-9 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    title="Editar cobro"
                                >
                                    <IconEdit size={14} />
                                </button>
                                {confirmDeleteId === payment.id ? (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => void handleDelete(payment.id)}
                                            disabled={deletingId === payment.id}
                                            className="px-2 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90"
                                            style={{ background: '#EF4444', color: '#fff' }}
                                        >
                                            {deletingId === payment.id ? <IconLoader2 size={11} className="animate-spin" /> : 'Eliminar'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmDeleteId(null)}
                                            className="px-2 py-1 rounded-lg text-xs border"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                        >
                                            No
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        aria-label="Eliminar cobro"
                                        onClick={() => setConfirmDeleteId(payment.id)}
                                        className="hidden sm:flex w-7 h-7 rounded-lg items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        title="Eliminar cobro"
                                    >
                                        <IconTrash size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create modal */}
            {showCreate && (
                <AgendaScrollModal
                    title="Registrar cobro"
                    titleId="pagos-create-title"
                    size="md"
                    onClose={() => setShowCreate(false)}
                    footer={(
                        <div className="flex gap-3">
                            <button
                                onClick={() => void handleCreate()}
                                disabled={creating}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                                {creating && <IconLoader2 size={14} className="animate-spin" />}
                                {creating ? 'Guardando...' : 'Registrar'}
                            </button>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                >
                    <div className="flex flex-col gap-4">
                            {/* Client */}
                            {clients.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>{vocab.Client}</label>
                                    <select
                                        value={form.clientId}
                                        onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value, appointmentId: '' }))}
                                        className="field-input"
                                    >
                                        <option value="">ÔÇö Seleccionar ÔÇö</option>
                                        {clients.map((c) => (
                                            <option key={c.id} value={c.id}>{c.firstName} {c.lastName ?? ''}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Appointment (filtered by client) */}
                            {appointments.filter((a) => !form.clientId || a.clientId === form.clientId).length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Cita (opcional)</label>
                                    <select
                                        value={form.appointmentId}
                                        onChange={(e) => {
                                            const appt = appointments.find((a) => a.id === e.target.value);
                                            setForm((p) => ({
                                                ...p,
                                                appointmentId: e.target.value,
                                                amount: appt?.price ?? p.amount,
                                                clientId: appt?.clientId ?? p.clientId,
                                            }));
                                        }}
                                        className="field-input"
                                    >
                                        <option value="">ÔÇö Sin cita asociada ÔÇö</option>
                                        {appointments
                                            .filter((a) => !form.clientId || a.clientId === form.clientId)
                                            .map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {new Date(a.startsAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                                    {' ÔÇö '}
                                                    {a.clientName ?? clientName(a.clientId ?? null) ?? vocab.Client}
                                                    {a.price ? ` ($${Number(a.price).toLocaleString('es-CL')})` : ''}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {/* Amount */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Monto (CLP) *</label>
                                <input
                                    type="number"
                                    min={0}
                                    placeholder="Ej: 50000"
                                    value={form.amount}
                                    onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                                    className="field-input"
                                />
                            </div>

                            {/* Method */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>M├®todo de pago</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['transfer', 'cash', 'card', 'mercadopago'] as const).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setForm((p) => ({ ...p, method: m }))}
                                            className="py-2 px-3 rounded-xl border text-xs transition-colors"
                                            style={{
                                                borderColor: form.method === m ? 'var(--accent)' : 'var(--border)',
                                                color: form.method === m ? 'var(--accent)' : 'var(--fg-secondary)',
                                                fontWeight: form.method === m ? 600 : 400,
                                            }}
                                        >
                                            {METHOD_LABELS[m]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Estado</label>
                                <div className="flex gap-2">
                                    {(['pending', 'paid'] as const).map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => setForm((p) => ({ ...p, status: s }))}
                                            className="flex-1 py-2 rounded-xl border text-sm transition-colors"
                                            style={{
                                                borderColor: form.status === s ? STATUS_COLORS[s] : 'var(--border)',
                                                color: form.status === s ? STATUS_COLORS[s] : 'var(--fg-secondary)',
                                                fontWeight: form.status === s ? 600 : 400,
                                            }}
                                        >
                                            {STATUS_LABELS[s]}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Nota interna (opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: sesi├│n 3, abono"
                                    value={form.notes}
                                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                    className="field-input"
                                />
                            </div>

                            {createError && (
                                <p className="text-sm" style={{ color: '#dc2626' }}>{createError}</p>
                            )}
                    </div>
                </AgendaScrollModal>
            )}

            {/* Edit payment modal */}
            {editingPayment && (
                <AgendaScrollModal
                    title="Editar cobro"
                    titleId="pagos-edit-title"
                    size="md"
                    onClose={() => setEditingPayment(null)}
                    footer={(
                        <div className="flex gap-3">
                            <button
                                onClick={() => void handleSaveEdit()}
                                disabled={editSaving || !editAmount || Number(editAmount) <= 0}
                                className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                style={{ background: 'var(--accent)', color: '#fff' }}
                            >
                                {editSaving && <IconLoader2 size={14} className="animate-spin" />}
                                {editSaving ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            <button
                                onClick={() => setEditingPayment(null)}
                                className="px-4 py-2.5 rounded-xl text-sm border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                >
                    <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Monto (CLP) *</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="field-input"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>M├®todo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['transfer', 'cash', 'card', 'mercadopago'] as const).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => setEditMethod(m)}
                                            className="py-2 px-3 rounded-xl border text-xs transition-colors"
                                            style={{
                                                borderColor: editMethod === m ? 'var(--accent)' : 'var(--border)',
                                                color: editMethod === m ? 'var(--accent)' : 'var(--fg-secondary)',
                                                fontWeight: editMethod === m ? 600 : 400,
                                            }}
                                        >
                                            {METHOD_LABELS[m]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Nota interna (opcional)</label>
                                <input
                                    type="text"
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Ej: sesi├│n 3, abono"
                                    className="field-input"
                                />
                            </div>
                    </div>
                </AgendaScrollModal>
            )}

        </div>
    );
}
