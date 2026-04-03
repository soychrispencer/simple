'use client';

import { useEffect, useRef, useState } from 'react';
import { IconLoader2, IconPlus, IconTrash, IconCheck } from '@tabler/icons-react';
import {
    fetchAgendaAvailability,
    createAvailabilityRule,
    updateAvailabilityRule,
    deleteAvailabilityRule,
    type AvailabilityRule,
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

export default function DisponibilidadConfigPage() {
    const [rules, setRules] = useState<AvailabilityRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null); // id or 'new'
    const [autoSaved, setAutoSaved] = useState<string | null>(null); // id of last auto-saved rule
    const [deleting, setDeleting] = useState<string | null>(null);
    const [loadingDefault, setLoadingDefault] = useState(false);
    const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    useEffect(() => { void load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchAgendaAvailability();
        setRules(data.rules);
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

        // Debounce auto-save: 800ms after last change on this rule
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

    const handleSaveRule = async (rule: AvailabilityRule) => {
        clearTimeout(debounceTimers.current[rule.id]);
        setSaving(rule.id);
        await updateAvailabilityRule(rule.id, {
            startTime: rule.startTime,
            endTime: rule.endTime,
            breakStart: rule.breakStart ?? null,
            breakEnd: rule.breakEnd ?? null,
        });
        setSaving(null);
        setAutoSaved(rule.id);
        setTimeout(() => setAutoSaved((prev) => prev === rule.id ? null : prev), 1500);
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
            setRules((prev) => [...prev, result.rule!].sort((a, b) => {
                const order = [1, 2, 3, 4, 5, 6, 0];
                return order.indexOf(a.dayOfWeek) - order.indexOf(b.dayOfWeek);
            }));
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
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--fg)' }}>Disponibilidad</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                        Define tus horarios semanales de atención.
                    </p>
                </div>
                {rules.length === 0 && (
                    <button
                        onClick={() => void handleLoadDefaults()}
                        disabled={loadingDefault}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-(--bg-subtle) disabled:opacity-60"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg-secondary)' }}
                    >
                        {loadingDefault ? <IconLoader2 size={14} className="animate-spin" /> : null}
                        Cargar horario típico
                    </button>
                )}
            </div>

            {/* Rules */}
            <div className="flex flex-col gap-3 mb-6">
                {rules.length === 0 ? (
                    <div className="rounded-2xl border py-12 text-center" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                            Sin horarios configurados. Agrega un día o carga el horario típico.
                        </p>
                    </div>
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
                            <div
                                key={rule.id}
                                className="rounded-2xl border p-4"
                                style={{
                                    borderColor: timeError ? '#dc262640' : rule.isActive ? 'var(--accent-border)' : 'var(--border)',
                                    background: rule.isActive ? 'var(--accent-soft)' : 'var(--surface)',
                                    opacity: rule.isActive ? 1 : 0.6,
                                }}
                            >
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => void handleToggle(rule)}
                                            className="relative w-9 h-5 rounded-full transition-colors"
                                            style={{ background: rule.isActive ? 'var(--accent)' : 'var(--border)' }}
                                        >
                                            <span
                                                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                                                style={{ transform: rule.isActive ? 'translateX(16px)' : 'translateX(0)' }}
                                            />
                                        </button>
                                        <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{dayLabel}</span>
                                        {isSaving && <IconLoader2 size={12} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />}
                                        {!isSaving && isAutoSaved && <IconCheck size={12} style={{ color: 'var(--accent)' }} />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => void handleSaveRule(rule)}
                                            disabled={isSaving || !!timeError}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-(--bg-subtle) disabled:opacity-50"
                                            style={{ borderColor: 'var(--border)', color: 'var(--accent)' }}
                                            title="Guardar"
                                        >
                                            {isSaving ? <IconLoader2 size={13} className="animate-spin" /> : <IconCheck size={13} />}
                                        </button>
                                        <button
                                            onClick={() => void handleDelete(rule.id)}
                                            disabled={isDeleting}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center border transition-colors hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50"
                                            style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        >
                                            {isDeleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <label className="text-xs block mb-1" style={{ color: 'var(--fg-muted)' }}>Inicio</label>
                                        <select
                                            value={rule.startTime}
                                            onChange={(e) => handleChange(rule, 'startTime', e.target.value)}
                                            className="field-input"
                                        >
                                            {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs block mb-1" style={{ color: 'var(--fg-muted)' }}>Fin</label>
                                        <select
                                            value={rule.endTime}
                                            onChange={(e) => handleChange(rule, 'endTime', e.target.value)}
                                            className="field-input"
                                        >
                                            {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs block mb-1" style={{ color: 'var(--fg-muted)' }}>Pausa inicio</label>
                                        <select
                                            value={rule.breakStart ?? ''}
                                            onChange={(e) => handleChange(rule, 'breakStart', e.target.value)}
                                            className="field-input"
                                        >
                                            <option value="">Sin pausa</option>
                                            {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs block mb-1" style={{ color: 'var(--fg-muted)' }}>Pausa fin</label>
                                        <select
                                            value={rule.breakEnd ?? ''}
                                            onChange={(e) => handleChange(rule, 'breakEnd', e.target.value)}
                                            className="field-input"
                                        >
                                            <option value="">—</option>
                                            {TIME_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {timeError && (
                                    <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>{timeError}</p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add day */}
            {availableDays.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {availableDays.map((day) => (
                        <button
                            key={day.value}
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

            <style>{`
                .field-input {
                    width: 100%;
                    padding: 0.375rem 0.5rem;
                    border-radius: 0.5rem;
                    border: 1px solid var(--border);
                    background: var(--bg);
                    color: var(--fg);
                    font-size: 0.8125rem;
                    outline: none;
                }
                .field-input:focus { border-color: var(--accent); }
            `}</style>
        </div>
    );
}
