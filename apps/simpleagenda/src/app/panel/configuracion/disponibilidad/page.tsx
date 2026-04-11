'use client';

import { useEffect, useState } from 'react';
import { IconLoader2, IconPlus, IconTrash, IconCalendarOff, IconAlertCircle, IconChevronRight } from '@tabler/icons-react';
import Link from 'next/link';
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

// Local draft state per rule
type RuleDraft = {
    startTime: string;
    endTime: string;
    breakStart: string;
    breakEnd: string;
};

export default function DisponibilidadConfigPage() {
    const [rules, setRules] = useState<AvailabilityRule[]>([]);
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({});
    const [saving, setSaving] = useState<string | null>(null);
    const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [addingDay, setAddingDay] = useState(false);
    const [loadingDefault, setLoadingDefault] = useState(false);
    const [defaultError, setDefaultError] = useState('');

    // Blocked slot form
    const [showBlockedForm, setShowBlockedForm] = useState(false);
    const [blockStartDate, setBlockStartDate] = useState('');
    const [blockEndDate, setBlockEndDate] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [blockSaving, setBlockSaving] = useState(false);
    const [blockError, setBlockError] = useState('');
    const [deletingBlock, setDeletingBlock] = useState<string | null>(null);

    useEffect(() => { void load(); }, []);

    const load = async () => {
        setLoading(true);
        setLoadError('');
        try {
            const data = await fetchAgendaAvailability();
            const sorted = data.rules.slice().sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek));
            setRules(sorted);
            setBlockedSlots(data.blockedSlots.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
            // Initialize drafts from loaded rules
            const init: Record<string, RuleDraft> = {};
            for (const r of sorted) {
                init[r.id] = { startTime: r.startTime, endTime: r.endTime, breakStart: r.breakStart ?? '', breakEnd: r.breakEnd ?? '' };
            }
            setDrafts(init);
        } catch {
            setLoadError('No se pudo cargar la disponibilidad. Verifica tu conexión e intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const setDraft = (id: string, field: keyof RuleDraft, value: string) => {
        setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
        // Clear error when user edits
        setRuleErrors((prev) => {
            if (!(id in prev)) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const isDirty = (rule: AvailabilityRule) => {
        const d = drafts[rule.id];
        if (!d) return false;
        return (
            d.startTime !== rule.startTime ||
            d.endTime !== rule.endTime ||
            d.breakStart !== (rule.breakStart ?? '') ||
            d.breakEnd !== (rule.breakEnd ?? '')
        );
    };

    const handleToggle = async (rule: AvailabilityRule) => {
        const next = !rule.isActive;
        setTogglingId(rule.id);
        setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: next } : r));
        const result = await updateAvailabilityRule(rule.id, { isActive: next });
        setTogglingId(null);
        if (!result.ok) {
            setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, isActive: !next } : r));
            setRuleErrors((prev) => ({ ...prev, [rule.id]: result.error ?? 'No se pudo guardar.' }));
        }
    };

    const handleSave = async (rule: AvailabilityRule) => {
        const d = drafts[rule.id];
        if (!d) return;

        if (d.endTime <= d.startTime) {
            setRuleErrors((prev) => ({ ...prev, [rule.id]: 'La hora de fin debe ser posterior al inicio.' }));
            return;
        }
        if (d.breakStart && d.breakEnd && d.breakEnd <= d.breakStart) {
            setRuleErrors((prev) => ({ ...prev, [rule.id]: 'La hora de fin de pausa debe ser posterior al inicio.' }));
            return;
        }

        setSaving(rule.id);
        const result = await updateAvailabilityRule(rule.id, {
            startTime: d.startTime,
            endTime: d.endTime,
            breakStart: d.breakStart || null,
            breakEnd: d.breakEnd || null,
        });
        setSaving(null);

        if (!result.ok) {
            setRuleErrors((prev) => ({ ...prev, [rule.id]: result.error ?? 'No se pudo guardar.' }));
            return;
        }
        // Sync rule with saved values
        setRules((prev) => prev.map((r) => r.id === rule.id ? {
            ...r,
            startTime: d.startTime,
            endTime: d.endTime,
            breakStart: d.breakStart || null,
            breakEnd: d.breakEnd || null,
        } : r));
    };

    const handleDelete = async (id: string) => {
        setDeleting(id);
        await deleteAvailabilityRule(id);
        setRules((prev) => prev.filter((r) => r.id !== id));
        setDrafts((prev) => { const next = { ...prev }; delete next[id]; return next; });
        setDeleting(null);
    };

    const handleAddDay = async (dayOfWeek: number) => {
        setAddingDay(true);
        setDefaultError('');
        try {
            const result = await createAvailabilityRule({
                dayOfWeek,
                startTime: '09:00',
                endTime: '18:00',
                breakStart: '13:00',
                breakEnd: '14:00',
                isActive: true,
            });
            if (result.ok && result.rule) {
                const r = result.rule;
                setRules((prev) => [...prev, r].sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek)));
                setDrafts((prev) => ({ ...prev, [r.id]: { startTime: r.startTime, endTime: r.endTime, breakStart: r.breakStart ?? '', breakEnd: r.breakEnd ?? '' } }));
            } else if (!result.ok) {
                setDefaultError(result.error ?? 'No se pudo agregar el día. ¿Configuraste tu perfil primero?');
            }
        } catch {
            setDefaultError('Error de conexión al agregar el día.');
        } finally {
            setAddingDay(false);
        }
    };

    const handleLoadDefaults = async () => {
        setLoadingDefault(true);
        setDefaultError('');
        try {
            for (const rule of DEFAULT_WEEK) {
                const result = await createAvailabilityRule(rule);
                if (!result.ok) {
                    setDefaultError(result.error ?? 'No se pudo crear el horario. ¿Configuraste tu perfil primero?');
                    setLoadingDefault(false);
                    return;
                }
            }
            await load();
        } catch {
            setDefaultError('Error de conexión al cargar el horario típico.');
        } finally {
            setLoadingDefault(false);
        }
    };

    const handleAddBlockedSlot = async () => {
        setBlockError('');
        if (!blockStartDate || !blockEndDate) { setBlockError('Selecciona las fechas de inicio y fin.'); return; }
        if (blockEndDate < blockStartDate) { setBlockError('La fecha de fin debe ser igual o posterior a la de inicio.'); return; }
        setBlockSaving(true);
        const startsAt = new Date(`${blockStartDate}T00:00:00`).toISOString();
        const endsAt = new Date(`${blockEndDate}T23:59:59`).toISOString();
        const result = await createBlockedSlot({ startsAt, endsAt, reason: blockReason || undefined });
        setBlockSaving(false);
        if (!result.ok) { setBlockError(result.error ?? 'Error al guardar el bloqueo.'); return; }
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

    if (loadError) {
        return (
            <div className="container-app panel-page py-8 max-w-2xl">
                <PanelPageHeader backHref="/panel/configuracion" title="Disponibilidad" />
                <div className="rounded-2xl border px-5 py-4 text-sm flex items-center gap-3" style={{ borderColor: 'rgba(185,28,28,0.20)', background: 'rgba(185,28,28,0.06)', color: '#b91c1c' }}>
                    <IconAlertCircle size={16} className="shrink-0" />
                    <div>
                        <p className="font-medium">{loadError}</p>
                        <button type="button" className="underline text-xs mt-1 opacity-80 hover:opacity-100" onClick={() => void load()}>
                            Reintentar
                        </button>
                    </div>
                </div>
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

            {defaultError && (
                <div className="mb-4 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2" style={{ borderColor: 'rgba(185,28,28,0.20)', background: 'rgba(185,28,28,0.06)', color: '#b91c1c' }}>
                    <IconAlertCircle size={15} className="shrink-0" />
                    {defaultError}
                </div>
            )}

            {/* Horarios semanales */}
            <div className="flex flex-col gap-3 mb-6">
                {rules.length === 0 ? (
                    <PanelEmptyState
                        title="Sin horarios configurados"
                        description="Agrega un día o carga el horario típico para empezar a recibir reservas."
                    />
                ) : (
                    rules.map((rule) => {
                        const d = drafts[rule.id] ?? { startTime: rule.startTime, endTime: rule.endTime, breakStart: rule.breakStart ?? '', breakEnd: rule.breakEnd ?? '' };
                        const dayLabel = DAYS.find((day) => day.value === rule.dayOfWeek)?.label ?? `Día ${rule.dayOfWeek}`;
                        const isSaving = saving === rule.id;
                        const isToggling = togglingId === rule.id;
                        const isDeleting = deleting === rule.id;
                        const dirty = isDirty(rule);
                        const timeError = ruleErrors[rule.id] ?? null;

                        return (
                            <PanelCard key={rule.id} size="sm" className={rule.isActive ? '' : 'opacity-60'}>
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        {isToggling ? (
                                            <IconLoader2 size={14} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                        ) : (
                                            <PanelSwitch
                                                checked={rule.isActive}
                                                onChange={() => void handleToggle(rule)}
                                                size="sm"
                                                ariaLabel={rule.isActive ? 'Desactivar día' : 'Activar día'}
                                            />
                                        )}
                                        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{dayLabel}</span>
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
                                        <select value={d.startTime} onChange={(e) => setDraft(rule.id, 'startTime', e.target.value)} className="form-select">
                                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </PanelField>
                                    <PanelField label="Fin">
                                        <select value={d.endTime} onChange={(e) => setDraft(rule.id, 'endTime', e.target.value)} className="form-select">
                                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </PanelField>
                                    <PanelField label="Pausa inicio">
                                        <select value={d.breakStart} onChange={(e) => setDraft(rule.id, 'breakStart', e.target.value)} className="form-select">
                                            <option value="">Sin pausa</option>
                                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </PanelField>
                                    <PanelField label="Pausa fin">
                                        <select value={d.breakEnd} onChange={(e) => setDraft(rule.id, 'breakEnd', e.target.value)} className="form-select">
                                            <option value="">—</option>
                                            {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </PanelField>
                                </div>

                                {timeError && (
                                    <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>{timeError}</p>
                                )}

                                {dirty && (
                                    <div className="mt-3 flex justify-end">
                                        <PanelButton
                                            variant="accent"
                                            size="sm"
                                            onClick={() => void handleSave(rule)}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <IconLoader2 size={13} className="animate-spin" /> : null}
                                            {isSaving ? 'Guardando...' : 'Guardar'}
                                        </PanelButton>
                                    </div>
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
                            disabled={addingDay}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-colors hover:border-[--accent] hover:text-[--accent] disabled:opacity-50"
                            style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                        >
                            <IconPlus size={13} />
                            {day.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Días bloqueados */}
            <PanelBlockHeader
                title="Días bloqueados"
                description="Vacaciones, feriados o días libres en los que no aceptas reservas."
                actions={
                    !showBlockedForm ? (
                        <PanelButton variant="secondary" size="sm" onClick={() => setShowBlockedForm(true)}>
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
                                    <input type="date" value={blockStartDate} onChange={(e) => setBlockStartDate(e.target.value)} className="form-input" />
                                </PanelField>
                                <PanelField label="Hasta" required>
                                    <input type="date" value={blockEndDate} onChange={(e) => setBlockEndDate(e.target.value)} className="form-input" />
                                </PanelField>
                            </div>
                            <PanelField label="Motivo" hint="Opcional, solo para tu referencia.">
                                <input type="text" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Ej: Vacaciones, congreso, feriado" className="form-input" />
                            </PanelField>
                            {blockError && <p className="text-xs" style={{ color: '#dc2626' }}>{blockError}</p>}
                            <div className="flex gap-3">
                                <PanelButton variant="accent" onClick={() => void handleAddBlockedSlot()} disabled={blockSaving}>
                                    {blockSaving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                    {blockSaving ? 'Guardando...' : 'Bloquear'}
                                </PanelButton>
                                <PanelButton variant="secondary" onClick={() => { setShowBlockedForm(false); setBlockStartDate(''); setBlockEndDate(''); setBlockReason(''); setBlockError(''); }}>
                                    Cancelar
                                </PanelButton>
                            </div>
                        </div>
                    </PanelCard>
                </div>
            )}

            {blockedSlots.length === 0 && !showBlockedForm ? (
                <PanelEmptyState title="Sin bloqueos activos" description="Todos tus horarios de la semana están disponibles." />
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
                                        {slot.reason && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{slot.reason}</p>}
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
