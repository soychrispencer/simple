'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    IconCalendar,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconClock,
} from '@tabler/icons-react';
import { ModernSelect, type ModernSelectOption } from './modern-select';

const MONTHS_ES = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
];

const WEEKDAYS_ES = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
const POPOVER_GAP_PX = 6;
const VIEWPORT_PAD_PX = 8;
/** Por encima de modales del panel (z-[90]) y overlays del header. */
const POPOVER_Z_INDEX = 9999;

type PopoverPosition = {
    top: number;
    left: number;
    width: number;
};

function pad2(value: number) {
    return String(value).padStart(2, '0');
}

export function toYmd(year: number, monthIndex: number, day: number) {
    return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function parseYmd(value: string): { year: number; monthIndex: number; day: number } | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const year = Number(value.slice(0, 4));
    const monthIndex = Number(value.slice(5, 7)) - 1;
    const day = Number(value.slice(8, 10));
    const date = new Date(year, monthIndex, day);
    if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
        return null;
    }
    return { year, monthIndex, day };
}

function daysInMonth(year: number, monthIndex: number) {
    return new Date(year, monthIndex + 1, 0).getDate();
}

/** Lunes = primera columna (es-CL). */
function firstWeekdayMonday(year: number, monthIndex: number) {
    const sundayBased = new Date(year, monthIndex, 1).getDay();
    return sundayBased === 0 ? 6 : sundayBased - 1;
}

function compareYmd(a: string, b: string) {
    return a.localeCompare(b);
}

function formatDisplayLabel(value: string, placeholder: string) {
    const parsed = parseYmd(value);
    if (!parsed) return placeholder;
    const date = new Date(parsed.year, parsed.monthIndex, parsed.day);
    return new Intl.DateTimeFormat('es-CL', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function viewFromValue(value: string, min?: string) {
    const parsed = parseYmd(value) ?? parseYmd(min ?? '');
    if (parsed) return parsed;
    const today = new Date();
    return { year: today.getFullYear(), monthIndex: today.getMonth(), day: today.getDate() };
}

export type ModernDateInputProps = {
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    disabled?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    className?: string;
};

export function ModernDateInput({
    value,
    onChange,
    min,
    max,
    disabled = false,
    placeholder = 'Seleccionar fecha',
    ariaLabel,
    className,
}: ModernDateInputProps) {
    const [open, setOpen] = useState(false);
    const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const initialView = viewFromValue(value, min);
    const [viewYear, setViewYear] = useState(initialView.year);
    const [viewMonth, setViewMonth] = useState(initialView.monthIndex);

    const todayYmd = useMemo(() => {
        const today = new Date();
        return toYmd(today.getFullYear(), today.getMonth(), today.getDate());
    }, []);

    const updatePopoverPosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const popoverHeight = popoverRef.current?.offsetHeight ?? 360;
        const width = rect.width;
        const maxLeft = window.innerWidth - width - VIEWPORT_PAD_PX;
        const left = Math.max(VIEWPORT_PAD_PX, Math.min(rect.left, maxLeft));
        const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PAD_PX;
        const openAbove = spaceBelow < popoverHeight && rect.top > spaceBelow;
        const top = openAbove
            ? Math.max(VIEWPORT_PAD_PX, rect.top - popoverHeight - POPOVER_GAP_PX)
            : rect.bottom + POPOVER_GAP_PX;
        setPopoverPosition({ top, left, width });
    }, []);

    useLayoutEffect(() => {
        if (!open) {
            setPopoverPosition(null);
            return;
        }
        updatePopoverPosition();
        const raf = requestAnimationFrame(updatePopoverPosition);
        return () => cancelAnimationFrame(raf);
    }, [open, updatePopoverPosition, viewMonth, viewYear]);

    useEffect(() => {
        if (!open) return;
        const onReposition = () => updatePopoverPosition();
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);
        return () => {
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onReposition, true);
        };
    }, [open, updatePopoverPosition]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
            setOpen(false);
        };
        window.addEventListener('pointerdown', onPointerDown);
        return () => window.removeEventListener('pointerdown', onPointerDown);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const parsed = viewFromValue(value, min);
        setViewYear(parsed.year);
        setViewMonth(parsed.monthIndex);
    }, [min, open, value]);

    const displayLabel = formatDisplayLabel(value, placeholder);
    const hasValue = Boolean(parseYmd(value));

    function isSelectable(year: number, monthIndex: number, day: number) {
        const ymd = toYmd(year, monthIndex, day);
        if (min && compareYmd(ymd, min) < 0) return false;
        if (max && compareYmd(ymd, max) > 0) return false;
        return true;
    }

    function selectDate(ymd: string) {
        onChange(ymd);
        setOpen(false);
        triggerRef.current?.focus();
    }

    function prevMonth() {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((year) => year - 1);
            return;
        }
        setViewMonth((month) => month - 1);
    }

    function nextMonth() {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((year) => year + 1);
            return;
        }
        setViewMonth((month) => month + 1);
    }

    const leadingPad = firstWeekdayMonday(viewYear, viewMonth);
    const days = daysInMonth(viewYear, viewMonth);
    const todayParsed = parseYmd(todayYmd);
    const todaySelectable = todayParsed
        ? isSelectable(todayParsed.year, todayParsed.monthIndex, todayParsed.day)
        : false;

    const calendarPanel = open ? (
        <div
            ref={popoverRef}
            role="dialog"
            aria-label="Calendario"
            className="rounded-xl border p-3"
            style={{
                position: 'fixed',
                top: popoverPosition?.top ?? 0,
                left: popoverPosition?.left ?? 0,
                width: popoverPosition?.width ?? undefined,
                visibility: popoverPosition ? 'visible' : 'hidden',
                zIndex: POPOVER_Z_INDEX,
                borderColor: 'var(--border)',
                background: 'var(--surface)',
                boxShadow: '0 18px 44px rgba(0, 0, 0, 0.16)',
            }}
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                <button
                    type="button"
                    aria-label="Mes anterior"
                    onClick={prevMonth}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:border-accent-border hover:bg-bg-subtle hover:text-fg"
                >
                    <IconChevronLeft size={16} />
                </button>
                <p className="text-sm font-semibold capitalize text-fg">
                    {MONTHS_ES[viewMonth]} {viewYear}
                </p>
                <button
                    type="button"
                    aria-label="Mes siguiente"
                    onClick={nextMonth}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border text-fg-muted transition-colors hover:border-accent-border hover:bg-bg-subtle hover:text-fg"
                >
                    <IconChevronRight size={16} />
                </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAYS_ES.map((label) => (
                    <span
                        key={label}
                        className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-fg-muted"
                    >
                        {label}
                    </span>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: leadingPad }).map((_, index) => (
                    <span key={`pad-${index}`} className="h-9" aria-hidden />
                ))}
                {Array.from({ length: days }).map((_, index) => {
                    const day = index + 1;
                    const ymd = toYmd(viewYear, viewMonth, day);
                    const selectable = isSelectable(viewYear, viewMonth, day);
                    const selected = value === ymd;
                    const isToday = todayYmd === ymd;
                    return (
                        <button
                            key={day}
                            type="button"
                            disabled={!selectable}
                            onClick={() => selectable && selectDate(ymd)}
                            className={`h-9 w-full rounded-lg text-sm font-medium transition-colors ${
                                selected
                                    ? 'bg-accent text-[var(--button-primary-color)]'
                                    : isToday
                                      ? 'border border-accent-border bg-accent-soft text-accent'
                                      : selectable
                                        ? 'text-fg hover:bg-bg-subtle'
                                        : 'cursor-not-allowed text-fg-muted opacity-35'
                            }`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
                <button
                    type="button"
                    className="text-xs font-medium text-accent hover:underline"
                    onClick={() => {
                        onChange('');
                        setOpen(false);
                        triggerRef.current?.focus();
                    }}
                >
                    Borrar
                </button>
                <button
                    type="button"
                    disabled={!todaySelectable}
                    className="text-xs font-medium text-fg-muted transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => todaySelectable && selectDate(todayYmd)}
                >
                    Hoy
                </button>
            </div>
        </div>
    ) : null;

    return (
        <div className={`relative w-full ${className ?? ''}`} ref={rootRef}>
            <button
                ref={triggerRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                aria-expanded={open}
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    setOpen((current) => !current);
                }}
                className="form-input relative flex w-full items-center text-left"
                style={{
                    color: hasValue ? 'var(--fg)' : 'var(--fg-muted)',
                    paddingLeft: '2.2rem',
                    paddingRight: '2.4rem',
                }}
            >
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted">
                    <IconCalendar size={16} stroke={1.75} />
                </span>
                <span className="truncate">{displayLabel}</span>
                <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted transition-transform"
                    style={{ transform: `translateY(-50%) rotate(${open ? '180deg' : '0deg'})` }}
                >
                    <IconChevronDown size={14} />
                </span>
            </button>

            {typeof document !== 'undefined' && calendarPanel
                ? createPortal(calendarPanel, document.body)
                : null}
        </div>
    );
}

/** Opciones HH:mm para selects de hora (mismo patrón que ModernSelect). */
export function buildTimeSlotOptions(
    startHour = 8,
    endHour = 23,
    stepMinutes: 15 | 30 = 30,
): ModernSelectOption[] {
    const options: ModernSelectOption[] = [];
    for (let hour = startHour; hour <= endHour; hour += 1) {
        for (let minute = 0; minute < 60; minute += stepMinutes) {
            if (hour === endHour && minute > 0 && endHour === 23) break;
            const slot = `${pad2(hour)}:${pad2(minute)}`;
            options.push({ value: slot, label: slot });
        }
    }
    return options;
}

export type ModernTimeSelectProps = {
    value: string;
    onChange: (value: string) => void;
    options: ModernSelectOption[];
    disabled?: boolean;
    placeholder?: string;
    ariaLabel?: string;
};

export function ModernTimeSelect({
    value,
    onChange,
    options,
    disabled = false,
    placeholder = 'Seleccionar hora',
    ariaLabel,
}: ModernTimeSelectProps) {
    return (
        <ModernSelect
            value={value}
            onChange={onChange}
            options={options}
            disabled={disabled}
            placeholder={placeholder}
            ariaLabel={ariaLabel}
            leadingIcon={<IconClock size={16} stroke={1.75} />}
        />
    );
}
