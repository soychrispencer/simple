'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import {
    BusinessSchedulePanel,
    type BusinessBlockedDaysFormState,
} from '@simple/ui/panel';
import {
    buildFullWeekScheduleDays,
    BUSINESS_SCHEDULE_DEFAULTS,
    BUSINESS_SCHEDULE_TYPICAL_WEEK_SAVE,
    deriveCommonWeeklyBreak,
    mapWeeklyRulesForSave,
    ruleKeyFromDayOfWeek,
    validateWeeklyScheduleState,
    type CommonWeeklyBreak,
} from '@simple/utils';
import {
    serenatasApi,
    type ProviderGroup,
    type ProviderGroupAvailabilityRule,
    type ProviderGroupBlockedSlot,
} from '@/lib/serenatas-api';

type RuleRow = ProviderGroupAvailabilityRule & { isActive: boolean };

type RuleDraft = {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
};

function buildSnapshot(
    alwaysOpen: boolean,
    scheduleNote: string,
    weeklyBreak: CommonWeeklyBreak,
    rules: RuleDraft[],
): string {
    return JSON.stringify({ alwaysOpen, scheduleNote, weeklyBreak, rules });
}

function rulesFromAvailability(data: ProviderGroupAvailabilityRule[]): RuleDraft[] {
    return buildFullWeekScheduleDays<RuleRow>(data.map((rule) => ({ ...rule, isActive: rule.isActive ?? true })), {
        defaultStartTime: BUSINESS_SCHEDULE_DEFAULTS.startTime,
        defaultEndTime: BUSINESS_SCHEDULE_DEFAULTS.endTime,
        defaultActive: BUSINESS_SCHEDULE_DEFAULTS.defaultActive,
    }).map((rule) => ({
        dayOfWeek: rule.dayOfWeek,
        startTime: rule.startTime ?? BUSINESS_SCHEDULE_DEFAULTS.startTime,
        endTime: rule.endTime ?? BUSINESS_SCHEDULE_DEFAULTS.endTime,
        isActive: rule.isActive !== false,
    }));
}

export function ProviderAvailabilityEditor({
    group,
    ensureGroup,
}: {
    group: ProviderGroup | null;
    ensureGroup: () => Promise<ProviderGroup | null>;
}) {
    const [rules, setRules] = useState<RuleDraft[]>([]);
    const [alwaysOpen, setAlwaysOpen] = useState(false);
    const [scheduleNote, setScheduleNote] = useState('');
    const [weeklyBreak, setWeeklyBreak] = useState<CommonWeeklyBreak>({ enabled: false, startTime: '13:00', endTime: '14:00' });
    const [savedSnapshot, setSavedSnapshot] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [defaultError, setDefaultError] = useState('');
    const [weeklySaving, setWeeklySaving] = useState(false);
    const [weeklyStatus, setWeeklyStatus] = useState('');
    const [ruleErrors, setRuleErrors] = useState<Record<string, string>>({});
    const [breakError, setBreakError] = useState('');
    const [loadingDefault, setLoadingDefault] = useState(false);
    const [blockedSlots, setBlockedSlots] = useState<ProviderGroupBlockedSlot[]>([]);
    const [showBlockedForm, setShowBlockedForm] = useState(false);
    const [blockedForm, setBlockedForm] = useState<BusinessBlockedDaysFormState>({
        mode: 'fullDay',
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '10:00',
        reason: '',
    });
    const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setLoadError('');
        if (!group?.id) {
            const nextRules = rulesFromAvailability([]);
            const breakConfig = deriveCommonWeeklyBreak([]);
            setRules(nextRules);
            setAlwaysOpen(false);
            setScheduleNote('');
            setWeeklyBreak(breakConfig);
            setSavedSnapshot(buildSnapshot(false, '', breakConfig, nextRules));
            setWeeklyStatus('');
            setBlockedSlots([]);
            setLoading(false);
            return;
        }
        const response = await serenatasApi.providerGroupAvailability(group.id);
        if (!response.ok || !response.item) {
            setLoadError(response.error ?? 'No se pudo cargar el horario.');
            setLoading(false);
            return;
        }
        const persisted = response.item.rules.some((rule) => rule.id);
        const sourceRules: RuleRow[] = persisted
            ? response.item.rules.map((rule) => ({ ...rule, isActive: rule.isActive ?? true }))
            : [];
        const nextRules = rulesFromAvailability(sourceRules);
        const breakConfig = deriveCommonWeeklyBreak(sourceRules);
        setRules(nextRules);
        setAlwaysOpen(response.item.alwaysOpen ?? false);
        setScheduleNote(response.item.scheduleNote ?? '');
        setWeeklyBreak(breakConfig);
        setSavedSnapshot(buildSnapshot(
            response.item.alwaysOpen ?? false,
            response.item.scheduleNote ?? '',
            breakConfig,
            nextRules,
        ));
        setWeeklyStatus('');
        setBlockedSlots((response.item.blockedSlots ?? []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        setLoading(false);
    };

    useEffect(() => {
        void load();
    }, [group?.id]);

    async function resolveGroupId() {
        if (group?.id) return group.id;
        const ensured = await ensureGroup();
        return ensured?.id ?? null;
    }

    const weeklyDirty = useMemo(
        () => buildSnapshot(alwaysOpen, scheduleNote, weeklyBreak, rules) !== savedSnapshot,
        [alwaysOpen, scheduleNote, weeklyBreak, rules, savedSnapshot],
    );

    const setDraft = (key: string, field: 'startTime' | 'endTime', value: string) => {
        const dayOfWeek = Number(key.replace('day-', ''));
        setRules((prev) => prev.map((rule) => (
            rule.dayOfWeek === dayOfWeek ? { ...rule, [field]: value } : rule
        )));
        setWeeklyStatus('');
        setRuleErrors((prev) => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleToggle = (key: string) => {
        const dayOfWeek = Number(key.replace('day-', ''));
        setRules((prev) => prev.map((rule) => (
            rule.dayOfWeek === dayOfWeek ? { ...rule, isActive: !rule.isActive } : rule
        )));
        setWeeklyStatus('');
    };

    const handleSaveWeeklyRules = async () => {
        const { ruleErrors: nextErrors, breakError: nextBreakError } = validateWeeklyScheduleState({
            alwaysOpen,
            rules,
            weeklyBreak,
        });
        setRuleErrors(nextErrors);
        setBreakError(nextBreakError ?? '');
        if (nextBreakError || Object.keys(nextErrors).length > 0) return;

        setWeeklySaving(true);
        setWeeklyStatus('');
        const groupId = await resolveGroupId();
        if (!groupId) {
            setWeeklySaving(false);
            setWeeklyStatus('No pudimos guardar el horario.');
            return;
        }
        const response = await serenatasApi.updateProviderGroupAvailability(groupId, {
            rules: mapWeeklyRulesForSave(rules, { alwaysOpen, weeklyBreak }),
            alwaysOpen,
            scheduleNote: scheduleNote.trim() || null,
        });
        setWeeklySaving(false);
        if (!response.ok) {
            setWeeklyStatus(response.error ?? 'No se pudo guardar el horario.');
            return;
        }
        setSavedSnapshot(buildSnapshot(alwaysOpen, scheduleNote, weeklyBreak, rules));
        setWeeklyStatus('Guardado');
    };

    const handleLoadDefaults = async () => {
        setLoadingDefault(true);
        setDefaultError('');
        const groupId = await resolveGroupId();
        if (!groupId) {
            setDefaultError('No pudimos cargar el horario típico.');
            setLoadingDefault(false);
            return;
        }
        const response = await serenatasApi.updateProviderGroupAvailability(groupId, {
            rules: BUSINESS_SCHEDULE_TYPICAL_WEEK_SAVE,
            alwaysOpen: false,
            scheduleNote: null,
        });
        if (!response.ok) {
            setDefaultError(response.error ?? 'No se pudo cargar el horario típico.');
            setLoadingDefault(false);
            return;
        }
        await load();
        setLoadingDefault(false);
    };

    const resetBlockedForm = () => {
        setShowBlockedForm(false);
        setBlockedForm({
            mode: 'fullDay',
            startDate: '',
            endDate: '',
            startTime: '09:00',
            endTime: '10:00',
            reason: '',
        });
    };

    const handleAddBlockedSlot = async () => {
        let startsAtIso: string;
        let endsAtIso: string;
        let error = '';

        if (blockedForm.mode === 'fullDay') {
            if (!blockedForm.startDate || !blockedForm.endDate) error = 'Selecciona las fechas de inicio y fin.';
            else if (blockedForm.endDate < blockedForm.startDate) error = 'La fecha de fin debe ser igual o posterior a la de inicio.';
            else {
                startsAtIso = new Date(`${blockedForm.startDate}T00:00:00`).toISOString();
                endsAtIso = new Date(`${blockedForm.endDate}T23:59:59`).toISOString();
            }
        } else if (!blockedForm.startDate) {
            error = 'Selecciona la fecha del bloqueo.';
        } else if (blockedForm.endTime <= blockedForm.startTime) {
            error = 'La hora de fin debe ser posterior a la de inicio.';
        } else {
            startsAtIso = new Date(`${blockedForm.startDate}T${blockedForm.startTime}:00`).toISOString();
            endsAtIso = new Date(`${blockedForm.startDate}T${blockedForm.endTime}:00`).toISOString();
        }

        if (error) {
            setBlockedForm((prev) => ({ ...prev, error }));
            return;
        }

        setBlockedForm((prev) => ({ ...prev, saving: true, error: '' }));
        const groupId = await resolveGroupId();
        if (!groupId) {
            setBlockedForm((prev) => ({ ...prev, saving: false, error: 'No pudimos guardar el bloqueo.' }));
            return;
        }
        const result = await serenatasApi.createProviderGroupBlockedSlot(groupId, {
            startsAt: startsAtIso!,
            endsAt: endsAtIso!,
            reason: blockedForm.reason || undefined,
        });
        setBlockedForm((prev) => ({ ...prev, saving: false }));
        if (!result.ok || !result.slot) {
            setBlockedForm((prev) => ({ ...prev, error: result.error ?? 'Error al guardar el bloqueo.' }));
            return;
        }
        setBlockedSlots((prev) => [...prev, result.slot!].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
        resetBlockedForm();
    };

    const handleDeleteBlockedSlot = async (id: string) => {
        if (!group?.id) return;
        setDeletingBlockId(id);
        const result = await serenatasApi.deleteProviderGroupBlockedSlot(group.id, id);
        setDeletingBlockId(null);
        if (!result.ok) return;
        setBlockedSlots((prev) => prev.filter((slot) => slot.id !== id));
    };

    const scheduleDays = useMemo(
        () => buildFullWeekScheduleDays(rules, {
            defaultStartTime: BUSINESS_SCHEDULE_DEFAULTS.startTime,
            defaultEndTime: BUSINESS_SCHEDULE_DEFAULTS.endTime,
            defaultActive: BUSINESS_SCHEDULE_DEFAULTS.defaultActive,
        }).map((rule) => ({
            key: ruleKeyFromDayOfWeek(rule.dayOfWeek),
            dayOfWeek: rule.dayOfWeek,
            dayLabel: rule.dayLabel,
            startTime: rule.startTime,
            endTime: rule.endTime,
            isActive: rule.isActive,
        })),
        [rules],
    );

    if (loading) {
        return (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" />
                Cargando horario…
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
            {defaultError ? (
                <div className="mb-4 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2" style={{ borderColor: 'var(--danger-border, rgba(185,28,28,0.20))', background: 'var(--danger-soft, rgba(185,28,28,0.06))', color: 'var(--danger, #b91c1c)' }}>
                    <IconAlertCircle size={15} className="shrink-0" />
                    {defaultError}
                </div>
            ) : null}

            <BusinessSchedulePanel
                hideTitle
                days={scheduleDays}
                alwaysOpen={alwaysOpen}
                onAlwaysOpenChange={(value) => {
                    setAlwaysOpen(value);
                    setWeeklyStatus('');
                }}
                onStartTimeChange={(key, value) => setDraft(key, 'startTime', value)}
                onEndTimeChange={(key, value) => setDraft(key, 'endTime', value)}
                onDayToggle={handleToggle}
                weeklyBreak={{
                    enabled: weeklyBreak.enabled,
                    startTime: weeklyBreak.startTime,
                    endTime: weeklyBreak.endTime,
                    onEnabledChange: (enabled) => {
                        setWeeklyBreak((prev) => ({ ...prev, enabled }));
                        setBreakError('');
                        setWeeklyStatus('');
                    },
                    onStartTimeChange: (value) => {
                        setWeeklyBreak((prev) => ({ ...prev, startTime: value }));
                        setBreakError('');
                        setWeeklyStatus('');
                    },
                    onEndTimeChange: (value) => {
                        setWeeklyBreak((prev) => ({ ...prev, endTime: value }));
                        setBreakError('');
                        setWeeklyStatus('');
                    },
                    error: breakError || null,
                }}
                scheduleNote={scheduleNote}
                onScheduleNoteChange={(value) => {
                    setScheduleNote(value);
                    setWeeklyStatus('');
                }}
                fieldsDisabled={alwaysOpen}
                showLoadTypicalSchedule
                onLoadTypicalSchedule={() => void handleLoadDefaults()}
                loadingTypicalSchedule={loadingDefault}
                blockedSlots={blockedSlots}
                showBlockedForm={showBlockedForm}
                onShowBlockedFormChange={setShowBlockedForm}
                blockedForm={blockedForm}
                onBlockedFormFieldChange={(key, value) => setBlockedForm((prev) => ({ ...prev, [key]: value }))}
                onBlockedSubmit={() => void handleAddBlockedSlot()}
                onBlockedCancel={resetBlockedForm}
                onDeleteBlockedSlot={(id) => void handleDeleteBlockedSlot(id)}
                deletingBlockedSlotId={deletingBlockId}
                ruleErrors={ruleErrors}
                batchSave={{
                    dirty: weeklyDirty,
                    saving: weeklySaving,
                    status: weeklyStatus,
                    onSave: () => void handleSaveWeeklyRules(),
                }}
            />
        </div>
    );
}
