/** Horarios semanales compartidos (Agenda, Serenatas, perfil público). */

export const BUSINESS_SCHEDULE_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const BUSINESS_SCHEDULE_WEEKDAY_LABELS: Record<number, string> = {
    0: 'Domingo',
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
};

export type BusinessScheduleTimeOption = { value: string; label: string };

/** Opciones 00:00–23:45 cada 15 min (mismo patrón en todas las verticales). */
export function buildBusinessScheduleTimeOptions(stepMinutes = 15): BusinessScheduleTimeOption[] {
    const options: BusinessScheduleTimeOption[] = [];
    for (let hour = 0; hour <= 23; hour += 1) {
        for (let minute = 0; minute < 60; minute += stepMinutes) {
            const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            options.push({ value, label: value });
        }
    }
    return options;
}

export const BUSINESS_SCHEDULE_TIME_OPTIONS = buildBusinessScheduleTimeOptions();

export function minutesFromHm(value: string | null | undefined): number | null {
    if (!value) return null;
    const [rawHours, rawMinutes] = value.split(':');
    const hours = Number(rawHours);
    const minutes = Number(rawMinutes);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
}

export function hmFromMinutes(totalMinutes: number): string {
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Cierra después de medianoche (p. ej. 12:00 → 02:00). */
export function scheduleCrossesMidnight(startHm: string, endHm: string): boolean {
    const start = minutesFromHm(startHm);
    const end = minutesFromHm(endHm);
    if (start == null || end == null) return false;
    return end <= start;
}

export type ScheduleRangeValidation =
    | { ok: true; crossesMidnight: boolean }
    | { ok: false; error: string };

export function validateBusinessScheduleRange(startHm: string, endHm: string): ScheduleRangeValidation {
    const start = minutesFromHm(startHm);
    const end = minutesFromHm(endHm);
    if (start == null || end == null) {
        return { ok: false, error: 'Selecciona hora de inicio y fin válidas.' };
    }
    if (start === end) {
        return { ok: false, error: 'La hora de fin debe ser distinta al inicio.' };
    }
    return { ok: true, crossesMidnight: end < start };
}

export function validateBusinessScheduleBreak(
    breakStart: string,
    breakEnd: string,
    workStart: string,
    workEnd: string,
): string | null {
    if (!breakStart && !breakEnd) return null;
    if (!breakStart || !breakEnd) return 'Completa inicio y fin de la pausa, o déjala vacía.';
    const breakValidation = validateBusinessScheduleRange(breakStart, breakEnd);
    if (!breakValidation.ok) return 'La pausa debe tener fin posterior al inicio (mismo día).';
    if (scheduleCrossesMidnight(workStart, workEnd)) {
        return 'Con horario nocturno, deja la pausa vacía o acótala al tramo del mismo día.';
    }
    const workValidation = validateBusinessScheduleRange(workStart, workEnd);
    if (!workValidation.ok) return null;
    const bStart = minutesFromHm(breakStart)!;
    const bEnd = minutesFromHm(breakEnd)!;
    const wStart = minutesFromHm(workStart)!;
    const wEnd = minutesFromHm(workEnd)!;
    if (bStart < wStart || bEnd > wEnd) {
        return 'La pausa debe quedar dentro del horario de atención.';
    }
    return null;
}

export function formatBusinessScheduleRange(startHm: string, endHm: string): string {
    if (scheduleCrossesMidnight(startHm, endHm)) {
        return `${startHm} – ${endHm} (día siguiente)`;
    }
    return `${startHm} – ${endHm}`;
}

export type WeeklyScheduleRuleLike = {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breakStart?: string | null;
    breakEnd?: string | null;
    isActive?: boolean;
};

export type DayScheduleSegment = {
    startTime: string;
    endTime: string;
    breakStart?: string | null;
    breakEnd?: string | null;
};

/** Parte del día calendario `targetDayOfWeek` (0=dom … 6=sáb) para una regla semanal. */
export function expandWeeklyRuleToDaySegments(
    rule: WeeklyScheduleRuleLike,
    targetDayOfWeek: number,
): DayScheduleSegment[] {
    if (rule.isActive === false) return [];

    const segments: DayScheduleSegment[] = [];
    const prevDay = (targetDayOfWeek + 6) % 7;
    const crosses = scheduleCrossesMidnight(rule.startTime, rule.endTime);

    if (rule.dayOfWeek === targetDayOfWeek) {
        if (crosses) {
            segments.push({
                startTime: rule.startTime,
                endTime: '23:59',
                breakStart: rule.breakStart,
                breakEnd: rule.breakEnd,
            });
        } else {
            segments.push({
                startTime: rule.startTime,
                endTime: rule.endTime,
                breakStart: rule.breakStart,
                breakEnd: rule.breakEnd,
            });
        }
    }

    if (rule.dayOfWeek === prevDay && crosses) {
        segments.push({
            startTime: '00:00',
            endTime: rule.endTime,
            breakStart: null,
            breakEnd: null,
        });
    }

    return segments;
}

export function expandWeeklyRulesToDaySegments(
    rules: WeeklyScheduleRuleLike[],
    targetDayOfWeek: number,
): DayScheduleSegment[] {
    return rules.flatMap((rule) => expandWeeklyRuleToDaySegments(rule, targetDayOfWeek));
}

function isFullDayBlock(start: Date, end: Date): boolean {
    return (
        start.getHours() === 0 && start.getMinutes() === 0
        && end.getHours() === 23 && end.getMinutes() >= 59
    );
}

/** Rango legible para bloqueos de disponibilidad (día completo u horario). */
export function formatBusinessBlockedSlotRange(startsAt: string, endsAt: string): string {
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    const sameDay = start.toDateString() === end.toDateString();
    const dateFmt = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFmt = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (isFullDayBlock(start, end)) {
        if (sameDay) return dateFmt.format(start);
        return `${dateFmt.format(start)} — ${dateFmt.format(end)}`;
    }
    if (sameDay) {
        return `${dateFmt.format(start)} · ${timeFmt.format(start)}–${timeFmt.format(end)}`;
    }
    return `${dateFmt.format(start)} ${timeFmt.format(start)} — ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

/** ¿Está abierto ahora según open/close (admite cierre al día siguiente)? */
export function isBusinessOpenNow(openHm: string, closeHm: string, now = new Date()): boolean {
    const open = minutesFromHm(openHm);
    const close = minutesFromHm(closeHm);
    if (open == null || close == null) return false;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (scheduleCrossesMidnight(openHm, closeHm)) {
        return nowMinutes >= open || nowMinutes < close;
    }
    return nowMinutes >= open && nowMinutes < close;
}

export type CommonWeeklyBreak = {
    enabled: boolean;
    startTime: string;
    endTime: string;
};

/** Deriva colación común desde reglas activas con pausa configurada. */
export type FullWeekScheduleDayBase = {
    dayOfWeek: number;
    dayLabel: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
};

export type BuildFullWeekScheduleDaysOptions<T extends { dayOfWeek: number }> = {
    defaultStartTime?: string;
    defaultEndTime?: string;
    defaultActive?: boolean;
    getDayLabel?: (dayOfWeek: number) => string;
    merge?: (existing: T, dayOfWeek: number) => T;
};

/** Siempre 7 días Lun→Dom; rellena faltantes con valores por defecto. */
export function buildFullWeekScheduleDays<T extends { dayOfWeek: number }>(
    existing: T[],
    options: BuildFullWeekScheduleDaysOptions<T> = {},
): (T & { dayLabel: string })[] {
    const {
        defaultStartTime = '09:00',
        defaultEndTime = '18:00',
        defaultActive = false,
        getDayLabel = (dayOfWeek) => BUSINESS_SCHEDULE_WEEKDAY_LABELS[dayOfWeek] ?? `Día ${dayOfWeek}`,
        merge,
    } = options;
    const byDay = new Map(existing.map((rule) => [rule.dayOfWeek, rule]));

    return BUSINESS_SCHEDULE_DAY_ORDER.map((dayOfWeek) => {
        const found = byDay.get(dayOfWeek);
        const dayLabel = getDayLabel(dayOfWeek);
        if (found) {
            const merged = merge ? merge(found, dayOfWeek) : found;
            return { ...merged, dayLabel };
        }
        return {
            dayOfWeek,
            dayLabel,
            startTime: defaultStartTime,
            endTime: defaultEndTime,
            isActive: defaultActive,
        } as unknown as T & { dayLabel: string };
    });
}

export const BUSINESS_SCHEDULE_ALWAYS_OPEN_RULES: WeeklyScheduleRuleLike[] = BUSINESS_SCHEDULE_DAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '00:00',
    endTime: '23:59',
    isActive: true,
    breakStart: null,
    breakEnd: null,
}));

/** Horario típico Lun–vie 9–18 con colación 13–14. */
export const BUSINESS_SCHEDULE_TYPICAL_WEEK_SAVE: WeeklyScheduleRuleLike[] = BUSINESS_SCHEDULE_DAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '18:00',
    isActive: dayOfWeek >= 1 && dayOfWeek <= 5,
    breakStart: dayOfWeek >= 1 && dayOfWeek <= 5 ? '13:00' : null,
    breakEnd: dayOfWeek >= 1 && dayOfWeek <= 5 ? '14:00' : null,
}));

export const BUSINESS_SCHEDULE_DEFAULTS = {
    startTime: '09:00',
    endTime: '18:00',
    defaultActive: false,
} as const;

export function ruleKeyFromDayOfWeek(dayOfWeek: number) {
    return `day-${dayOfWeek}`;
}

export function resolveWeeklyBreakPayload(weeklyBreak: CommonWeeklyBreak) {
    return weeklyBreak.enabled
        ? { breakStart: weeklyBreak.startTime, breakEnd: weeklyBreak.endTime }
        : { breakStart: null as string | null, breakEnd: null as string | null };
}

export function mapWeeklyRulesForSave(
    rules: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>,
    options: { alwaysOpen: boolean; weeklyBreak: CommonWeeklyBreak },
) {
    const breakPayload = resolveWeeklyBreakPayload(options.weeklyBreak);
    return rules.map((rule) => ({
        dayOfWeek: rule.dayOfWeek,
        startTime: options.alwaysOpen ? '00:00' : rule.startTime,
        endTime: options.alwaysOpen ? '23:59' : rule.endTime,
        isActive: options.alwaysOpen ? true : rule.isActive,
        breakStart: options.alwaysOpen ? null : breakPayload.breakStart,
        breakEnd: options.alwaysOpen ? null : breakPayload.breakEnd,
    }));
}

export function validateWeeklyScheduleState(input: {
    alwaysOpen: boolean;
    rules: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>;
    weeklyBreak: CommonWeeklyBreak;
}): { ruleErrors: Record<string, string>; breakError: string | null } {
    const ruleErrors: Record<string, string> = {};
    const breakPayload = resolveWeeklyBreakPayload(input.weeklyBreak);

    if (!input.alwaysOpen) {
        for (const rule of input.rules) {
            if (!rule.isActive) continue;
            const validation = validateBusinessScheduleRange(rule.startTime, rule.endTime);
            if (!validation.ok) {
                ruleErrors[ruleKeyFromDayOfWeek(rule.dayOfWeek)] = validation.error;
            }
            if (breakPayload.breakStart && breakPayload.breakEnd) {
                const dayError = validateBusinessScheduleBreak(
                    breakPayload.breakStart,
                    breakPayload.breakEnd,
                    rule.startTime,
                    rule.endTime,
                );
                if (dayError) ruleErrors[ruleKeyFromDayOfWeek(rule.dayOfWeek)] = dayError;
            }
        }
    }

    let breakError: string | null = null;
    if (breakPayload.breakStart && breakPayload.breakEnd) {
        const rangeValidation = validateBusinessScheduleRange(breakPayload.breakStart, breakPayload.breakEnd);
        if (!rangeValidation.ok) breakError = rangeValidation.error;
    }

    return { ruleErrors, breakError };
}

export type ScheduleBlockedSlotLike = {
    startsAt: string;
    endsAt: string;
};

export function isInstantBlocked(now: Date, slots: ScheduleBlockedSlotLike[]): boolean {
    const t = now.getTime();
    return slots.some((slot) => {
        const start = new Date(slot.startsAt).getTime();
        const end = new Date(slot.endsAt).getTime();
        return t >= start && t < end;
    });
}

export function isInstantInWeeklyBreak(now: Date, breakStart: string, breakEnd: string): boolean {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = minutesFromHm(breakStart);
    const end = minutesFromHm(breakEnd);
    if (start == null || end == null) return false;
    if (end > start) return nowMinutes >= start && nowMinutes < end;
    return nowMinutes >= start || nowMinutes < end;
}

export function buildTypicalMarketplaceBusinessHours(): Array<{
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    open: string | null;
    close: string | null;
    closed: boolean;
}> {
    const dayIds = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    const dayOrder = [1, 2, 3, 4, 5, 6, 0];
    return dayOrder.map((dow, index) => ({
        day: dayIds[index]!,
        open: dow >= 1 && dow <= 5 ? '09:00' : null,
        close: dow >= 1 && dow <= 5 ? '18:00' : null,
        closed: dow < 1 || dow > 5,
    }));
}

/** Deriva colación común desde reglas activas con pausa configurada. */
export function deriveCommonWeeklyBreak(
    rules: Pick<WeeklyScheduleRuleLike, 'breakStart' | 'breakEnd' | 'isActive'>[],
    fallback: Pick<CommonWeeklyBreak, 'startTime' | 'endTime'> = { startTime: '13:00', endTime: '14:00' },
): CommonWeeklyBreak {
    const withBreak = rules.filter((rule) => rule.isActive !== false && rule.breakStart && rule.breakEnd);
    if (withBreak.length === 0) {
        return { enabled: false, ...fallback };
    }
    const first = withBreak[0]!;
    const uniform = withBreak.every(
        (rule) => rule.breakStart === first.breakStart && rule.breakEnd === first.breakEnd,
    );
    return {
        enabled: uniform,
        startTime: uniform ? (first.breakStart ?? fallback.startTime) : fallback.startTime,
        endTime: uniform ? (first.breakEnd ?? fallback.endTime) : fallback.endTime,
    };
}

export type OperatorSiteScheduleDay = {
    dayOfWeek: number;
    dayLabel: string;
    isActive: boolean;
    startTime: string;
    endTime: string;
    breakStart: string | null;
    breakEnd: string | null;
};

/** Semana Lun→Dom para landing pública (Operator Site). */
export function buildOperatorSiteScheduleDays(
    rules: WeeklyScheduleRuleLike[],
    options: { alwaysOpen?: boolean } = {},
): OperatorSiteScheduleDay[] {
    if (options.alwaysOpen) {
        return BUSINESS_SCHEDULE_DAY_ORDER.map((dayOfWeek) => ({
            dayOfWeek,
            dayLabel: BUSINESS_SCHEDULE_WEEKDAY_LABELS[dayOfWeek] ?? `Día ${dayOfWeek}`,
            isActive: true,
            startTime: '00:00',
            endTime: '23:59',
            breakStart: null,
            breakEnd: null,
        }));
    }

    return buildFullWeekScheduleDays(rules, {
        defaultActive: false,
        merge: (rule) => ({
            ...rule,
            breakStart: rule.breakStart ?? null,
            breakEnd: rule.breakEnd ?? null,
        }),
    }).map((day) => ({
        dayOfWeek: day.dayOfWeek,
        dayLabel: day.dayLabel,
        isActive: day.isActive !== false,
        startTime: day.startTime,
        endTime: day.endTime,
        breakStart: day.breakStart ?? null,
        breakEnd: day.breakEnd ?? null,
    }));
}
