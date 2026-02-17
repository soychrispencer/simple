"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { RentPeriod } from '@simple/shared-types';
import { Input, Select, Button, Textarea, useToast } from '@simple/ui';
import { useRouter } from 'next/navigation';
import { IconCalendar, IconChevronDown, IconChevronLeft, IconChevronRight, IconClock } from '@tabler/icons-react';
import { formatPrice } from '@/lib/format';
import { useSubmitVehicle } from '@/lib/submitVehicle';
import {
  useWizard,
  type WizardAdvancedCommercial,
  type WizardBonus,
  type WizardCommercial,
  type WizardDiscount,
  type WizardFinancingOption,
  type WizardWarrantyOffer,
} from '../context/WizardContext';
import { validateStepData } from '../schemas';
import { validateAdvancedVehicle } from '../specDescriptors';
import { WizardStepLayout } from '../layout/WizardStepLayout';
import { scrollToFirstInvalidField } from '../lib/scrollToFirstInvalid';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';

const rentFieldMap: Record<RentPeriod, keyof WizardCommercial> = {
  daily: 'rent_daily_price',
  weekly: 'rent_weekly_price',
  monthly: 'rent_monthly_price',
};

const DEFAULT_CONDICIONES = { flags: [], notas: null };

const FINANCING_OTHER_VALUE = '__other__';
const FINANCING_ENTITY_OPTIONS = [
  // Bancos
  { label: 'BancoEstado', value: 'BancoEstado' },
  { label: 'Banco de Chile', value: 'Banco de Chile' },
  { label: 'Banco Internacional', value: 'Banco Internacional' },
  { label: 'Banco Scotiabank', value: 'Banco Scotiabank' },
  { label: 'BCI (Banco de Crédito e Inversiones)', value: 'BCI' },
  { label: 'Banco BICE', value: 'Banco BICE' },
  { label: 'Banco Santander', value: 'Banco Santander' },
  { label: 'Banco Itaú', value: 'Banco Itaú' },
  { label: 'Banco Security', value: 'Banco Security' },
  { label: 'Banco Falabella', value: 'Banco Falabella' },
  { label: 'Banco Ripley', value: 'Banco Ripley' },
  { label: 'Banco Consorcio', value: 'Banco Consorcio' },
  { label: 'Banco BTG Pactual Chile', value: 'Banco BTG Pactual Chile' },

  // Cooperativas / financieras automotrices (comunes)
  { label: 'Coopeuch', value: 'Coopeuch' },
  { label: 'Forum Servicios Financieros', value: 'Forum Servicios Financieros' },
  { label: 'Tanner Servicios Financieros', value: 'Tanner Servicios Financieros' },
  { label: 'Autofin', value: 'Autofin' },
  { label: 'Mitsui Auto Finance Chile', value: 'Mitsui Auto Finance Chile' },

  { label: 'Otra (especificar)', value: FINANCING_OTHER_VALUE },
];

function isKnownFinancingEntity(value: string): boolean {
  const v = (value || '').trim();
  if (!v) return false;
  return FINANCING_ENTITY_OPTIONS.some((o) => o.value !== FINANCING_OTHER_VALUE && String(o.value) === v);
}

function calcFinancingEstimate(opts: {
  price: number | null | undefined;
  currency: string;
  annualRatePercent: number;
  termMonths: number;
  downPaymentPercent: number;
}): null | { monthlyPayment: number; financedAmount: number; downPaymentAmount: number } {
  const price = typeof opts.price === 'number' && Number.isFinite(opts.price) ? opts.price : null;
  if (!price || price <= 0) return null;
  const termMonths = Number.isFinite(opts.termMonths) ? Math.floor(opts.termMonths) : 0;
  if (termMonths <= 0) return null;
  const downPct = Number.isFinite(opts.downPaymentPercent) ? Math.max(0, Math.min(100, opts.downPaymentPercent)) : 0;
  const downPaymentAmount = (price * downPct) / 100;
  const financedAmount = price - downPaymentAmount;
  if (financedAmount <= 0) return null;

  const annualRate = Number.isFinite(opts.annualRatePercent) ? Math.max(0, opts.annualRatePercent) : 0;
  const r = annualRate / 100 / 12;

  let monthlyPayment = 0;
  if (r === 0) {
    monthlyPayment = financedAmount / termMonths;
  } else {
    const pow = Math.pow(1 + r, termMonths);
    monthlyPayment = (financedAmount * r * pow) / (pow - 1);
  }

  if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) return null;
  return { monthlyPayment, financedAmount, downPaymentAmount };
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateOnlyDisplay(value: string | null | undefined): string {
  const parsed = parseDateOnly(value);
  if (!parsed) return 'Selecciona una fecha';
  return parsed.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

function splitDateTimeLocal(value: string | null | undefined): { date: string | null; time: string | null } {
  if (!value) return { date: null, time: null };
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (!match) return { date: null, time: null };
  return { date: match[1] ?? null, time: match[2] ?? null };
}

function combineDateTimeLocal(date: string | null | undefined, time: string | null | undefined): string | undefined {
  if (!date) return undefined;
  const safeTime = time && /^\d{2}:\d{2}$/.test(time) ? time : '00:00';
  return `${date}T${safeTime}`;
}

type DatePickerInputProps = {
  label: string;
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  error?: string;
  placeholder?: string;
  shape?: 'pill' | 'rounded';
};

function DatePickerInput({ label, value, onChange, error, placeholder, shape = 'pill' }: DatePickerInputProps) {
  const todayDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const parsed = useMemo(() => parseDateOnly(value ?? ''), [value]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => parsed || todayDate);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const calendarRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLDivElement | null>(null);

  const closeCalendar = useCallback(() => {
    setShowCalendar(false);
    setMonthMenuOpen(false);
    setYearMenuOpen(false);
  }, []);

  const toggleCalendar = useCallback(() => {
    setShowCalendar((prev) => {
      const next = !prev;
      if (next) {
        setViewDate(parsed || todayDate);
        setMonthMenuOpen(false);
        setYearMenuOpen(false);
      } else {
        setMonthMenuOpen(false);
        setYearMenuOpen(false);
      }
      return next;
    });
  }, [parsed, todayDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showCalendar && calendarRef.current && triggerRef.current) {
        if (!calendarRef.current.contains(target) && !triggerRef.current.contains(target)) {
          closeCalendar();
        }
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCalendar();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeCalendar, showCalendar]);

  const monthOptions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('es-CL', { month: 'long' });
    return Array.from({ length: 12 }, (_v, idx) => ({ value: idx, label: formatter.format(new Date(2024, idx, 1)) }));
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = todayDate.getFullYear();
    const years: number[] = [];
    for (let y = currentYear + 10; y >= currentYear - 1; y -= 1) years.push(y);
    return years;
  }, [todayDate]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday as first day
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = startWeekday;
    const cells: Date[] = [];

    for (let i = prevMonthDays; i > 0; i -= 1) {
      cells.push(new Date(year, month, 1 - i));
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1];
      cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }

    return cells;
  }, [viewDate]);

  const setMonthOffset = (offset: number) => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleSelectDate = (date: Date) => {
    const iso = date.toISOString().split('T')[0];
    onChange(iso);
    closeCalendar();
  };

  const displayValue = useMemo(() => formatDateOnlyDisplay(value), [value]);

  return (
    <div className="relative" ref={triggerRef}>
      <Input
        label={label}
        value={displayValue}
        placeholder={placeholder || 'Selecciona una fecha'}
        readOnly
        onClick={toggleCalendar}
        leftIcon={<IconCalendar size={16} />}
        error={error}
        shape={shape}
        className="cursor-pointer"
      />

      {showCalendar ? (
        <div
          ref={calendarRef}
          className="absolute z-20 mt-2 w-full max-w-xs rounded-lg card-surface card-surface-raised border border-[var(--field-border)] shadow-card"
          role="dialog"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--field-border)]">
            <button type="button" onClick={() => setMonthOffset(-1)} className="p-1 rounded hover:bg-[var(--field-bg-hover)]">
              <IconChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-2 flex-wrap justify-center min-w-0">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMonthMenuOpen((prev) => !prev);
                    setYearMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1 h-8 px-2 text-sm rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--field-border-hover)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-border/80 dark:focus-visible:ring-border/80"
                >
                  <span className="capitalize">{monthOptions[viewDate.getMonth()]?.label}</span>
                  <IconChevronDown size={14} />
                </button>
                {monthMenuOpen ? (
                  <div className="absolute left-0 mt-1 w-36 max-h-60 overflow-y-auto rounded-md card-surface card-surface-raised border border-[var(--field-border)] shadow-card py-1 z-10">
                    {monthOptions.map((month) => (
                      <button
                        key={month.value}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm capitalize hover:bg-[var(--field-bg-hover)] ${month.value === viewDate.getMonth() ? 'font-semibold text-primary' : 'text-[var(--field-text)]'}`}
                        onClick={() => {
                          setViewDate((prev) => new Date(prev.getFullYear(), month.value, 1));
                          setMonthMenuOpen(false);
                        }}
                      >
                        {month.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setYearMenuOpen((prev) => !prev);
                    setMonthMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1 h-8 px-2 text-sm rounded-md border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--field-text)] hover:border-[var(--field-border-hover)] hover:bg-[var(--field-bg-hover)] focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-border/80 dark:focus-visible:ring-border/80"
                >
                  <span>{viewDate.getFullYear()}</span>
                  <IconChevronDown size={14} />
                </button>
                {yearMenuOpen ? (
                  <div className="absolute left-0 mt-1 w-28 max-h-60 overflow-y-auto rounded-md card-surface card-surface-raised border border-[var(--field-border)] shadow-card py-1 z-10">
                    {yearOptions.map((year) => (
                      <button
                        key={year}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] ${year === viewDate.getFullYear() ? 'font-semibold text-primary' : 'text-[var(--field-text)]'}`}
                        onClick={() => {
                          setViewDate((prev) => new Date(year, prev.getMonth(), 1));
                          setYearMenuOpen(false);
                        }}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {value ? (
                <Button
                  type="button"
                  variant="neutral"
                  size="xs"
                  className="h-8 px-2 text-[11px] basis-full"
                  onClick={() => {
                    onChange(null);
                    closeCalendar();
                  }}
                >
                  Sin fecha
                </Button>
              ) : null}
            </div>

            <button type="button" onClick={() => setMonthOffset(1)} className="p-1 rounded hover:bg-[var(--field-bg-hover)]">
              <IconChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-3 pt-2 pb-3 text-center">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <span key={d} className="text-[11px] uppercase text-lighttext/70 dark:text-darktext/70 tracking-wide">{d}</span>
            ))}
            {calendarDays.map((date) => {
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isSelected = parsed ? date.toDateString() === parsed.toDateString() : false;
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => handleSelectDate(date)}
                  className={`h-9 text-sm rounded-md transition-colors ${isSelected ? 'bg-primary text-[var(--color-on-primary)]' : ''} ${!isSelected ? 'hover:bg-[var(--field-bg-hover)]' : ''} ${!isCurrentMonth ? 'text-lighttext/50 dark:text-darktext/50' : 'text-lighttext dark:text-darktext'}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type TimePickerInputProps = {
  label: string;
  value: string | null | undefined;
  onChange: (next: string) => void;
  error?: string;
  shape?: 'pill' | 'rounded';
};

function TimePickerInput({ label, value, onChange, error, shape = 'pill' }: TimePickerInputProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLDivElement | null>(null);

  const normalizedValue = useMemo(() => {
    return value && /^\d{2}:\d{2}$/.test(value) ? value : '00:00';
  }, [value]);

  const options = useMemo(() => {
    const times: string[] = [];
    for (let h = 0; h < 24; h += 1) {
      for (let m = 0; m < 60; m += 15) {
        times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    return times;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (open && popoverRef.current && triggerRef.current) {
        if (!popoverRef.current.contains(target) && !triggerRef.current.contains(target)) {
          setOpen(false);
        }
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={triggerRef}>
      <Input
        label={label}
        value={normalizedValue}
        readOnly
        onClick={() => setOpen((prev) => !prev)}
        leftIcon={<IconClock size={16} />}
        error={error}
        shape={shape}
        className="cursor-pointer"
      />

      {open ? (
        <div
          ref={popoverRef}
          className="absolute z-20 mt-2 w-full max-w-xs rounded-lg card-surface card-surface-raised border border-[var(--field-border)] shadow-card overflow-hidden"
          role="dialog"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--field-bg-hover)] ${t === normalizedValue ? 'font-semibold text-primary' : 'text-[var(--field-text)]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function sanitizeDigits(raw: string): string {
  return String(raw || '').replace(/\D+/g, '');
}

function normalizeExchangeAccepts(
  raw: unknown
): 'car_suv_pickup' | 'motorcycle' | 'commercial_vehicle' | 'depends' | null {
  if (raw === 'car_suv_pickup' || raw === 'motorcycle' || raw === 'commercial_vehicle' || raw === 'depends') return raw;
  return null;
}

function normalizeExchangeBalance(raw: unknown): 'to_seller' | 'to_buyer' | 'negotiable' | null {
  if (raw === 'to_seller' || raw === 'to_buyer' || raw === 'negotiable') return raw;
  return null;
}

const formatLocalDateTime = (date: Date) => {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function validateAdvancedConditions(
  conditions: WizardAdvancedCommercial | null | undefined,
  opts?: { requireFinancing?: boolean; requireBonuses?: boolean; requireDiscounts?: boolean }
) {
  const errors: Record<string, string> = {};
  const requireFinancing = !!opts?.requireFinancing;
  const requireBonuses = !!opts?.requireBonuses;
  const requireDiscounts = !!opts?.requireDiscounts;
  if (!conditions) {
    if (requireFinancing) {
      errors.financing_required = 'Agrega al menos una opción de financiamiento';
      return { ok: false as const, errors };
    }
    if (requireBonuses) {
      errors.bonuses_required = 'Agrega al menos un bono/promoción';
      return { ok: false as const, errors };
    }
    if (requireDiscounts) {
      errors.discounts_required = 'Agrega al menos un descuento';
      return { ok: false as const, errors };
    }
    return { ok: true as const, errors };
  }

  if (requireFinancing) {
    const count = Array.isArray(conditions.financing) ? conditions.financing.length : 0;
    if (count === 0) errors.financing_required = 'Agrega al menos una opción de financiamiento';
  }

  if (requireBonuses) {
    const bonusesCount = Array.isArray(conditions.bonuses) ? conditions.bonuses.length : 0;
    if (bonusesCount === 0) errors.bonuses_required = 'Agrega al menos un bono/promoción';
  }

  if (requireDiscounts) {
    const discountsCount = Array.isArray(conditions.discounts) ? conditions.discounts.length : 0;
    if (discountsCount === 0) errors.discounts_required = 'Agrega al menos un descuento';
  }

  if (conditions.financing) {
    conditions.financing.forEach((option, index) => {
      if (!option.bank?.trim()) errors[`financing_${index}_bank`] = 'Banco requerido';
      if (option.rate < 0 || option.rate > 100) errors[`financing_${index}_rate`] = 'Tasa debe estar entre 0-100%';
      if (option.term_months < 1 || option.term_months > 120) errors[`financing_${index}_term_months`] = 'Plazo debe estar entre 1-120 meses';
      if (option.down_payment_percent < 0 || option.down_payment_percent > 100) errors[`financing_${index}_down_payment_percent`] = 'Pie debe estar entre 0-100%';
    });
  }

  if (conditions.bonuses) {
    conditions.bonuses.forEach((bonus, index) => {
      if (!bonus.description?.trim()) errors[`bonus_${index}_description`] = 'Descripción requerida';
      if (bonus.type === 'cash' && (!bonus.value || bonus.value <= 0)) errors[`bonus_${index}_value`] = 'Valor requerido para bonos en efectivo';
    });
  }

  if (conditions.discounts) {
    conditions.discounts.forEach((discount, index) => {
      if (!discount.description?.trim()) errors[`discount_${index}_description`] = 'Descripción requerida';
      if (discount.value <= 0) errors[`discount_${index}_value`] = 'Valor debe ser positivo';
      if (discount.type === 'percentage' && discount.value > 100) errors[`discount_${index}_percentage`] = 'Porcentaje máximo 100%';
      if (discount.valid_until) {
        const validUntilDate = new Date(`${discount.valid_until}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (validUntilDate < today) {
          errors[`discount_${index}_valid_until`] = 'Fecha debe ser futura';
        }
      }
    });
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

const StepCommercial: React.FC = () => {
  const { state, patch, setStep, isPublishable, reset } = useWizard();
  const router = useRouter();
  const { addToast } = useToast();
  const { submit } = useSubmitVehicle();
  const { listing_type, commercial } = state;
  const condiciones = commercial.condiciones ?? DEFAULT_CONDICIONES;
  const promotionsAvailable = Boolean((commercial as any).promotions_available);
  const discountsAvailable = Boolean((commercial as any).discounts_available);
  const exchangeAcceptsRaw = (commercial as any).exchange_accepts;
  const exchangeBalanceRaw = (commercial as any).exchange_balance;
  const showRent = listing_type === 'rent';
  const showAuction = listing_type === 'auction';
  const currency: 'CLP' = 'CLP';
  const requiresFinancing = !showRent && !!commercial.financing_available;
  const requiresBonuses = !showRent && promotionsAvailable;
  const requiresDiscounts = !showRent && discountsAvailable;
  const requiresExchangeOptions = !showRent && !!commercial.exchange_considered;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [needsContact, setNeedsContact] = useState(false);
  const advanced = useMemo(() => (commercial.advanced_conditions || {}) as WizardAdvancedCommercial, [commercial.advanced_conditions]);

  const normalizeAdvanced = useCallback((next: WizardAdvancedCommercial): WizardAdvancedCommercial | null => {
    const hasFinancing = Array.isArray(next.financing) && next.financing.length > 0;
    const hasBonuses = Array.isArray(next.bonuses) && next.bonuses.length > 0;
    const hasDiscounts = Array.isArray(next.discounts) && next.discounts.length > 0;
    const hasWarrantyOffer = !!next.warranty_offer;
    const hasAdditional = typeof next.additional_conditions === 'string' && next.additional_conditions.trim().length > 0;
    return (hasFinancing || hasBonuses || hasDiscounts || hasWarrantyOffer || hasAdditional) ? next : null;
  }, []);

  const setWarrantyOffer = useCallback((offer: WizardWarrantyOffer | null) => {
    const nextAdvanced: WizardAdvancedCommercial = { ...advanced, warranty_offer: offer };
    patch('commercial', { advanced_conditions: normalizeAdvanced(nextAdvanced) } as Partial<WizardCommercial>);
  }, [advanced, normalizeAdvanced, patch]);

  const setWarrantyOfferAndFlags = useCallback((offer: WizardWarrantyOffer | null) => {
    const flagsSet = new Set((condiciones.flags || []).filter((f) => typeof f === 'string'));
    flagsSet.delete('garantia_vendedor');
    flagsSet.delete('garantia_extendida');

    if (offer?.kind === 'seller') flagsSet.add('garantia_vendedor');
    if (offer?.kind === 'extended') flagsSet.add('garantia_extendida');

    const nextAdvanced: WizardAdvancedCommercial = { ...advanced, warranty_offer: offer };
    patch('commercial', {
      condiciones: { ...condiciones, flags: Array.from(flagsSet) },
      advanced_conditions: normalizeAdvanced(nextAdvanced),
    } as Partial<WizardCommercial>);
  }, [advanced, condiciones, normalizeAdvanced, patch]);

  useEffect(() => {
    // Compat: si hay opciones guardadas en drafts antiguos, encendemos los toggles.
    const hasFinancingDetails = Array.isArray(advanced.financing) && advanced.financing.length > 0;
    if (hasFinancingDetails && !commercial.financing_available) {
      patch('commercial', { financing_available: true } as Partial<WizardCommercial>);
    }

    const hasPromotionsDetails =
      (Array.isArray(advanced.bonuses) && advanced.bonuses.length > 0) ||
      (Array.isArray(advanced.discounts) && advanced.discounts.length > 0);
    if (hasPromotionsDetails && !promotionsAvailable && Array.isArray(advanced.bonuses) && advanced.bonuses.length > 0) {
      patch('commercial', { promotions_available: true } as Partial<WizardCommercial>);
    }

    const hasDiscountsDetails = Array.isArray(advanced.discounts) && advanced.discounts.length > 0;
    if (hasDiscountsDetails && !discountsAvailable) {
      patch('commercial', { discounts_available: true } as Partial<WizardCommercial>);
    }
  }, [advanced.bonuses, advanced.discounts, advanced.financing, commercial.financing_available, discountsAvailable, patch, promotionsAvailable]);

  useEffect(() => {
    if (!commercial.exchange_considered) return;
    const accepts = normalizeExchangeAccepts(exchangeAcceptsRaw);
    const balance = normalizeExchangeBalance(exchangeBalanceRaw);
    if (!accepts || !balance) {
      patch('commercial', {
        exchange_accepts: accepts ?? 'depends',
        exchange_balance: balance ?? 'negotiable',
      } as Partial<WizardCommercial>);
    }
  }, [commercial.exchange_considered, exchangeAcceptsRaw, exchangeBalanceRaw, patch]);

  const advancedErrors = useMemo(() => {
    const hasAnyAdvanced = !!(
      (Array.isArray(advanced.financing) && advanced.financing.length) ||
      (Array.isArray(advanced.bonuses) && advanced.bonuses.length) ||
      (Array.isArray(advanced.discounts) && advanced.discounts.length) ||
      !!advanced.warranty_offer
    );

    if (!hasAnyAdvanced && !requiresFinancing && !requiresBonuses && !requiresDiscounts) return {};
    return validateAdvancedConditions(advanced, { requireFinancing: requiresFinancing, requireBonuses: requiresBonuses, requireDiscounts: requiresDiscounts }).errors;
  }, [advanced, requiresFinancing, requiresBonuses, requiresDiscounts]);
  const initialRentPeriod: RentPeriod = commercial.rent_price_period ?? 'daily';
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>(initialRentPeriod);
  const [rentPriceInput, setRentPriceInput] = useState<string>(() => {
    const value = commercial[rentFieldMap[initialRentPeriod]] as number | null | undefined;
    return value != null ? String(value) : '';
  });
  const [bonusDraft, setBonusDraft] = useState<WizardBonus | null>(null);
  const [bonusDraftErrors, setBonusDraftErrors] = useState<Record<string, string>>({});
  const [discountDraft, setDiscountDraft] = useState<WizardDiscount | null>(null);
  const [discountDraftErrors, setDiscountDraftErrors] = useState<Record<string, string>>({});
  const [financingDraft, setFinancingDraft] = useState<WizardFinancingOption | null>(null);
  const [financingDraftErrors, setFinancingDraftErrors] = useState<Record<string, string>>({});

  const update = useCallback(<K extends keyof WizardCommercial>(key: K, value: WizardCommercial[K]) => {
    patch('commercial', { [key]: value } as Partial<WizardCommercial>);
  }, [patch]);

  const updateCondiciones = useCallback((next: Partial<typeof condiciones>) => {
    patch('commercial', { condiciones: { ...condiciones, ...next } });
  }, [condiciones, patch]);

  const commitRentPrice = useCallback((period: RentPeriod, value: number | null) => {
    const payload: Partial<WizardCommercial> = {
      rent_price_period: value == null ? null : period,
      rent_daily_price: period === 'daily' ? value : null,
      rent_weekly_price: period === 'weekly' ? value : null,
      rent_monthly_price: period === 'monthly' ? value : null,
    };
    patch('commercial', payload);
  }, [patch]);

  const toggle = useCallback((field: 'financing_available' | 'exchange_considered' | 'promotions_available' | 'discounts_available') => {
    const current = !!(commercial as any)[field];
    const next = !current;
    if (field === 'exchange_considered') {
      patch('commercial', {
        exchange_considered: next,
        exchange_accepts: next ? (normalizeExchangeAccepts((commercial as any).exchange_accepts) ?? 'depends') : null,
        exchange_balance: next ? (normalizeExchangeBalance((commercial as any).exchange_balance) ?? 'negotiable') : null,
      } as Partial<WizardCommercial>);
      return;
    }

    patch('commercial', { [field]: next } as Partial<WizardCommercial>);
    if (next && (field === 'financing_available' || field === 'promotions_available' || field === 'discounts_available')) {
      requestAnimationFrame(() => {
        const selector = field === 'financing_available'
          ? '[data-advanced-financing]'
          : field === 'promotions_available'
            ? '[data-advanced-bonuses]'
            : '[data-advanced-discounts]';
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [commercial, patch]);

  const updateAdvanced = useCallback((next: WizardAdvancedCommercial) => {
    patch('commercial', { advanced_conditions: next });
  }, [patch]);

  const addFinancingOption = useCallback(() => {
    if (!commercial.financing_available) return;
    if (financingDraft) return;
    setFinancingDraftErrors({});
    setFinancingDraft({ bank: '', rate: 0, term_months: 12, down_payment_percent: 20 });
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-financing-draft]') as HTMLElement | null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [commercial.financing_available, financingDraft]);

  const acceptFinancingDraft = useCallback(() => {
    if (!financingDraft) return;
    const nextErrors: Record<string, string> = {};

    const bank = (financingDraft.bank || '').trim();
    const rate = Number(financingDraft.rate);
    const termMonths = Number(financingDraft.term_months);
    const downPayment = Number(financingDraft.down_payment_percent);

    if (!bank) nextErrors.bank = 'Banco requerido';
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) nextErrors.rate = 'Tasa debe estar entre 0-100%';
    if (!Number.isFinite(termMonths) || termMonths < 1 || termMonths > 120) nextErrors.term_months = 'Plazo debe estar entre 1-120 meses';
    if (!Number.isFinite(downPayment) || downPayment < 0 || downPayment > 100) nextErrors.down_payment_percent = 'Pie debe estar entre 0-100%';

    if (Object.keys(nextErrors).length > 0) {
      setFinancingDraftErrors(nextErrors);
      return;
    }

    const newOption: WizardFinancingOption = {
      bank,
      rate,
      term_months: Math.round(termMonths),
      down_payment_percent: downPayment,
    };

    updateAdvanced({
      ...advanced,
      financing: [...(advanced.financing || []), newOption],
    });

    setFinancingDraft(null);
    setFinancingDraftErrors({});
  }, [advanced, financingDraft, updateAdvanced]);

  const cancelFinancingDraft = useCallback(() => {
    setFinancingDraft(null);
    setFinancingDraftErrors({});
  }, []);

  const updateFinancingOption = useCallback((index: number, field: keyof WizardFinancingOption, value: any) => {
    const financing = [...(advanced.financing || [])];
    financing[index] = { ...financing[index], [field]: value };
    updateAdvanced({ ...advanced, financing });
  }, [advanced, updateAdvanced]);

  const removeFinancingOption = useCallback((index: number) => {
    const financing = [...(advanced.financing || [])];
    financing.splice(index, 1);
    updateAdvanced({ ...advanced, financing });
  }, [advanced, updateAdvanced]);

  const addBonus = useCallback(() => {
    if (bonusDraft) return;
    setBonusDraftErrors({});
    setBonusDraft({ type: 'cash', description: '', value: 0 });
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-bonus-draft]') as HTMLElement | null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [bonusDraft]);

  const acceptBonusDraft = useCallback(() => {
    if (!bonusDraft) return;
    const nextErrors: Record<string, string> = {};
    const desc = (bonusDraft.description || '').trim();
    if (!desc) nextErrors.description = 'Descripción requerida';
    if (bonusDraft.type === 'cash') {
      const value = Number(bonusDraft.value || 0);
      if (!Number.isFinite(value) || value <= 0) nextErrors.value = 'Valor requerido para bonos en efectivo';
    }
    if (Object.keys(nextErrors).length > 0) {
      setBonusDraftErrors(nextErrors);
      return;
    }

    const newBonus: WizardBonus = {
      ...bonusDraft,
      description: desc,
      value: bonusDraft.type === 'cash' ? Number(bonusDraft.value || 0) : undefined,
    };
    updateAdvanced({ ...advanced, bonuses: [...(advanced.bonuses || []), newBonus] });
    setBonusDraft(null);
    setBonusDraftErrors({});
  }, [advanced, bonusDraft, updateAdvanced]);

  const cancelBonusDraft = useCallback(() => {
    setBonusDraft(null);
    setBonusDraftErrors({});
  }, []);

  const updateBonus = useCallback((index: number, field: keyof WizardBonus, value: any) => {
    const bonuses = [...(advanced.bonuses || [])];
    bonuses[index] = { ...bonuses[index], [field]: value };
    updateAdvanced({ ...advanced, bonuses });
  }, [advanced, updateAdvanced]);

  const removeBonus = useCallback((index: number) => {
    const bonuses = [...(advanced.bonuses || [])];
    bonuses.splice(index, 1);
    updateAdvanced({ ...advanced, bonuses });
  }, [advanced, updateAdvanced]);

  const addDiscount = useCallback(() => {
    if (discountDraft) return;
    setDiscountDraftErrors({});
    setDiscountDraft({ type: 'percentage', value: 0, description: '' });
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-discount-draft]') as HTMLElement | null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [discountDraft]);

  const acceptDiscountDraft = useCallback(() => {
    if (!discountDraft) return;
    const nextErrors: Record<string, string> = {};
    const desc = (discountDraft.description || '').trim();
    if (!desc) nextErrors.description = 'Descripción requerida';
    const value = Number(discountDraft.value || 0);
    if (!Number.isFinite(value) || value <= 0) nextErrors.value = 'Valor debe ser positivo';
    if (discountDraft.type === 'percentage' && value > 100) nextErrors.value = 'Porcentaje máximo 100%';

    const validUntil = (discountDraft.valid_until || '').trim();
    if (validUntil) {
      const parsed = new Date(validUntil);
      if (Number.isNaN(parsed.getTime())) nextErrors.valid_until = 'Fecha inválida';
    }

    if (Object.keys(nextErrors).length > 0) {
      setDiscountDraftErrors(nextErrors);
      return;
    }

    const newDiscount: WizardDiscount = {
      ...discountDraft,
      description: desc,
      value,
      valid_until: validUntil || undefined,
    };
    updateAdvanced({ ...advanced, discounts: [...(advanced.discounts || []), newDiscount] });
    setDiscountDraft(null);
    setDiscountDraftErrors({});
  }, [advanced, discountDraft, updateAdvanced]);

  const cancelDiscountDraft = useCallback(() => {
    setDiscountDraft(null);
    setDiscountDraftErrors({});
  }, []);

  const updateDiscount = useCallback((index: number, field: keyof WizardDiscount, value: any) => {
    const discounts = [...(advanced.discounts || [])];
    discounts[index] = { ...discounts[index], [field]: value };
    updateAdvanced({ ...advanced, discounts });
  }, [advanced, updateAdvanced]);

  const removeDiscount = useCallback((index: number) => {
    const discounts = [...(advanced.discounts || [])];
    discounts.splice(index, 1);
    updateAdvanced({ ...advanced, discounts });
  }, [advanced, updateAdvanced]);

  const handleContinue = useCallback((opts?: { blockOnInvalid?: boolean }) => {
    const blockOnInvalid = opts?.blockOnInvalid ?? true;
    const toNumberOrNull = (value: unknown): number | null => {
      if (value == null) return null;
      if (typeof value === 'number') return Number.isFinite(value) ? value : null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const num = Number(trimmed);
        return Number.isFinite(num) ? num : null;
      }
      return null;
    };

    const normalizeVisibility = (value: unknown): 'featured' | 'normal' | 'hidden' => {
      if (value === 'featured' || value === 'normal' || value === 'hidden') return value;
      if (value === 'destacado') return 'featured';
      if (value === 'oculto') return 'hidden';
      return 'normal';
    };

    const normalizeDiscountType = (value: unknown): WizardCommercial['discount_type'] => {
      if (value == null || value === '') return null;
      if (value === 'percent' || value === 'amount' || value === 'financing_bonus' || value === 'brand_bonus') return value;
      // Compat legacy
      if (value === 'percentage') return 'percent';
      return null;
    };

    const normalizeDateOnly = (value: unknown): string | null => {
      if (value == null) return null;
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
    };

    const normalizeDateTimeLocal = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
      return match ? match[1] : null;
    };

    const sanitized: WizardCommercial = {
      ...commercial,
      condiciones,
    };

    // Reglas de requerimiento para mejorar UX: precio obligatorio antes de seguir en venta/subasta.
    // En borrador no bloqueamos por campos incompletos.
    if (blockOnInvalid && !showRent && (listing_type === 'sale' || listing_type === 'auction')) {
      const p = typeof sanitized.price === 'number' ? sanitized.price : null;
      if (p == null || !Number.isFinite(p) || p <= 0) {
        setErrors((prev) => ({ ...prev, price: 'Precio requerido' }));
        patch('validity', { commercial: false });
        requestAnimationFrame(() => scrollToFirstInvalidField());
        return false;
      }
    }

    // Coerción defensiva (borradores viejos pueden guardar strings/enums legacy)
    const coerced: WizardCommercial = {
      ...sanitized,
      currency: 'CLP',
      visibility: normalizeVisibility((sanitized as any).visibility),
      exchange_accepts: normalizeExchangeAccepts((sanitized as any).exchange_accepts),
      exchange_balance: normalizeExchangeBalance((sanitized as any).exchange_balance),
      price: toNumberOrNull((sanitized as any).price),
      offer_price: toNumberOrNull((sanitized as any).offer_price),
      discount_type: normalizeDiscountType((sanitized as any).discount_type),
      discount_valid_until: normalizeDateOnly((sanitized as any).discount_valid_until),
      rent_daily_price: toNumberOrNull((sanitized as any).rent_daily_price),
      rent_weekly_price: toNumberOrNull((sanitized as any).rent_weekly_price),
      rent_monthly_price: toNumberOrNull((sanitized as any).rent_monthly_price),
      rent_security_deposit: toNumberOrNull((sanitized as any).rent_security_deposit),
      rent_price_period:
        (sanitized as any).rent_price_period === 'daily' ||
        (sanitized as any).rent_price_period === 'weekly' ||
        (sanitized as any).rent_price_period === 'monthly'
          ? (sanitized as any).rent_price_period
          : null,
      auction_start_price: toNumberOrNull((sanitized as any).auction_start_price),
      auction_start_at: normalizeDateTimeLocal((sanitized as any).auction_start_at),
      auction_end_at: normalizeDateTimeLocal((sanitized as any).auction_end_at),
    };

    // Eliminado: descuento legacy sobre el precio principal.
    // Los descuentos se gestionan en la sección avanzada.
    coerced.offer_price = null;
    coerced.discount_type = null;
    coerced.discount_valid_until = null;

    // Dirección A: financiamiento/permuta se gestionan con toggles (no como flags)
    // y solo dejamos un campo de “condiciones adicionales” (2000) en `condiciones.notas`.
    const forbiddenFlags = new Set(['acepta_permuta', 'financiamiento_disponible']);
    const nextFlags = Array.isArray(condiciones.flags)
      ? condiciones.flags.filter((f) => f && !forbiddenFlags.has(f))
      : [];

    // Compat: drafts antiguos podían tener texto en `advanced.additional_conditions`.
    // Migramos a `condiciones.notas` si aún no hay contenido.
    const migratedNotes = (advanced as any)?.additional_conditions;
    const nextNotas = (() => {
      const current = typeof condiciones.notas === 'string' ? condiciones.notas : '';
      if (current.trim().length) return current;
      if (typeof migratedNotes === 'string' && migratedNotes.trim().length) return migratedNotes.trim();
      return current;
    })();

    const coercedCondiciones = {
      ...condiciones,
      flags: nextFlags,
      notas: nextNotas ? nextNotas : null,
    };

    const hasAnyAdvanced = !!(
      (Array.isArray(advanced.financing) && advanced.financing.length) ||
      (Array.isArray(advanced.bonuses) && advanced.bonuses.length) ||
      (Array.isArray(advanced.discounts) && advanced.discounts.length)
    );

    if (!showRent) {
      coerced.rent_price_period = null;
      coerced.rent_daily_price = null;
      coerced.rent_weekly_price = null;
      coerced.rent_monthly_price = null;
    } else {
      coerced.rent_price_period = coerced.rent_price_period ?? rentPeriod;
    }

    if (!showAuction) {
      coerced.auction_start_price = null;
      coerced.auction_start_at = null;
      coerced.auction_end_at = null;
    }

    // Importante: este paso NO bloquea por “faltantes” (precio/arriendo/subasta).
    // El bloqueo real ocurre al publicar en el paso de Revisión.
    // Aquí solo bloqueamos si hay valores inválidos (formato/enum/NaN/etc.).
    // Importante: NO validamos `advanced_conditions` con Zod aquí, porque drafts antiguos
    // pueden tener contenido avanzado inválido/invisible y bloquear el avance.
    // La sección avanzada (promos/financiamiento) se valida más abajo con `validateAdvancedConditions`.
    if (blockOnInvalid) {
      const validation = validateStepData('commercial', { ...coerced, condiciones: coercedCondiciones, advanced_conditions: undefined } as any);

      if (!validation.ok) {
        setErrors({ ...(validation.errors ?? {}) });
        patch('validity', { commercial: false });
        requestAnimationFrame(() => scrollToFirstInvalidField());
        return false;
      }
    }

    // Si acepta permuta, exigimos las 2 opciones mínimas (con defaults al activar).
    if (blockOnInvalid && requiresExchangeOptions) {
      const accepts = coerced.exchange_accepts;
      const balance = coerced.exchange_balance;
      if (!accepts || !balance) {
        setErrors((prev) => ({
          ...prev,
          exchange_accepts: !accepts ? 'Selecciona una opción' : (prev.exchange_accepts || ''),
          exchange_balance: !balance ? 'Selecciona una opción' : (prev.exchange_balance || ''),
        }));
        patch('validity', { commercial: false });
        requestAnimationFrame(() => scrollToFirstInvalidField());
        return false;
      }
    }

    if (blockOnInvalid && (hasAnyAdvanced || requiresFinancing || requiresBonuses || requiresDiscounts)) {
      const advValidation = validateAdvancedConditions(advanced, { requireFinancing: requiresFinancing, requireBonuses: requiresBonuses, requireDiscounts: requiresDiscounts });
      if (!advValidation.ok) {
        patch('validity', { commercial: false });
        requestAnimationFrame(() => {
          const el = document.querySelector('[data-advanced-conditions]') as HTMLElement | null;
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          scrollToFirstInvalidField();
        });
        return false;
      }
    }

    setErrors({});
    // Persistimos el estado saneado para evitar volver a bloquearse.
    const nextAdvanced: WizardAdvancedCommercial = { ...(advanced || {}) };
    // Eliminamos el campo legacy para que no se persista como “segundo textarea”.
    delete (nextAdvanced as any).additional_conditions;
    const normalizedAdvanced = normalizeAdvanced(nextAdvanced);
    patch('commercial', {
      ...coerced,
      condiciones: coercedCondiciones,
      advanced_conditions: normalizedAdvanced,
    });
    patch('validity', { commercial: true });
    return true;
  }, [advanced, commercial, condiciones, listing_type, normalizeAdvanced, patch, rentPeriod, requiresExchangeOptions, requiresFinancing, requiresBonuses, requiresDiscounts, showAuction, showRent]);

  const publishable = isPublishable();
  const publishDisabled = !publishable || publishing;

  const handlePublish = useCallback(async (asDraft: boolean = false) => {
    if (publishDisabled && !asDraft) return;
    setPublishing(true);
    setNeedsContact(false);

    try {
      // Normaliza/persiste el estado de commercial (especialmente advanced_conditions)
      // En borrador no bloqueamos por faltantes.
      const okCommercial = handleContinue({ blockOnInvalid: !asDraft });
      if (!okCommercial && !asDraft) {
        setPublishing(false);
        return;
      }

      if (asDraft) {
        if (!state.listing_type) throw new Error('Selecciona tipo de publicación');
        if (!state.vehicle.type_key) throw new Error('Selecciona tipo de vehículo');
        if (!state.basic.brand_id) throw new Error('Marca requerida');
        if (!state.basic.model_id) throw new Error('Modelo requerido');
        if (state.basic.year == null) throw new Error('Año requerido');
        if (!state.basic.color || state.basic.color === 'generic') throw new Error('Color requerido');
      } else {
        if (!validateStepData('basic', state.basic).ok) throw new Error('Datos básicos inválidos');
      }

      if (!asDraft) {
        const adv = validateAdvancedVehicle({
          basic: state.basic,
          commercial: state.commercial,
          specs: state.vehicle.specs || {},
          listing_type: state.listing_type,
        });
        if (!adv.ok) throw new Error(Object.values(adv.errors).slice(0, 1)[0] || 'Validación avanzada falló');
      }

      const images = state.media.images || [];
      const stateWithStatus = {
        ...state,
        publication_status: asDraft ? 'draft' : 'active'
      };

      const { error } = await submit(stateWithStatus as any, images);
      if (error) throw error;

      const isEditing = !!state.vehicle_id;
      const message = asDraft
        ? (isEditing ? 'Borrador guardado correctamente' : 'Borrador creado correctamente')
        : (isEditing ? 'Publicación actualizada correctamente' : 'Publicación creada correctamente');
      addToast(message, { type: 'success' });

      reset();
      router.replace('/panel/mis-publicaciones');
    } catch (e: any) {
      const msg = e?.message || 'Error al publicar';
      addToast(msg, { type: 'error' });
      const lower = msg.toLowerCase();
      if (lower.includes('whatsapp') || lower.includes('teléfono') || lower.includes('telefono') || lower.includes('datos de contacto') || lower.includes('contacto')) {
        setNeedsContact(true);
      }
      setPublishing(false);
    }
  }, [addToast, handleContinue, publishDisabled, reset, router, state, submit]);

  return (
    <WizardStepLayout
      title="Condiciones comerciales"
      description="Define precio y condiciones comerciales (venta, arriendo o subasta)."
      summary={(() => {
        if (listing_type === 'rent') {
          const amount = rentPriceInput ? `$${Number(rentPriceInput || 0).toLocaleString('es-CL')}` : '—';
          const periodLabel = rentPeriod === 'daily' ? 'día' : rentPeriod === 'weekly' ? 'semana' : 'mes';
          return `Arriendo: ${amount} / ${periodLabel}`;
        }
        const price = commercial.price ? `$${Number(commercial.price).toLocaleString('es-CL')}` : '—';
        return `Precio: ${price}`;
      })()}
      footer={(
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep('media')}>Volver</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>Cancelar</Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              onClick={() => handlePublish(true)}
              variant="neutral"
              size="md"
              loading={publishing}
              disabled={publishing}
            >
              Guardar borrador
            </Button>
            <Button
              type="button"
              onClick={() => handlePublish(false)}
              variant="primary"
              size="md"
              loading={publishing}
              disabled={publishDisabled}
            >
              Publicar
            </Button>
          </div>
        </div>
      )}
    >
      <ConfirmCancelModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          router.push('/panel/mis-publicaciones');
        }}
      />
      {needsContact && (
        <div className="rounded-lg border border-[var(--color-warn-subtle-border)] bg-[var(--color-warn-subtle-bg)] px-4 py-3 text-sm text-[var(--color-warn)] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-semibold">Debes completar tus datos de contacto para publicar.</span>
            <span className="text-[12px] text-lighttext/80 dark:text-darktext/80">Agrega tu teléfono y WhatsApp en tu perfil (o en tu página pública si tienes una). Pueden ser el mismo número.</span>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => { router.push('/panel/mi-perfil'); }}
          >
            Ir a Mi Perfil
          </Button>
        </div>
      )}
      <div className="flex flex-col gap-8">
        <div className={`grid gap-6 ${showRent ? 'md:grid-cols-3' : showAuction ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          {!showRent && (
            <>
              <div>
                <label className="text-sm font-medium text-lighttext dark:text-darktext">Precio</label>
                <div className="relative mt-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={(commercial as any).price != null ? String((commercial as any).price) : ''}
                    onChange={(e) => {
                      const digits = sanitizeDigits((e.target as HTMLInputElement).value);
                      // Mantiene el cursor razonablemente y evita letras (incluye e/E)
                      if (digits === '') {
                        update('price', null);
                        setErrors((prev) => ({ ...prev, price: 'Precio requerido' }));
                        return;
                      }
                      const num = Number(digits);
                      update('price', Number.isFinite(num) ? num : null);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.price;
                        return next;
                      });
                    }}
                    placeholder={`15000000 (${currency})`}
                    error={errors.price}
                    className="pr-4"
                    shape="pill"
                  />
                </div>
                <p className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">Obligatorio para continuar</p>
              </div>

              {showAuction && (
                <div>
                  <Input
                    label={`Precio base subasta (${currency})`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={commercial.auction_start_price != null ? String(commercial.auction_start_price) : ''}
                    onChange={(e) => {
                      const digits = sanitizeDigits((e.target as HTMLInputElement).value);
                      if (digits === '') {
                        update('auction_start_price', null);
                        return;
                      }
                      const num = Number(digits);
                      update('auction_start_price', Number.isFinite(num) ? num : null);
                    }}
                    placeholder="1000000"
                    error={errors.auction_start_price}
                    shape="pill"
                  />
                </div>
              )}
            </>
          )}

          {showRent && (
            <>
              <div className="flex flex-col gap-1">
                <Input
                  label={`Precio de arriendo (${currency})`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={rentPriceInput}
                  onChange={e => {
                    const inputValue = sanitizeDigits((e.target as HTMLInputElement).value);
                    setRentPriceInput(inputValue);
                    if (inputValue === '') {
                      commitRentPrice(rentPeriod, null);
                      return;
                    }
                    const numeric = Number(inputValue);
                    if (!Number.isNaN(numeric)) {
                      commitRentPrice(rentPeriod, numeric);
                    }
                  }}
                  placeholder="25000"
                  error={errors.rent_price}
                  shape="pill"
                />
                <p className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">Obligatorio para publicar un arriendo</p>
              </div>
              <div className="flex flex-col gap-1">
                <Select
                  label="Periodo"
                  value={rentPeriod}
                  onChange={val => {
                    const nextPeriod = (val as RentPeriod) || 'daily';
                    setRentPeriod(nextPeriod);
                    if (rentPriceInput === '') {
                      commitRentPrice(nextPeriod, null);
                    } else {
                      const numeric = Number(rentPriceInput);
                      if (!Number.isNaN(numeric)) {
                        commitRentPrice(nextPeriod, numeric);
                      }
                    }
                  }}
                  options={[
                    { label: 'Diario', value: 'daily' },
                    { label: 'Semanal', value: 'weekly' },
                    { label: 'Mensual', value: 'monthly' },
                  ]}
                  shape="pill"
                  size="md"
                  error={errors.rent_price_period}
                />
                <p className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">Escoge cómo se cobra el arriendo</p>
              </div>
              <div className="flex flex-col gap-1">
                <Input
                  label="Depósito garantía (CLP)"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={commercial.rent_security_deposit ?? ''}
                  onChange={(e) => {
                    const raw = (e.target as HTMLInputElement).value;
                    if (raw === '') return update('rent_security_deposit', undefined as any);
                    const digits = sanitizeDigits(raw);
                    const num = Number(digits);
                    update('rent_security_deposit', Number.isFinite(num) ? (num as any) : (undefined as any));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-' || e.key === '.') {
                      e.preventDefault();
                    }
                  }}
                  onWheel={(e) => {
                    (e.target as HTMLInputElement).blur();
                  }}
                  placeholder="100000"
                  error={errors.rent_security_deposit}
                  shape="pill"
                />
                <p className="text-xs text-lighttext/70 dark:text-darktext/70 mt-1">Opcional</p>
              </div>
            </>
          )}
        </div>



        {showAuction && (
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {showAuction && (
              <>
              <div className="flex flex-col gap-1">
                {(() => {
                  const parts = splitDateTimeLocal(commercial.auction_start_at);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <DatePickerInput
                          label="Inicio subasta"
                          value={parts.date}
                          onChange={(next) => {
                            update('auction_start_at', combineDateTimeLocal(next, parts.time));
                          }}
                          error={errors.auction_start_at}
                          shape="pill"
                        />
                      </div>
                      <TimePickerInput
                        label="Hora"
                        value={parts.time}
                        onChange={(nextTime) => {
                          const nextDate = parts.date || (() => {
                            const now = new Date();
                            const yyyy = now.getFullYear();
                            const mm = String(now.getMonth() + 1).padStart(2, '0');
                            const dd = String(now.getDate()).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd}`;
                          })();
                          update('auction_start_at', combineDateTimeLocal(nextDate, nextTime));
                        }}
                        shape="pill"
                      />
                    </div>
                  );
                })()}
              </div>
              <div className="flex flex-col gap-1">
                {(() => {
                  const parts = splitDateTimeLocal(commercial.auction_end_at);
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <DatePickerInput
                          label="Fin subasta"
                          value={parts.date}
                          onChange={(next) => {
                            update('auction_end_at', combineDateTimeLocal(next, parts.time));
                          }}
                          error={errors.auction_end_at}
                          shape="pill"
                        />
                      </div>
                      <TimePickerInput
                        label="Hora"
                        value={parts.time}
                        onChange={(nextTime) => {
                          const nextDate = parts.date || (() => {
                            const now = new Date();
                            const yyyy = now.getFullYear();
                            const mm = String(now.getMonth() + 1).padStart(2, '0');
                            const dd = String(now.getDate()).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd}`;
                          })();
                          update('auction_end_at', combineDateTimeLocal(nextDate, nextTime));
                        }}
                        shape="pill"
                      />
                    </div>
                  );
                })()}
                {(() => {
                  const start = commercial.auction_start_at ? new Date(commercial.auction_start_at) : null;
                  const end = commercial.auction_end_at ? new Date(commercial.auction_end_at) : null;
                  let showBtn = false;
                  if (start && !isNaN(start.getTime())) {
                    if (!end) showBtn = true;
                    else if (!isNaN(end.getTime())) {
                      const diffDays = (end.getTime() - start.getTime()) / 86400000;
                      if (Math.abs(diffDays - 7) > 0.1) showBtn = true;
                    }
                  }
                  if (!showBtn) return null;
                  return (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="self-start mt-1 h-auto px-0 py-0 text-[11px] text-primary hover:underline"
                      onClick={() => {
                        if (start && !isNaN(start.getTime())) {
                          const endCalc = new Date(start);
                          endCalc.setDate(endCalc.getDate() + 7);
                          update('auction_end_at', formatLocalDateTime(endCalc));
                        }
                      }}
                    >
                      Usar +7 días desde inicio
                    </Button>
                  );
                })()}
                <span className="text-[10px] text-lighttext/70 dark:text-darktext/70 mt-1">Si no defines un fin, se sugiere automáticamente +7 días. Puedes modificarlo libremente.</span>
              </div>
              </>
            )}
          </div>
        )}

        <div className="mt-2" data-advanced-conditions>
          <div className="flex flex-col gap-6">
              {Object.keys(advancedErrors).length > 0 && (
                <div className="text-[11px] bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)] rounded-lg p-3 text-[var(--color-warn)]">
                  Revisa los campos marcados.
                </div>
              )}

              <div className="rounded-xl card-surface shadow-card p-4 flex flex-col gap-4 border border-border/60" data-advanced-bonuses>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-lighttext dark:text-darktext">Promociones</h4>
                    <p className="text-xs text-lighttext/70 dark:text-darktext/70">Bonos/promos para diferenciar la publicación.</p>
                  </div>
                  <Button
                    type="button"
                    variant={(commercial as any).promotions_available ? 'primary' : 'neutral'}
                    size="md"
                    aria-pressed={!!(commercial as any).promotions_available}
                    onClick={() => toggle('promotions_available')}
                  >
                    {(commercial as any).promotions_available ? 'Sí' : 'No'}
                  </Button>
                </div>
                {!!advancedErrors.bonuses_required && (
                  <div className="text-xs text-[var(--color-danger)]">{advancedErrors.bonuses_required}</div>
                )}
                {(commercial as any).promotions_available && (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-xs text-lighttext/70 dark:text-darktext/70">&nbsp;</span>
                      <Button type="button" variant="outline" size="sm" onClick={addBonus} disabled={!!bonusDraft}>
                        Agregar bono
                      </Button>
                    </div>

                    {bonusDraft && (
                      <div className="rounded-lg p-3 border border-border/60" data-bonus-draft>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-xs text-lighttext/70 dark:text-darktext/70">Nuevo bono (no se guardará hasta que presiones Aceptar).</p>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="neutral" size="sm" onClick={cancelBonusDraft}>
                              Cancelar
                            </Button>
                            <Button type="button" variant="primary" size="sm" onClick={acceptBonusDraft}>
                              Aceptar
                            </Button>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4 mt-3">
                          <Select
                            label="Tipo"
                            value={bonusDraft.type}
                            onChange={(value) => {
                              const type = (value as any) as WizardBonus['type'];
                              setBonusDraftErrors((prev) => {
                                const next = { ...prev };
                                delete next.type;
                                return next;
                              });
                              setBonusDraft((prev) => prev ? ({ ...prev, type }) : prev);
                            }}
                            options={[
                              { label: 'Efectivo', value: 'cash' },
                              { label: 'Accesorio', value: 'accessory' },
                              { label: 'Servicio', value: 'service' },
                            ]}
                            shape="pill"
                            size="md"
                          />
                          <div className="md:col-span-2">
                            <Input
                              label="Descripción"
                              value={bonusDraft.description}
                              onChange={(e) => {
                                const v = (e.target as HTMLInputElement).value;
                                setBonusDraftErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.description;
                                  return next;
                                });
                                setBonusDraft((prev) => prev ? ({ ...prev, description: v }) : prev);
                              }}
                              placeholder="Bono de bienvenida"
                              error={bonusDraftErrors.description}
                              shape="pill"
                            />
                          </div>
                          {bonusDraft.type === 'cash' ? (
                            <Input
                              label="Valor (CLP)"
                              type="number"
                              value={bonusDraft.value || ''}
                              onChange={(e) => {
                                const v = Number((e.target as HTMLInputElement).value) || 0;
                                setBonusDraftErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.value;
                                  return next;
                                });
                                setBonusDraft((prev) => prev ? ({ ...prev, value: v }) : prev);
                              }}
                              placeholder="50000"
                              error={bonusDraftErrors.value}
                              shape="pill"
                            />
                          ) : (
                            <div className="flex items-end">
                              <span className="text-xs text-lighttext/60 dark:text-darktext/60">—</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {(advanced.bonuses || []).map((bonus, index) => (
                      <div key={`bonus-${index}`} className="grid md:grid-cols-4 gap-4">
                        <Select
                          label="Tipo"
                          value={bonus.type}
                          onChange={(value) => updateBonus(index, 'type', value)}
                          options={[
                            { label: 'Efectivo', value: 'cash' },
                            { label: 'Accesorio', value: 'accessory' },
                            { label: 'Servicio', value: 'service' },
                          ]}
                          shape="pill"
                          size="md"
                        />
                        <div className="md:col-span-2">
                          <Input
                            label="Descripción"
                            value={bonus.description}
                            onChange={(e) => updateBonus(index, 'description', (e.target as HTMLInputElement).value)}
                            placeholder="Bono de bienvenida"
                            error={advancedErrors[`bonus_${index}_description`]}
                            shape="pill"
                          />
                        </div>
                        {bonus.type === 'cash' ? (
                          <Input
                            label="Valor (CLP)"
                            type="number"
                            value={bonus.value || ''}
                            onChange={(e) => updateBonus(index, 'value', Number((e.target as HTMLInputElement).value) || 0)}
                            placeholder="50000"
                            error={advancedErrors[`bonus_${index}_value`]}
                            shape="pill"
                          />
                        ) : (
                          <div className="flex items-end">
                            <span className="text-xs text-lighttext/60 dark:text-darktext/60">—</span>
                          </div>
                        )}
                        <div className="flex items-end">
                          <Button type="button" variant="outline" size="sm" onClick={() => removeBonus(index)}>
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {!(commercial as any).promotions_available && (
                  <p className="text-xs text-lighttext/70 dark:text-darktext/70">Activa “Sí” para agregar promociones.</p>
                )}
              </div>

              <div className="rounded-xl card-surface shadow-card p-4 flex flex-col gap-4 border border-border/60" data-advanced-discounts>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-lighttext dark:text-darktext">Descuentos</h4>
                    <p className="text-xs text-lighttext/70 dark:text-darktext/70">Descuentos estructurados (distinto al descuento del precio principal).</p>
                  </div>
                  <Button
                    type="button"
                    variant={(commercial as any).discounts_available ? 'primary' : 'neutral'}
                    size="md"
                    aria-pressed={!!(commercial as any).discounts_available}
                    onClick={() => toggle('discounts_available')}
                  >
                    {(commercial as any).discounts_available ? 'Sí' : 'No'}
                  </Button>
                </div>
                {!!advancedErrors.discounts_required && (
                  <div className="text-xs text-[var(--color-danger)]">{advancedErrors.discounts_required}</div>
                )}
                {(commercial as any).discounts_available && (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-xs text-lighttext/70 dark:text-darktext/70">&nbsp;</span>
                      <Button type="button" variant="outline" size="sm" onClick={addDiscount} disabled={!!discountDraft}>
                        Agregar descuento
                      </Button>
                    </div>

                    {discountDraft && (
                      <div className="rounded-lg p-3 border border-border/60" data-discount-draft>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-xs text-lighttext/70 dark:text-darktext/70">Nuevo descuento (no se guardará hasta que presiones Aceptar).</p>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="neutral" size="sm" onClick={cancelDiscountDraft}>
                              Cancelar
                            </Button>
                            <Button type="button" variant="primary" size="sm" onClick={acceptDiscountDraft}>
                              Aceptar
                            </Button>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-5 gap-4 mt-3">
                          <Select
                            label="Tipo"
                            value={discountDraft.type}
                            onChange={(value) => {
                              const type = (value as any) as WizardDiscount['type'];
                              setDiscountDraftErrors((prev) => {
                                const next = { ...prev };
                                delete next.type;
                                return next;
                              });
                              setDiscountDraft((prev) => prev ? ({ ...prev, type }) : prev);
                            }}
                            options={[
                              { label: 'Porcentaje', value: 'percentage' },
                              { label: 'Monto fijo', value: 'fixed_amount' },
                            ]}
                            shape="pill"
                            size="md"
                          />
                          <Input
                            label={discountDraft.type === 'percentage' ? 'Valor (%)' : 'Valor (CLP)'}
                            type="number"
                            value={discountDraft.value}
                            onChange={(e) => {
                              const v = Number((e.target as HTMLInputElement).value) || 0;
                              setDiscountDraftErrors((prev) => {
                                const next = { ...prev };
                                delete next.value;
                                return next;
                              });
                              setDiscountDraft((prev) => prev ? ({ ...prev, value: v }) : prev);
                            }}
                            placeholder={discountDraft.type === 'percentage' ? '10' : '50000'}
                            error={discountDraftErrors.value}
                            shape="pill"
                          />
                          <div className="md:col-span-2">
                            <Input
                              label="Descripción"
                              value={discountDraft.description}
                              onChange={(e) => {
                                const v = (e.target as HTMLInputElement).value;
                                setDiscountDraftErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.description;
                                  return next;
                                });
                                setDiscountDraft((prev) => prev ? ({ ...prev, description: v }) : prev);
                              }}
                              placeholder="Descuento por pago contado"
                              error={discountDraftErrors.description}
                              shape="pill"
                            />
                          </div>
                          <div className="flex items-end">
                            <DatePickerInput
                              label="Válido hasta"
                              value={discountDraft.valid_until || null}
                              onChange={(next) => {
                                setDiscountDraftErrors((prev) => {
                                  const copy = { ...prev };
                                  delete copy.valid_until;
                                  return copy;
                                });
                                setDiscountDraft((prev) => (prev ? ({ ...prev, valid_until: next || '' }) : prev));
                              }}
                              error={discountDraftErrors.valid_until}
                              shape="pill"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(advanced.discounts || []).map((discount, index) => (
                      <div key={`disc-${index}`} className="grid md:grid-cols-5 gap-4">
                        <Select
                          label="Tipo"
                          value={discount.type}
                          onChange={(value) => updateDiscount(index, 'type', value)}
                          options={[
                            { label: 'Porcentaje', value: 'percentage' },
                            { label: 'Monto fijo', value: 'fixed_amount' },
                          ]}
                          shape="pill"
                          size="md"
                        />
                        <Input
                          label={discount.type === 'percentage' ? 'Valor (%)' : 'Valor (CLP)'}
                          type="number"
                          value={discount.value}
                          onChange={(e) => updateDiscount(index, 'value', Number((e.target as HTMLInputElement).value) || 0)}
                          placeholder={discount.type === 'percentage' ? '10' : '50000'}
                          error={advancedErrors[`discount_${index}_value`] || advancedErrors[`discount_${index}_percentage`]}
                          shape="pill"
                        />
                        <div className="md:col-span-2">
                          <Input
                            label="Descripción"
                            value={discount.description}
                            onChange={(e) => updateDiscount(index, 'description', (e.target as HTMLInputElement).value)}
                            placeholder="Descuento por pago contado"
                            error={advancedErrors[`discount_${index}_description`]}
                            shape="pill"
                          />
                        </div>
                        <div className="flex items-end gap-2">
                          <DatePickerInput
                            label="Válido hasta"
                            value={discount.valid_until || null}
                            onChange={(next) => updateDiscount(index, 'valid_until', next || '')}
                            error={advancedErrors[`discount_${index}_valid_until`]}
                            shape="pill"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={() => removeDiscount(index)}>
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {!(commercial as any).discounts_available && (
                  <p className="text-xs text-lighttext/70 dark:text-darktext/70">Activa “Sí” para agregar descuentos.</p>
                )}
              </div>

              {!showRent && (
                <>

              <div className="rounded-xl card-surface shadow-card p-4 flex flex-col gap-4 border border-border/60" data-advanced-financing>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-lighttext dark:text-darktext">Financiamiento</h4>
                    <p className="text-xs text-lighttext/70 dark:text-darktext/70">Simulaciones por banco/entidad (si aplica).</p>
                  </div>
                  <Button
                    type="button"
                    variant={commercial.financing_available ? 'primary' : 'neutral'}
                    size="md"
                    aria-pressed={!!commercial.financing_available}
                    onClick={() => toggle('financing_available')}
                  >
                    {commercial.financing_available ? 'Sí' : 'No'}
                  </Button>
                </div>
                {!!advancedErrors.financing_required && (
                  <div className="text-xs text-[var(--color-danger)]">{advancedErrors.financing_required}</div>
                )}
                {commercial.financing_available && (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <span className="text-xs text-lighttext/70 dark:text-darktext/70">&nbsp;</span>
                      <Button type="button" variant="outline" size="sm" onClick={addFinancingOption} disabled={!!financingDraft}>
                        Agregar opción
                      </Button>
                    </div>

                    {financingDraft && (
                      <div className="rounded-lg p-3 border border-border/60" data-financing-draft>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-xs text-lighttext/70 dark:text-darktext/70">Nueva opción (no se guardará hasta que presiones Aceptar).</p>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="neutral" size="sm" onClick={cancelFinancingDraft}>
                              Cancelar
                            </Button>
                            <Button type="button" variant="primary" size="sm" onClick={acceptFinancingDraft}>
                              Aceptar
                            </Button>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-5 gap-4 mt-3">
                          <Select
                            label="Banco/Entidad"
                            value={isKnownFinancingEntity(financingDraft.bank) ? financingDraft.bank : FINANCING_OTHER_VALUE}
                            onChange={(value) => {
                              const v = String(value || '');
                              setFinancingDraftErrors((prev) => {
                                const next = { ...prev };
                                delete next.bank;
                                return next;
                              });
                              if (v === FINANCING_OTHER_VALUE) {
                                setFinancingDraft((prev) => (prev ? ({ ...prev, bank: '' }) : prev));
                              } else {
                                setFinancingDraft((prev) => (prev ? ({ ...prev, bank: v }) : prev));
                              }
                            }}
                            options={FINANCING_ENTITY_OPTIONS}
                            shape="pill"
                            size="md"
                            error={financingDraftErrors.bank}
                          />
                          {!isKnownFinancingEntity(financingDraft.bank) && (
                            <Input
                              label="Especificar entidad"
                              value={financingDraft.bank}
                              onChange={(e) => {
                                const v = (e.target as HTMLInputElement).value;
                                setFinancingDraftErrors((prev) => {
                                  const next = { ...prev };
                                  delete next.bank;
                                  return next;
                                });
                                setFinancingDraft((prev) => (prev ? ({ ...prev, bank: v }) : prev));
                              }}
                              placeholder="Ej: Banco XYZ / Financiera"
                              error={financingDraftErrors.bank}
                              shape="pill"
                            />
                          )}
                          <Input
                            label="Tasa (%)"
                            type="number"
                            step="0.1"
                            value={financingDraft.rate}
                            onChange={(e) => {
                              const v = Number((e.target as HTMLInputElement).value);
                              setFinancingDraftErrors((prev) => {
                                const next = { ...prev };
                                delete next.rate;
                                return next;
                              });
                              setFinancingDraft((prev) => prev ? ({ ...prev, rate: Number.isFinite(v) ? v : 0 }) : prev);
                            }}
                            placeholder="5.5"
                            error={financingDraftErrors.rate}
                            shape="pill"
                          />
                          <Input
                            label="Plazo (meses)"
                            type="number"
                            value={financingDraft.term_months}
                            onChange={(e) => {
                              const v = Number((e.target as HTMLInputElement).value);
                              setFinancingDraftErrors((prev) => {
                                const next = { ...prev };
                                delete next.term_months;
                                return next;
                              });
                              setFinancingDraft((prev) => prev ? ({ ...prev, term_months: Number.isFinite(v) ? v : 12 }) : prev);
                            }}
                            placeholder="60"
                            error={financingDraftErrors.term_months}
                            shape="pill"
                          />
                          <Input
                            label="Pie (%)"
                            type="number"
                            value={financingDraft.down_payment_percent}
                            onChange={(e) => {
                              const v = Number((e.target as HTMLInputElement).value);
                              setFinancingDraftErrors((prev) => {
                                const next = { ...prev };
                                delete next.down_payment_percent;
                                return next;
                              });
                              setFinancingDraft((prev) => prev ? ({ ...prev, down_payment_percent: Number.isFinite(v) ? v : 20 }) : prev);
                            }}
                            placeholder="20"
                            error={financingDraftErrors.down_payment_percent}
                            shape="pill"
                          />
                          <div className="flex items-end">
                            <span className="text-xs text-lighttext/60 dark:text-darktext/60">—</span>
                          </div>
                        </div>

                        {(() => {
                          const estimate = calcFinancingEstimate({
                            price: commercial.price,
                            currency,
                            annualRatePercent: financingDraft.rate,
                            termMonths: financingDraft.term_months,
                            downPaymentPercent: financingDraft.down_payment_percent,
                          });
                          if (!estimate) return null;
                          return (
                            <div className="mt-2 text-[11px] text-lighttext/60 dark:text-darktext/60 leading-tight">
                              Cuota est.: {formatPrice(estimate.monthlyPayment, { currency })}
                              <span className="mx-2">·</span>
                              Pie: {formatPrice(estimate.downPaymentAmount, { currency })}
                              <span className="mx-2">·</span>
                              Financia: {formatPrice(estimate.financedAmount, { currency })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {(advanced.financing || []).map((option, index) => (
                      <div key={`fin-${index}`} className="rounded-lg p-3 border border-border/0">
                        <div className="grid md:grid-cols-5 gap-4">
                        <Select
                          label="Banco/Entidad"
                          value={isKnownFinancingEntity(option.bank) ? option.bank : FINANCING_OTHER_VALUE}
                          onChange={(value) => {
                            const v = String(value || '');
                            if (v === FINANCING_OTHER_VALUE) updateFinancingOption(index, 'bank', '');
                            else updateFinancingOption(index, 'bank', v);
                          }}
                          options={FINANCING_ENTITY_OPTIONS}
                          shape="pill"
                          size="md"
                          error={advancedErrors[`financing_${index}_bank`]}
                        />
                        {!isKnownFinancingEntity(option.bank) && (
                          <Input
                            label="Especificar entidad"
                            value={option.bank}
                            onChange={(e) => updateFinancingOption(index, 'bank', (e.target as HTMLInputElement).value)}
                            placeholder="Ej: Banco XYZ / Financiera"
                            error={advancedErrors[`financing_${index}_bank`]}
                            shape="pill"
                          />
                        )}
                        <Input
                          label="Tasa (%)"
                          type="number"
                          step="0.1"
                          value={option.rate}
                          onChange={(e) => updateFinancingOption(index, 'rate', Number((e.target as HTMLInputElement).value) || 0)}
                          placeholder="5.5"
                          error={advancedErrors[`financing_${index}_rate`]}
                          shape="pill"
                        />
                        <Input
                          label="Plazo (meses)"
                          type="number"
                          value={option.term_months}
                          onChange={(e) => updateFinancingOption(index, 'term_months', Number((e.target as HTMLInputElement).value) || 12)}
                          placeholder="60"
                          error={advancedErrors[`financing_${index}_term_months`]}
                          shape="pill"
                        />
                        <Input
                          label="Pie (%)"
                          type="number"
                          value={option.down_payment_percent}
                          onChange={(e) => updateFinancingOption(index, 'down_payment_percent', Number((e.target as HTMLInputElement).value) || 20)}
                          placeholder="20"
                          error={advancedErrors[`financing_${index}_down_payment_percent`]}
                          shape="pill"
                        />
                        <div className="flex items-end justify-end">
                          <Button type="button" variant="outline" size="sm" onClick={() => removeFinancingOption(index)}>
                            Eliminar
                          </Button>
                        </div>
                        </div>

                        {(() => {
                          const estimate = calcFinancingEstimate({
                            price: commercial.price,
                            currency,
                            annualRatePercent: option.rate,
                            termMonths: option.term_months,
                            downPaymentPercent: option.down_payment_percent,
                          });
                          if (!estimate) return null;
                          return (
                            <div className="mt-2 text-[11px] text-lighttext/60 dark:text-darktext/60 leading-tight">
                              Cuota est.: {formatPrice(estimate.monthlyPayment, { currency })}
                              <span className="mx-2">·</span>
                              Pie: {formatPrice(estimate.downPaymentAmount, { currency })}
                              <span className="mx-2">·</span>
                              Financia: {formatPrice(estimate.financedAmount, { currency })}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </>
                )}
                {!commercial.financing_available && (
                  <p className="text-xs text-lighttext/70 dark:text-darktext/70">Activa “Sí” para agregar opciones de financiamiento.</p>
                )}
              </div>

              <div className="rounded-xl card-surface shadow-card p-4 flex flex-col gap-4 border border-border/60">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-lighttext dark:text-darktext">Permuta</h4>
                    <p className="text-xs text-lighttext/70 dark:text-darktext/70">Recibe un vehículo como parte de pago (según condiciones).</p>
                  </div>
                  <Button
                    type="button"
                    variant={commercial.exchange_considered ? 'primary' : 'neutral'}
                    size="md"
                    aria-pressed={!!commercial.exchange_considered}
                    onClick={() => toggle('exchange_considered')}
                  >
                    {commercial.exchange_considered ? 'Sí' : 'No'}
                  </Button>
                </div>

                {commercial.exchange_considered && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <Select
                      label="¿Qué aceptas en permuta?"
                      value={normalizeExchangeAccepts((commercial as any).exchange_accepts) ?? 'depends'}
                      onChange={(value) => {
                        const v = normalizeExchangeAccepts(value) ?? 'depends';
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.exchange_accepts;
                          return next;
                        });
                        patch('commercial', { exchange_accepts: v } as Partial<WizardCommercial>);
                      }}
                      options={[
                        { label: 'Auto / SUV / Camioneta', value: 'car_suv_pickup' },
                        { label: 'Moto', value: 'motorcycle' },
                        { label: 'Vehículo comercial (furgón/camión)', value: 'commercial_vehicle' },
                        { label: 'Depende del caso', value: 'depends' },
                      ]}
                      shape="pill"
                      size="md"
                      error={errors.exchange_accepts}
                    />
                    <Select
                      label="¿Cómo se maneja la diferencia?"
                      value={normalizeExchangeBalance((commercial as any).exchange_balance) ?? 'negotiable'}
                      onChange={(value) => {
                        const v = normalizeExchangeBalance(value) ?? 'negotiable';
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next.exchange_balance;
                          return next;
                        });
                        patch('commercial', { exchange_balance: v } as Partial<WizardCommercial>);
                      }}
                      options={[
                        { label: 'Permuta + dinero a mi favor', value: 'to_seller' },
                        { label: 'Permuta + dinero a favor del comprador', value: 'to_buyer' },
                        { label: 'Se negocia', value: 'negotiable' },
                      ]}
                      shape="pill"
                      size="md"
                      error={errors.exchange_balance}
                    />
                  </div>
                )}

                {!commercial.exchange_considered && (
                  <p className="text-xs text-lighttext/70 dark:text-darktext/70">Activa “Sí” para definir opciones de permuta.</p>
                )}
              </div>

              <div className="rounded-xl card-surface shadow-card p-4 flex flex-col gap-4 border border-border/60">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex flex-col">
                    <h4 className="text-sm font-semibold text-lighttext dark:text-darktext">Garantía</h4>
                    <p className="text-xs text-lighttext/70 dark:text-darktext/70">
                      Garantía ofrecida en esta venta (distinta a garantía vigente de fábrica).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={advanced.warranty_offer ? 'primary' : 'neutral'}
                    size="md"
                    aria-pressed={!!advanced.warranty_offer}
                    onClick={() => {
                      if (advanced.warranty_offer) {
                        setWarrantyOfferAndFlags(null);
                      } else {
                        setWarrantyOfferAndFlags({ kind: 'seller', duration_months: null, provider: null, details: null });
                      }
                    }}
                  >
                    {advanced.warranty_offer ? 'Sí' : 'No'}
                  </Button>
                </div>

                {advanced.warranty_offer && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Tipo"
                      value={advanced.warranty_offer.kind}
                      onChange={(value) => {
                        const kind = String(value) === 'extended' ? 'extended' : 'seller';
                        const current = advanced.warranty_offer || { kind: 'seller' };
                        setWarrantyOfferAndFlags({
                          ...current,
                          kind,
                          provider: kind === 'extended' ? (current.provider ?? null) : null,
                        });
                      }}
                      options={[
                        { label: 'Garantía del vendedor', value: 'seller' },
                        { label: 'Garantía extendida', value: 'extended' },
                      ]}
                      shape="pill"
                      size="md"
                    />

                    <Input
                      label="Duración (meses)"
                      type="number"
                      value={advanced.warranty_offer.duration_months ?? ''}
                      onChange={(e) => {
                        const raw = (e.target as HTMLInputElement).value;
                        const num = raw.trim() ? Number(raw) : null;
                        const duration = (num != null && Number.isFinite(num)) ? Math.max(1, Math.min(120, Math.round(num))) : null;
                        setWarrantyOffer({ ...(advanced.warranty_offer as WizardWarrantyOffer), duration_months: duration });
                      }}
                      placeholder="Ej: 3"
                      shape="pill"
                    />

                    {advanced.warranty_offer.kind === 'extended' && (
                      <Input
                        label="Proveedor/Plan (opcional)"
                        value={advanced.warranty_offer.provider ?? ''}
                        onChange={(e) => {
                          const v = (e.target as HTMLInputElement).value;
                          setWarrantyOffer({ ...(advanced.warranty_offer as WizardWarrantyOffer), provider: v.trim().length ? v : null });
                        }}
                        placeholder="Ej: Forum / Mitsui / Aseguradora"
                        shape="pill"
                      />
                    )}
                  </div>
                )}

                {!advanced.warranty_offer && (
                  <p className="text-xs text-lighttext/70 dark:text-darktext/70">Activa “Sí” para definir la garantía ofrecida.</p>
                )}

                {advanced.warranty_offer && (
                  <div>
                    <Textarea
                      label="Detalle (opcional)"
                      value={advanced.warranty_offer.details ?? ''}
                      onChange={(e) => {
                        const v = (e.target as HTMLTextAreaElement).value;
                        setWarrantyOffer({ ...(advanced.warranty_offer as WizardWarrantyOffer), details: v.trim().length ? v : null });
                      }}
                      maxLength={300}
                      rows={3}
                      placeholder='Ej: “Motor y caja”, “hasta 10.000 km”, “excluye desgaste”.'
                      size="md"
                      shape="rounded"
                    />
                    <div className="text-[10px] mt-1 text-lighttext/70 dark:text-darktext/70">{(advanced.warranty_offer.details || '').length}/300</div>
                  </div>
                )}
              </div>

                </>
              )}
            </div>
          </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2 text-lighttext dark:text-darktext">Opciones de la publicación</h3>
          <div className="flex flex-wrap gap-2">
            {(showRent
              ? ([
                { code: 'precio_negociable', label: 'Precio de arriendo negociable' },
                { code: 'entrega_inmediata', label: 'Entrega inmediata' },
                { code: 'entrega_domicilio', label: 'Entrega a domicilio' },
                { code: 'pago_tarjeta', label: 'Acepta pago con tarjeta' },
                { code: 'pago_transferencia', label: 'Acepta transferencia' },
              ] as const)
              : ([
                { code: 'precio_negociable', label: 'Precio negociable' },
                { code: 'entrega_inmediata', label: 'Entrega inmediata' },
                { code: 'entrega_domicilio', label: 'Entrega a domicilio' },
                { code: 'pago_tarjeta', label: 'Acepta pago con tarjeta' },
                { code: 'pago_transferencia', label: 'Acepta transferencia' },
                { code: 'financiamiento_directo', label: 'Financiamiento directo' },
              ] as const)
            ).map(({ code, label }) => {
              const active = (condiciones.flags || []).includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={active}
                  className={`text-xs px-3 py-2 rounded-md border transition text-left flex items-center gap-2 ${active ? 'bg-primary text-[var(--color-on-primary)] border-primary shadow-sm' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:border-[var(--color-primary-a50)] hover:bg-[var(--color-primary-a05)] text-[var(--field-text)]'}`}
                  onClick={() => {
                    const flags = new Set(condiciones.flags || []);
                    if (flags.has(code)) flags.delete(code);
                    else flags.add(code);
                    updateCondiciones({ flags: Array.from(flags) });
                  }}
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-current opacity-70" />
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            {(() => {
              const flags = condiciones.flags || [];
              const hasWarranty = !!advanced.warranty_offer || flags.includes('garantia_vendedor') || flags.includes('garantia_extendida');
              const placeholderBase = 'Términos específicos, condiciones especiales, etc. (máx 2000 caracteres)';
              const placeholder = hasWarranty
                ? `${placeholderBase}. Ej: “3 meses por motor y caja” / “Cobertura hasta 10.000 km”.`
                : placeholderBase;
              return (
                <Textarea
                  label="Condiciones adicionales"
                  value={condiciones.notas || ''}
                  onChange={e => updateCondiciones({ notas: (e.target as HTMLTextAreaElement).value })}
                  maxLength={2000}
                  rows={4}
                  placeholder={placeholder}
                  size="md"
                  shape="rounded"
                />
              );
            })()}
            <div data-condiciones-notas>
              {!!errors.condiciones_notas && (
                <div className="text-xs mt-2 text-[var(--color-danger)]">{errors.condiciones_notas}</div>
              )}
              <div className="text-[10px] mt-1 text-lighttext/70 dark:text-darktext/70">{(condiciones.notas || '').length}/2000</div>
            </div>
          </div>
        </div>
      </div>
    </WizardStepLayout>
  );
};

export default StepCommercial;







