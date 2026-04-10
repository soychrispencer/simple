'use client';

import { useEffect, useRef, useState } from 'react';
import { IconLoader2, IconPlus, IconTrash, IconCheck, IconCalendarOff } from '@tabler/icons-react';
import {
    PanelCard,
    PanelField,
    PanelButton,
    PanelSwitch,
    PanelPageHeader,
    PanelBlockHeader,
    PanelEmptyState,
} from '@simple/ui';
import {
    fetchAgendaAvailability,
    createAvailabilityRule,
    updateAvailabilityRule,
    deleteAvailabilityRule,
    createBlockedSlot,
    deleteBlockedSlot,
    type AvailabilityRule,
    type BlockedSlot,
} from '@/lib/agenda-api';

const DAYS = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
];

const TIME_OPTIONS: string[] = [];
for (let h = 7; h <= 22; h++) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 22) TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:30`);
}

// Default week template: Mon-Fri 9:00-18:00 with 13:00-14:00 break
const DEFAULT_WEEK = [1, 2, 3, 4, 5].map((day) => ({
    dayOfWeek: day,
    startTime: '09:00',
    endTime: '18:00',
    breakStart: '13:00',
    breakEnd: '14:00',
    isActive: true,
}));

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function formatDateRange(startsAt: string, endsAt: string) {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const sameDay = start.toDateString() === end.toDateString();
    const dateFmt = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    if (sameDay) return dateFmt.format(start);
    return `${dateFmt.format(start)} — ${dateFmt.format(end)}`;
}

export default function DisponibilidadConfigPage() {
    const [rules, setRules] = useState<AvailabilityRule[]>([]);
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [autoSaved, setAutoSaved] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [loadingDefault, setLoadingDefault] = useState(false);

    // Blocked slot form
    const [showBlockedForm, setShowBlockedForm] = useState(false);
    const [blockStartDate, setBlockStartDate] = useState('');
    const [blockEndDate, setBlockEndDate] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [blockSaving, setBlockSaving] = useState(false);
    const [blockError, setBlockError] = useState('');
    const [deletingBlock, setDeletingBlock] = useState<string | null>(null);

    const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => { void load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchAgendaAvailability();
        setRules(data.rules.slice().sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)));
        setBlockedSlots(data.blockedSlots.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        setLoading(false);
    };

    const handleToggle = async (rule: AvailabilityRule) => {
        setSaving(rule.id);
        await updateAvailabilityRule(rule.id, { isActive: !rule.isActive });
        setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
        setSaving(null);
    };

    const handleChange = (rule: AvailabilityRule, field: keyof AvailabilityRule, value: string) => {
        const updated = { ...rule, [field]: value || null };
        setRules((prev) => prev.map((r) => r.id === rule.id ? updated : r));

        clearTimeout(debounceTimers.current[rule.id]);
        debounceTimers.current[rule.id] = setTimeout(() => {
            setSaving(rule.id);
            void updateAvailabilityRule(rule.id, {
                startTime: updated.startTime,
                endTime: updated.endTime,
                breakStart: updated.breakStart ?? null,
                breakEnd: updated.breakEnd ?? null,
            }).then(() => {
                setSaving(null);
                setAutoSaved(rule.id);
                setTimeout(() => setAutoSaved((prev) => prev === rule.id ? null : prev), 1500);
            });
        }, 800);
    };

    const handleDelete = async (id: string) => {
        setDeleting(id);
        await deleteAvailabilityRule(id);
        setRules((prev) => prev.filter((r) => r.id !== id));
        setDeleting(null);
    };

    const handleAddDay = async (dayOfWeek: number) => {
        setSaving('new');
        const result = await createAvailabilityRule({
            dayOfWeek,
            startTime: '09:00',
            endTime: '18:00',
            breakStart: '13:00',
            breakEnd: '14:00',
            isActive: true,
        });
        if (result.ok && result.rule) {
            setRules((prev) => [...prev, result.rule!].sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)));
        }
        setSaving(null);
    };

    const handleLoadDefaults = async () => {
        setLoadingDefault(true);
        for (const rule of DEFAULT_WEEK) {
            await createAvailabilityRule(rule);
        }
        await load();
        setLoadingDefault(false);
    };

    const handleAddBlockedSlot = async () => {
        setBlockError('');
        if (!blockStartDate || !blockEndDate) {
            setBlockError('Selecciona las fechas de inicio y fin.');
            return;
        }
        if (blockEndDate < blockStartDate) {
            setBlockError('La fecha de fin debe ser igual o posterior a la de inicio.');
            return;
        }
        setBlockSaving(true);
        const startsAt = new Date(`${blockStartDate}T00:00:00`).toISOString();
        const endsAt = new Date(`${blockEndDate}T23:59:59`).toISOString();
        const result = await createBlockedSlot({
            startsAt,
            endsAt,
            reason: blockReason || undefined,
        });
        setBlockSaving(false);
        if (!result.ok) {
            setBlockError(result.error ?? 'Error al guardar el bloqueo.');
            return;
        }
        if (result.slot) {
            setBlockedSlots((prev) => [...prev, result.slot!].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        }
        setBlockStartDate('');
        setBlockEndDate('');
        setBlockReason('');
        setShowBlockedForm(false);
    };

    const handleDeleteBlockedSlot = async (id: string) => {
        setDeletingBlock(id);
        await deleteBlockedSlot(id);
        setBlockedSlots((prev) => prev.filter((s) => s.id !== id));
        setDeletingBlock(null);
    };

    const configuredDays = new Set(rules.map((r) => r.dayOfWeek));
    const availableDays = DAYS.filter((d) => !configuredDays.has(d.value));

    if (loading) {
        return (
            <div className="container-app panel-page py-8 flex items-center gap-2 text-sm" style={{ color: 'var(--fg-muted)' }}>
                <IconLoader2 size={16} className="animate-spin" /> Cargando disponibilidad...
            </div>
        );
    }

    return (
        <div className="container-app panel-page py-8 max-w-2xl">
            <PanelPageHeader
                backHref="/panel/configuracion"
                title="Disponibilidad"
                description="Define tus horarios semanales de atención y bloquea días de descanso."
                actions={
                    rules.length === 0 ? (
                        <PanelButton
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleLoadDefaults()}
                            disabled={loadingDefault}
                        >
                            {loadingDefault ? <IconLoader2 size={14} className="animate-spin" /> : null}
                            Cargar horario típico
                        </PanelButton>
                    ) : null
                }
            />

            {/* Horarios semanales */}
            <div className="flex flex-col gap-3 mb-6">
                {rules.length === 0 ? (
                    <PanelEmptyState
                        title="Sin horarios configurados"
                        description="Agrega un día o carga el horario típico para empezar a recibir reservas."
                    />
                ) : (
                    rules.map((rule) => {
                        const dayLabel = DAYS.find((d) => d.value === rule.dayOfWeek)?.label ?? `Día ${rule.dayOfWeek}`;
                        const isSaving = saving === rule.id;
                        const isDeleting = deleting === rule.id;
                        const isAutoSaved = autoSaved === rule.id;
                        const timeError = rule.endTime <= rule.startTime
                            ? 'La hora de fin debe ser posterior al inicio.'
                            : (rule.breakStart && rule.breakEnd && rule.breakEnd <= rule.breakStart)
                                ? 'La pausa fin debe ser posterior al inicio de pausa.'
                                : null;

                        return (
                            <PanelCard
                                key={rule.id}
                                size="sm"
                                className={rule.isActive ? '' : 'opacity-60'}
                            >
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <PanelSwitch
                                            checked={rule.isActive}
                                            onChange={() => void handleToggle(rule)}
                                            size="sm"
                                            ariaLabel={rule.isActive ? 'Desactivar día' : 'Activar día'}
                                        />
                                        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{dayLabel}</span>
                                        {isSaving && <IconLoader2 size={12} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />}
                                        {!isSaving && isAutoSaved && <IconCheck size={12} style={{ color: 'var(--accent)' }} />}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleDelete(rule.id)}
                                        disabled={isDeleting}
                                        aria-label="Eliminar día"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        {isDeleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <PanelField label="Inicio">
                                        <select
                                            value={rule.startTime}
                                            onChange={(e) => handleChange(rule, 'startTime', e.target.value)}
                                            className="form-select"
                                        >
                                            {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </PanelField>
                                    <PanelField label="Fin">
                                        <select
                                            value={rule.endTime}
                                            onChange={(e) => handleChange(rule, 'endTime', e.target.value)}
                                            className="form-select"
                                        >
                                            {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </PanelField>
                                    <PanelField label="Pausa inicio">
                                        <select
                                            value={rule.breakStart ?? ''}
                                            onChange={(e) => handleChange(rule, 'breakStart', e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="">Sin pausa</option>
                                            {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </PanelField>
                                    <PanelField label="Pausa fin">
                                        <select
                                            value={rule.breakEnd ?? ''}
                                            onChange={(e) => handleChange(rule, 'breakEnd', e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="">—</option>
                                            {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </PanelField>
                                </div>
                                {timeError && (
                                    <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>{timeError}</p>
                                )}
                            </PanelCard>
                        );
                    })
                )}
            </div>

            {/* Add day buttons */}
            {availableDays.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-10">
                    {availableDays.map((day) => (
                        <button
                            key={day.value}
                            type="button"
                            onClick={() => void handleAddDay(day.value)}
                            disabled={saving === 'new'}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-colors hover:border-[--accent] hover:text-[--accent] disabled:opacity-50"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            <IconPlus size={13} />
                            {day.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Bloqueos de tiempo */}
            <PanelBlockHeader
                title="Días bloqueados"
                description="Vacaciones, feriados o días libres en los que no aceptas reservas."
                actions={
                    !showBlockedForm ? (
                        <PanelButton
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowBlockedForm(true)}
                        >
                            <IconPlus size={14} /> Bloquear fechas
                        </PanelButton>
                    ) : null
                }
            />

            {showBlockedForm && (
                <div className="mb-4">
                    <PanelCard size="md" className="border-[--accent]">
                        <div className="flex flex-col gap-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <PanelField label="Desde" required>
                                    <input
                                        type="date"
                                        value={blockStartDate}
                                        onChange={(e) => setBlockStartDate(e.target.value)}
                                        className="form-input"
                                    />
                                </PanelField>
                                <PanelField label="Hasta" required>
                                    <input
                                        type="date"
                                        value={blockEndDate}
                                        onChange={(e) => setBlockEndDate(e.target.value)}
                                        className="form-input"
                                    />
                                </PanelField>
                            </div>
                            <PanelField label="Motivo" hint="Opcional, solo para tu referencia.">
                                <input
                                    type="text"
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    placeholder="Ej: Vacaciones, congreso, feriado"
                                    className="form-input"
                                />
                            </PanelField>
                            {blockError && (
                                <p className="text-xs" style={{ color: '#dc2626' }}>{blockError}</p>
                            )}
                            <div className="flex gap-3">
                                <PanelButton
                                    variant="accent"
                                    onClick={() => void handleAddBlockedSlot()}
                                    disabled={blockSaving}
                                >
                                    {blockSaving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                    {blockSaving ? 'Guardando...' : 'Bloquear'}
                                </PanelButton>
                                <PanelButton
                                    variant="secondary"
                                    onClick={() => {
                                        setShowBlockedForm(false);
                                        setBlockStartDate('');
                                        setBlockEndDate('');
                                        setBlockReason('');
                                        setBlockError('');
                                    }}
                                >
                                    Cancelar
                                </PanelButton>
                            </div>
                        </div>
                    </PanelCard>
                </div>
            )}

            {blockedSlots.length === 0 && !showBlockedForm ? (
                <PanelEmptyState
                    title="Sin bloqueos activos"
                    description="Todos tus horarios de la semana están disponibles."
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {blockedSlots.map((slot) => {
                        const isDeletingThis = deletingBlock === slot.id;
                        return (
                            <PanelCard key={slot.id} size="sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--bg-muted)', color: 'var(--fg-muted)' }}>
                                        <IconCalendarOff size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                            {formatDateRange(slot.startsAt, slot.endsAt)}
                                        </p>
                                        {slot.reason && (
                                            <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{slot.reason}</p>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleDeleteBlockedSlot(slot.id)}
                                        disabled={isDeletingThis}
                                        aria-label="Quitar bloqueo"
                                        className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
                                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        {isDeletingThis ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                    </button>
                                </div>
                            </PanelCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
