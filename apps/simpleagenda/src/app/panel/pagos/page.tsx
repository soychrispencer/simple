'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
    IconCreditCard, 
    IconPlus, 
    IconLoader2, 
    IconCheck, 
    IconX, 
    IconCash, 
    IconBuildingBank, 
    IconEdit, 
    IconTrash 
} from '@tabler/icons-react';
import {
    fetchAgendaPayments,
    createAgendaPayment,
    patchAgendaPayment,
    deleteAgendaPayment,
    fetchAgendaClients,
    fetchAgendaAppointments,
    type AgendaPayment,
    type AgendaClient,
    type AgendaAppointment,
} from '@/lib/agenda-api';
import { fmtCLP, fmtDateMedium as fmtDate } from '@/lib/format';
import { vocab } from '@/lib/vocabulary';

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

export default function PagosPage() {
    const [payments, setPayments] = useState<AgendaPayment[]>([]);
    const [clients, setClients] = useState<AgendaClient[]>([]);
    const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [markingPaid, setMarkingPaid] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [editingPayment, setEditingPayment] = useState<AgendaPayment | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editMethod, setEditMethod] = useState('transfer');
    const [editNotes, setEditNotes] = useState('');
    const [editSaving, setEditSaving] = useState(false);

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

    const pending = payments.filter((p) => p.status === 'pending');
    const paidThisMonth = payments.filter((p) => {
        if (p.status !== 'paid' || !p.paidAt) return false;
        const d = new Date(p.paidAt);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalPendingAmount = pending.reduce((s, p) => s + Number(p.amount), 0);
    const totalThisMonth = paidThisMonth.reduce((s, p) => s + Number(p.amount), 0);
    const totalHistorico = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0);

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
            setCreateError('Ingresa un monto válido.');
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
            setCreateError('Error de conexión. Intenta nuevamente.');
        } finally {
            setCreating(false);
        }
    };

    const clientName = (clientId: string | null) => {
        if (!clientId) return null;
        const c = clients.find((cl) => cl.id === clientId);
        return c ? `${c.firstName} ${c.lastName ?? ''}`.trim() : null;
    };

    return (
        <div className="container-app panel-page py-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Cobros</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        Registra y controla los pagos de tus sesiones.
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                >
                    <IconPlus size={15} />
                    Registrar cobro
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    {loading ? <IconLoader2 size={18} className="animate-spin" style={{ color: 'var(--fg-muted)' }} /> : (
                        <p className="text-2xl font-bold" style={{ color: '#d97706' }}>{fmtCLP(totalPendingAmount)}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Cobros pendientes</p>
                </div>
                <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    {loading ? <IconLoader2 size={18} className="animate-spin" style={{ color: 'var(--fg-muted)' }} /> : (
                        <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{fmtCLP(totalThisMonth)}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Cobrado este mes</p>
                </div>
                <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                    {loading ? <IconLoader2 size={18} className="animate-spin" style={{ color: 'var(--fg-muted)' }} /> : (
                        <p className="text-2xl font-bold" style={{ color: 'var(--fg-muted)' }}>{fmtCLP(totalHistorico)}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>Total histórico</p>
                </div>
            </div>

            {/* Payments list */}
            {loading ? (
                <div className="flex items-center gap-2 text-sm py-8" style={{ color: 'var(--fg-muted)' }}>
                    <IconLoader2 size={15} className="animate-spin" /> Cargando cobros...
                </div>
            ) : payments.length === 0 ? (
                <div
                    className="rounded-2xl border flex flex-col items-center justify-center py-24 text-center"
                    style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <IconCreditCard size={24} />
                    </div>
                    <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>Sin cobros registrados</h2>
                    <p className="text-sm max-w-sm" style={{ color: 'var(--fg-muted)' }}>
                        Una vez que tengas citas confirmadas, podrás registrar y controlar los cobros aquí.
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
                                    {payment.method && (
                                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                            {METHOD_LABELS[payment.method] ?? payment.method}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                                    {clientName(payment.clientId) ?? '—'}
                                    {payment.notes ? ` · ${payment.notes}` : ''}
                                    {' · '}
                                    {payment.paidAt ? `Pagado ${fmtDate(payment.paidAt)}` : `Creado ${fmtDate(payment.createdAt)}`}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {payment.status === 'pending' && (
                                    <button
                                        onClick={() => void handleMarkPaid(payment)}
                                        disabled={markingPaid === payment.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                                        style={{ background: 'var(--accent)', color: '#fff' }}
                                    >
                                        {markingPaid === payment.id ? <IconLoader2 size={12} className="animate-spin" /> : <IconCheck size={12} />}
                                        Pagado
                                    </button>
                                )}
                                <button
                                    onClick={() => handleOpenEdit(payment)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                                    style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                                    title="Editar cobro"
                                >
                                    <IconEdit size={13} />
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
                                        onClick={() => setConfirmDeleteId(payment.id)}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40"
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
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <button className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setShowCreate(false)} />
                    <div
                        className="relative w-full max-w-md rounded-2xl border p-5 max-h-[90vh] overflow-y-auto"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Registrar cobro</h2>
                            <button
                                onClick={() => setShowCreate(false)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            >
                                <IconX size={14} />
                            </button>
                        </div>

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
                                        <option value="">— Seleccionar —</option>
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
                                        <option value="">— Sin cita asociada —</option>
                                        {appointments
                                            .filter((a) => !form.clientId || a.clientId === form.clientId)
                                            .map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {new Date(a.startsAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                                    {' — '}
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
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Método de pago</label>
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
                                    placeholder="Ej: sesión 3, abono"
                                    value={form.notes}
                                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                                    className="field-input"
                                />
                            </div>

                            {createError && (
                                <p className="text-sm" style={{ color: '#dc2626' }}>{createError}</p>
                            )}

                            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
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
                        </div>
                    </div>
                </div>
            )}

            {/* Edit payment modal */}
            {editingPayment && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <button className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setEditingPayment(null)} />
                    <div
                        className="relative w-full max-w-sm rounded-2xl border p-5"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold" style={{ color: 'var(--fg)' }}>Editar cobro</h2>
                            <button
                                onClick={() => setEditingPayment(null)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle)"
                                style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            >
                                <IconX size={14} />
                            </button>
                        </div>
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
                                <label className="text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>Método</label>
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
                                    placeholder="Ej: sesión 3, abono"
                                    className="field-input"
                                />
                            </div>
                            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
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
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
