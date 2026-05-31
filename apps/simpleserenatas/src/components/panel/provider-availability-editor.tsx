'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconAlertCircle, IconCalendarOff, IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react';
import { PanelBlockHeader } from '@simple/ui/panel';
import { PanelButton, PanelCard, PanelEmptyState, PanelField, PanelIconButton, PanelSwitch } from '@simple/ui/panel';
import {
    serenatasApi,
    type ProviderGroup,
    type ProviderGroupAvailabilityRule,
    type ProviderGroupBlockedSlot,
} from '@/lib/serenatas-api';
import { FieldDate, FieldSelect } from '@/components/panel/shared';
import { formatBlockedSlotRange } from '@/lib/provider-availability-display';

const DAYS = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
] as const;

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const TIME_OPTIONS: string[] = [];
for (let h = 0; h <= 23; h++) {
    for (const minutes of [0, 15, 30, 45]) {
        TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
    }
}

const TIME_SELECT_OPTIONS = TIME_OPTIONS.map((time) => ({ value: time, label: time }));

const DEFAULT_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '23:00',
    isActive: true,
}));

type RuleRow = ProviderGroupAvailabilityRule & { isActive: boolean };

type RuleDraft = {
    startTime: string;
    endTime: string;
};

function ruleKey(rule: RuleRow) {
    return rule.id ?? `day-${rule.dayOfWeek}`;
}

function sortRules(rules: RuleRow[]) {
    return rules.slice().sort(
        (a, b) => DAY_ORDER.indexOf(a.dayOfWeek as (typeof DAY_ORDER)[number])
            - DAY_ORDER.indexOf(b.dayOfWeek as (typeof DAY_ORDER)[number]),
    );
}

function mapRulesPayload(rules: RuleRow[]) {
    return rules.map((rule) => ({
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime,
        endTime: rule.endTime,
        isActive: rule.isActive,
    }));
}

function mergeDraftsIntoRules(rules: RuleRow[], drafts: Record<string, RuleDraft>) {
    return rules.map((rule) => {
        const draft = drafts[ruleKey(rule)];
        if (!draft) return rule;
        return { ...rule, startTime: draft.startTime, endTime: draft.endTime };
    });
}

function rulesSnapshot(rules: RuleRow[]) {
    return JSON.stringify(mapRulesPayload(sortRules(rules)));
}

export function ProviderAvailabilityEditor({ group }: { group: ProviderGroup }) {
    const [rules, setRules] = useState<RuleRow[]>([]);
    const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({});
    const [savedRulesSnapshot, setSavedRulesSnapshot] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [defaultError, setDefaultError] = useState('');
    const [weeklySaving, setWeeklySaving] = useState(false);
    const [weeklyStatus, setWeeklyStatus] = useState('');
    const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});
    const [blockedSlots, setBlockedSlots] = useState<ProviderGroupBlockedSlot[]>([]);
    const [showBlockedForm, setShowBlockedForm] = useState(false);
    const [blockMode, setBlockMode] = useState<'fullDay' | 'hours'>('fullDay');
    const [blockStartDate, setBlockStartDate] = useState('');
    const [blockEndDate, setBlockEndDate] = useState('');
    const [blockStartTime, setBlockStartTime] = useState('09:00');
    const [blockEndTime, setBlockEndTime] = useState('10:00');
    const [blockReason, setBlockReason] = useState('');
    const [blockSaving, setBlockSaving] = useState(false);
    const [blockError, setBlockError] = useState('');
    const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setLoadError('');
        const response = await serenatasApi.providerGroupAvailability(group.id);
        if (!response.ok || !response.item) {
            setLoadError(response.error ?? 'No se pudo cargar la disponibilidad.');
            setLoading(false);
            return;
        }
        const persisted = response.item.rules.some((rule) => rule.id);
        const sorted = persisted
            ? sortRules(
                response.item.rules.map((rule) => ({
                    ...rule,
                    isActive: rule.isActive ?? true,
                })),
            )
            : [];
        setRules(sorted);
        const init: Record<string, RuleDraft> = {};
        for (const rule of sorted) {
            init[ruleKey(rule)] = { startTime: rule.startTime, endTime: rule.endTime };
        }
        setDrafts(init);
        setSavedRulesSnapshot(rulesSnapshot(sorted));
        setWeeklyStatus('');
        setBlockedSlots((response.item.blockedSlots ?? []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        setLoading(false);
    };

    useEffect(() => {
        void load();
    }, [group.id]);

    const configuredDays = new Set(rules.map((rule) => rule.dayOfWeek));
    const availableDays = DAYS.filter((day) => !configuredDays.has(day.value));

    const setDraft = (key: string, field: keyof RuleDraft, value: string) => {
        setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
        setWeeklyStatus('');
        setRuleErrors((prev) => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const draftedRules = useMemo(() => mergeDraftsIntoRules(rules, drafts), [rules, drafts]);
    const weeklyDirty = useMemo(
        () => rulesSnapshot(draftedRules) !== savedRulesSnapshot,
        [draftedRules, savedRulesSnapshot],
    );

    async function persistRules(nextRules: RuleRow[]) {
        return serenatasApi.updateProviderGroupAvailability(group.id, {
            rules: mapRulesPayload(nextRules),
        });
    }

    const handleToggle = async (rule: RuleRow) => {
        const key = ruleKey(rule);
        const nextActive = !rule.isActive;
        const nextRules = rules.map((entry) => (
            ruleKey(entry) === key ? { ...entry, isActive: nextActive } : entry
        ));
        setRules(nextRules);
        setWeeklyStatus('');
    };

    const handleSaveWeeklyRules = async () => {
        const nextErrors: Record<string, string> = {};
        for (const rule of draftedRules) {
            if (rule.endTime <= rule.startTime) {
                nextErrors[ruleKey(rule)] = 'La hora de fin debe ser posterior al inicio.';
            }
        }
        setRuleErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setWeeklySaving(true);
        setWeeklyStatus('');
        const response = await persistRules(draftedRules);
        setWeeklySaving(false);
        if (!response.ok) {
            setWeeklyStatus(response.error ?? 'No se pudo guardar la disponibilidad.');
            return;
        }
        const savedRules = sortRules(draftedRules);
        setRules(savedRules);
        const nextDrafts: Record<string, RuleDraft> = {};
        for (const rule of savedRules) {
            nextDrafts[ruleKey(rule)] = { startTime: rule.startTime, endTime: rule.endTime };
        }
        setDrafts(nextDrafts);
        setSavedRulesSnapshot(rulesSnapshot(savedRules));
        setWeeklyStatus('Guardado');
    };

    const handleDelete = async (rule: RuleRow) => {
        const key = ruleKey(rule);
        const nextRules = rules.filter((entry) => ruleKey(entry) !== key);
        setRules(nextRules);
        setDrafts((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setWeeklyStatus('');
    };

    const handleAddDay = async (dayOfWeek: number) => {
        setDefaultError('');
        const nextRules = sortRules([
            ...rules,
            { dayOfWeek, startTime: '09:00', endTime: '23:00', isActive: true },
        ]);
        setRules(nextRules);
        setDrafts((prev) => ({
            ...prev,
            [`day-${dayOfWeek}`]: { startTime: '09:00', endTime: '23:00' },
        }));
        setWeeklyStatus('');
    };

    const handleLoadDefaults = async () => {
        setDefaultError('');
        const nextRules = sortRules(
            DEFAULT_WEEK.map((rule) => ({ ...rule, id: undefined, providerGroupId: group.id })),
        );
        const nextDrafts: Record<string, RuleDraft> = {};
        for (const rule of nextRules) {
            nextDrafts[ruleKey(rule)] = { startTime: rule.startTime, endTime: rule.endTime };
        }
        setRules(nextRules);
        setDrafts(nextDrafts);
        setWeeklyStatus('');
    };

    const resetBlockedForm = () => {
        setShowBlockedForm(false);
        setBlockStartDate('');
        setBlockEndDate('');
        setBlockStartTime('09:00');
        setBlockEndTime('10:00');
        setBlockReason('');
        setBlockError('');
    };

    const handleAddBlockedSlot = async () => {
        setBlockError('');
        let startsAtIso: string;
        let endsAtIso: string;

        if (blockMode === 'fullDay') {
            if (!blockStartDate || !blockEndDate) {
                setBlockError('Selecciona las fechas de inicio y fin.');
                return;
            }
            if (blockEndDate < blockStartDate) {
                setBlockError('La fecha de fin debe ser igual o posterior a la de inicio.');
                return;
            }
            startsAtIso = new Date(`${blockStartDate}T00:00:00`).toISOString();
            endsAtIso = new Date(`${blockEndDate}T23:59:59`).toISOString();
        } else {
            if (!blockStartDate) {
                setBlockError('Selecciona la fecha del bloqueo.');
                return;
            }
            if (blockEndTime <= blockStartTime) {
                setBlockError('La hora de fin debe ser posterior a la de inicio.');
                return;
            }
            startsAtIso = new Date(`${blockStartDate}T${blockStartTime}:00`).toISOString();
            endsAtIso = new Date(`${blockStartDate}T${blockEndTime}:00`).toISOString();
        }

        setBlockSaving(true);
        const result = await serenatasApi.createProviderGroupBlockedSlot(group.id, {
            startsAt: startsAtIso,
            endsAt: endsAtIso,
            reason: blockReason || undefined,
        });
        setBlockSaving(false);
        if (!result.ok || !result.slot) {
            setBlockError(result.error ?? 'Error al guardar el bloqueo.');
            return;
        }
        setBlockedSlots((prev) => [...prev, result.slot!].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        resetBlockedForm();
    };

    const handleDeleteBlockedSlot = async (id: string) => {
        setDeletingBlockId(id);
        const result = await serenatasApi.deleteProviderGroupBlockedSlot(group.id, id);
        setDeletingBlockId(null);
        if (!result.ok) return;
        setBlockedSlots((prev) => prev.filter((slot) => slot.id !== id));
    };

    if (loading) {
        return (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" />
                Cargando disponibilidad…
            </p>
        );
    }

    if (loadError) {
        return (
            <div className="w-full rounded-2xl border px-4 py-3 text-sm flex items-center gap-2" style={{ borderColor: 'var(--danger-border, rgba(185,28,28,0.20))', background: 'var(--danger-soft, rgba(185,28,28,0.06))', color: 'var(--danger, #b91c1c)' }}>
                <IconAlertCircle size={15} className="shrink-0" />
                <div>
                    <p className="font-medium">{loadError}</p>
                    <button type="button" className="underline text-xs mt-1 opacity-80 hover:opacity-100" onClick={() => void load()}>
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-x-8 xl:gap-x-10">
            <section className="min-w-0">
            <PanelBlockHeader
                title="Disponibilidad"
                description="Horarios semanales para recibir solicitudes del marketplace."
                actions={
                    rules.length === 0 ? (
                        <PanelButton
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleLoadDefaults()}
                        >
                            Cargar horario típico
                        </PanelButton>
                    ) : null
                }
            />

            {defaultError ? (
                <div className="mb-4 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2" style={{ borderColor: 'var(--danger-border, rgba(185,28,28,0.20))', background: 'var(--danger-soft, rgba(185,28,28,0.06))', color: 'var(--danger, #b91c1c)' }}>
                    <IconAlertCircle size={15} className="shrink-0" />
                    {defaultError}
                </div>
            ) : null}

            <div className="flex w-full flex-col gap-2">
                {rules.length === 0 ? (
                    <PanelEmptyState
                        title="Sin horarios configurados"
                        description="Agrega un día o carga el horario típico para empezar a recibir solicitudes."
                    />
                ) : (
                    rules.map((rule) => {
                        const key = ruleKey(rule);
                        const draft = drafts[key] ?? { startTime: rule.startTime, endTime: rule.endTime };
                        const dayLabel = DAYS.find((day) => day.value === rule.dayOfWeek)?.label ?? `Día ${rule.dayOfWeek}`;
                        const timeError = ruleErrors[key] ?? null;

                        return (
                            <PanelCard key={key} size="sm" className={rule.isActive ? '' : 'opacity-60'}>
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-3">
                                    <div className="flex shrink-0 items-center justify-between gap-3 lg:min-w-[7.5rem] lg:justify-start">
                                    <div className="flex items-center gap-2.5">
                                        <PanelSwitch
                                            checked={rule.isActive}
                                            onChange={() => void handleToggle(rule)}
                                            size="sm"
                                            ariaLabel={rule.isActive ? 'Desactivar día' : 'Activar día'}
                                        />
                                        <span className="text-sm font-semibold text-fg">{dayLabel}</span>
                                    </div>
                                    <PanelIconButton
                                        label="Eliminar día"
                                        onClick={() => void handleDelete(rule)}
                                        className="border border-border hover:border-red-500/40 hover:bg-red-500/10 lg:hidden"
                                    >
                                        <IconTrash size={13} />
                                    </PanelIconButton>
                                    </div>

                                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 lg:flex lg:items-center lg:gap-4">
                                        <label className="hidden items-center gap-2 lg:flex">
                                            <span className="w-12 shrink-0 text-xs font-medium text-fg-muted">Inicio</span>
                                            <FieldSelect
                                                value={draft.startTime}
                                                onChange={(e) => setDraft(key, 'startTime', e.target.value)}
                                                options={TIME_SELECT_OPTIONS}
                                                className="w-[6.75rem] shrink-0"
                                                disabled={!rule.isActive}
                                            />
                                        </label>
                                        <label className="hidden items-center gap-2 lg:flex">
                                            <span className="w-12 shrink-0 text-xs font-medium text-fg-muted">Fin</span>
                                            <FieldSelect
                                                value={draft.endTime}
                                                onChange={(e) => setDraft(key, 'endTime', e.target.value)}
                                                options={TIME_SELECT_OPTIONS}
                                                className="w-[6.75rem] shrink-0"
                                                disabled={!rule.isActive}
                                            />
                                        </label>
                                    <PanelField label="Inicio" className="min-w-0 lg:hidden">
                                        <FieldSelect
                                            value={draft.startTime}
                                            onChange={(e) => setDraft(key, 'startTime', e.target.value)}
                                            options={TIME_SELECT_OPTIONS}
                                            disabled={!rule.isActive}
                                        />
                                    </PanelField>
                                    <PanelField label="Fin" className="min-w-0 lg:hidden">
                                        <FieldSelect
                                            value={draft.endTime}
                                            onChange={(e) => setDraft(key, 'endTime', e.target.value)}
                                            options={TIME_SELECT_OPTIONS}
                                            disabled={!rule.isActive}
                                        />
                                    </PanelField>
                                    </div>

                                    <div className="flex w-full shrink-0 items-center justify-end gap-2 lg:w-auto lg:min-w-[2.75rem]">
                                        <PanelIconButton
                                            label="Eliminar día"
                                            onClick={() => void handleDelete(rule)}
                                            className="hidden border border-border hover:border-red-500/40 hover:bg-red-500/10 lg:flex"
                                        >
                                            <IconTrash size={13} />
                                        </PanelIconButton>
                                    </div>
                                </div>

                                {timeError ? (
                                    <p className="mt-2 text-xs text-(--color-error,#dc2626) lg:mt-1">{timeError}</p>
                                ) : null}
                            </PanelCard>
                        );
                    })
                )}
            </div>

            {availableDays.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2.5 sm:gap-3">
                    {availableDays.map((day) => (
                        <button
                            key={day.value}
                            type="button"
                            onClick={() => void handleAddDay(day.value)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm text-fg-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                        >
                            <IconPlus size={13} />
                            {day.label}
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                {weeklyStatus ? (
                    <p className={`text-sm font-medium ${weeklyStatus === 'Guardado' ? 'text-(--accent)' : 'text-(--color-error,#dc2626)'}`}>
                        {weeklyStatus}
                    </p>
                ) : weeklyDirty ? (
                    <p className="text-sm text-fg-muted">Cambios sin guardar</p>
                ) : null}
                <PanelButton
                    onClick={() => void handleSaveWeeklyRules()}
                    disabled={!weeklyDirty || weeklySaving}
                    className="sm:ml-auto"
                >
                    {weeklySaving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                    {weeklySaving ? 'Guardando…' : 'Guardar'}
                </PanelButton>
            </div>
            </section>

            <section className="min-w-0">
            <PanelBlockHeader
                title="Días bloqueados"
                description="Vacaciones, feriados o días libres en los que no aceptas solicitudes."
                actions={
                    !showBlockedForm ? (
                        <PanelButton variant="secondary" size="sm" onClick={() => setShowBlockedForm(true)}>
                            <IconPlus size={14} /> Bloquear fechas
                        </PanelButton>
                    ) : null
                }
            />

            {showBlockedForm ? (
                <div className="mb-4">
                    <PanelCard size="md" className="border-accent/30">
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-2">
                                {(['fullDay', 'hours'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setBlockMode(mode)}
                                        className="flex-1 rounded-xl border py-2.5 text-sm transition-colors"
                                        style={{
                                            borderColor: blockMode === mode ? 'var(--accent)' : 'var(--border)',
                                            background: blockMode === mode ? 'var(--accent-soft)' : 'transparent',
                                            color: blockMode === mode ? 'var(--accent)' : 'var(--fg-secondary)',
                                            fontWeight: blockMode === mode ? 600 : 400,
                                        }}
                                    >
                                        {mode === 'fullDay' ? 'Día(s) completo(s)' : 'Horario específico'}
                                    </button>
                                ))}
                            </div>

                            {blockMode === 'fullDay' ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <PanelField label="Desde" required>
                                        <FieldDate value={blockStartDate} onChange={setBlockStartDate} />
                                    </PanelField>
                                    <PanelField label="Hasta" required>
                                        <FieldDate value={blockEndDate} onChange={setBlockEndDate} />
                                    </PanelField>
                                </div>
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <PanelField label="Fecha" required>
                                        <FieldDate value={blockStartDate} onChange={setBlockStartDate} />
                                    </PanelField>
                                    <PanelField label="Desde" required>
                                        <FieldSelect
                                            value={blockStartTime}
                                            onChange={(e) => setBlockStartTime(e.target.value)}
                                            options={TIME_SELECT_OPTIONS}
                                        />
                                    </PanelField>
                                    <PanelField label="Hasta" required>
                                        <FieldSelect
                                            value={blockEndTime}
                                            onChange={(e) => setBlockEndTime(e.target.value)}
                                            options={TIME_SELECT_OPTIONS}
                                        />
                                    </PanelField>
                                </div>
                            )}

                            <PanelField label="Motivo" hint="Opcional, solo para tu referencia.">
                                <input
                                    type="text"
                                    value={blockReason}
                                    onChange={(e) => setBlockReason(e.target.value)}
                                    placeholder={blockMode === 'fullDay' ? 'Ej: Vacaciones, feriado' : 'Ej: Reunión, imprevisto'}
                                    className="form-input w-full"
                                />
                            </PanelField>

                            {blockError ? <p className="text-xs text-(--color-error,#dc2626)">{blockError}</p> : null}

                            <div className="flex gap-3">
                                <PanelButton variant="accent" onClick={() => void handleAddBlockedSlot()} disabled={blockSaving}>
                                    {blockSaving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                    {blockSaving ? 'Guardando…' : 'Bloquear'}
                                </PanelButton>
                                <PanelButton variant="secondary" onClick={resetBlockedForm}>
                                    Cancelar
                                </PanelButton>
                            </div>
                        </div>
                    </PanelCard>
                </div>
            ) : null}

            {blockedSlots.length === 0 && !showBlockedForm ? (
                <PanelEmptyState
                    title="Sin bloqueos activos"
                    description="Todos tus horarios de la semana están disponibles para solicitudes."
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {blockedSlots.map((slot) => {
                        const isDeleting = deletingBlockId === slot.id;
                        return (
                            <PanelCard key={slot.id} size="sm">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-muted text-fg-muted">
                                        <IconCalendarOff size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-fg">
                                            {formatBlockedSlotRange(slot.startsAt, slot.endsAt)}
                                        </p>
                                        {slot.reason ? <p className="mt-0.5 text-xs text-fg-muted">{slot.reason}</p> : null}
                                    </div>
                                    <PanelIconButton
                                        label="Quitar bloqueo"
                                        onClick={() => void handleDeleteBlockedSlot(slot.id)}
                                        disabled={isDeleting}
                                        className="border border-border hover:border-red-500/40 hover:bg-red-500/10"
                                    >
                                        {isDeleting ? <IconLoader2 size={13} className="animate-spin" /> : <IconTrash size={13} />}
                                    </PanelIconButton>
                                </div>
                            </PanelCard>
                        );
                    })}
                </div>
            )}
            </section>
            </div>

        </div>
    );
}
