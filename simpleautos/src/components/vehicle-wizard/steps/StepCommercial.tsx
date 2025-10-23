"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import Select from '@/components/ui/form/Select';
import Input from '@/components/ui/form/Input';
import { saveVehicleSpecs } from '@/lib/saveVehicleSpecs';
import { CondicionesComerciales, HistorialVehiculoTag } from '@/types/vehicle';

// Eliminados esquemas y estilos no utilizados (eran vestigios de iteraciones previas)

interface ErrorMap { [k: string]: string | undefined }
type RentPeriod = 'daily' | 'weekly' | 'monthly';

const StepCommercial: React.FC = () => {
  const { state, patch, setStep } = useWizard();
  const { listing_type } = state;
  const basic = state.basic as any;
  const commercial = state.commercial as any;
  const condiciones: CondicionesComerciales = commercial.condiciones || { flags: [], notas: null };
  const [errors, setErrors] = useState<ErrorMap>({});
  const [discountMode, setDiscountMode] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<number | null>(null);

  const validRentPeriod = (value: any): value is RentPeriod => value === 'daily' || value === 'weekly' || value === 'monthly';
  const computeRentPeriod = (c: any): RentPeriod => {
    if (validRentPeriod(c?.rent_price_period)) return c.rent_price_period as RentPeriod;
    if (c?.rent_daily_price != null) return 'daily';
    if (c?.rent_weekly_price != null) return 'weekly';
    if (c?.rent_monthly_price != null) return 'monthly';
    return 'daily';
  };
  const computeRentPriceFor = (c: any, period: RentPeriod) => {
    const value = c?.[`rent_${period}_price`];
    return value != null ? String(value) : '';
  };

  const initialRentPeriod = computeRentPeriod(commercial);
  const [rentPeriod, setRentPeriod] = useState<RentPeriod>(initialRentPeriod);
  const [rentPriceInput, setRentPriceInput] = useState<string>(() => computeRentPriceFor(commercial, initialRentPeriod));

  useEffect(() => {
    if (!commercial.condiciones) {
      patch('commercial', { condiciones } as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercial.condiciones]);

  useEffect(() => {
    const normalized = { ...commercial, condiciones };
    const base = validateStepData('commercial', normalized);
    let ok = base.ok;
    const extErrors: ErrorMap = { ...(base.errors || {}) };

    const price = (commercial as any).price;
    if (listing_type === 'sale' || listing_type === 'auction') {
      if (price == null || price <= 0) { ok = false; extErrors.price = 'Precio requerido (>0)'; }
    } else if (listing_type === 'rent') {
      if (price != null && price < 0) { ok = false; extErrors.price = 'Precio inválido'; }
    }

    if (commercial.offer_price != null) {
      if (price == null || price <= 0) { ok = false; extErrors.offer_price = 'Definir precio base primero'; }
      else if (commercial.offer_price >= price) { ok = false; extErrors.offer_price = 'El precio con descuento debe ser menor al precio base'; }
      else if (commercial.offer_price <= 0) { ok = false; extErrors.offer_price = 'Precio con descuento inválido'; }
    }

    if (commercial.discount_type) {
      if (!commercial.offer_price || commercial.offer_price >= (price || 0)) {
        ok = false; extErrors.discount_type = 'Ingresa un descuento válido';
      }
    }

    if (commercial.discount_valid_until) {
      const d = new Date(commercial.discount_valid_until + 'T23:59:59');
      if (isNaN(d.getTime())) { ok = false; extErrors.discount_valid_until = 'Fecha inválida'; }
    }

    if (listing_type === 'rent') {
      const period = computeRentPeriod(commercial);
      const rentPrice = commercial[`rent_${period}_price`];
      const definedPrices = [commercial.rent_daily_price, commercial.rent_weekly_price, commercial.rent_monthly_price].filter(v => v != null);

      if (!period) {
        ok = false; extErrors.rent_price_period = 'Selecciona un periodo';
      }

      if (rentPrice == null || rentPrice === '') {
        ok = false; extErrors.rent_price = 'Define un precio';
      } else if (rentPrice <= 0) {
        ok = false; extErrors.rent_price = 'Debe ser > 0';
      }

      if (definedPrices.length > 1) {
        ok = false; extErrors.rent_price = 'Solo se admite un periodo a la vez';
      }

      if (commercial.rent_security_deposit != null && commercial.rent_security_deposit < 0) {
        ok = false; extErrors.rent_security_deposit = 'No negativo';
      }
    }

    if (listing_type === 'auction') {
      const startPrice = commercial.auction_start_price;
      if (startPrice == null || startPrice <= 0) {
        ok = false; extErrors.auction_start_price = 'Requerido (>0)';
      }
      const startAt = commercial.auction_start_at ? new Date(commercial.auction_start_at) : null;
      const endAt = commercial.auction_end_at ? new Date(commercial.auction_end_at) : null;
      const now = new Date();
      if (!startAt || isNaN(startAt.getTime()) || startAt.getTime() < now.getTime() - 60000) {
        ok = false; extErrors.auction_start_at = 'Fecha inicio inválida (>= ahora)';
      }
      if (!endAt || isNaN(endAt.getTime())) {
        ok = false; extErrors.auction_end_at = 'Fin requerido';
      } else if (startAt && endAt.getTime() <= startAt.getTime() + 3600000) {
        ok = false; extErrors.auction_end_at = 'Fin mínimo +1h';
      } else if (startAt && endAt.getTime() - startAt.getTime() > 30 * 24 * 3600000) {
        ok = false; extErrors.auction_end_at = 'Máx 30 días';
      }
    }

    setErrors(ok ? {} : extErrors);
    patch('validity', { commercial: ok });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing_type, commercial.visibility, commercial.price, commercial.offer_price, commercial.discount_type, commercial.discount_valid_until, commercial.financing_available, commercial.exchange_considered, commercial.rent_daily_price, commercial.rent_weekly_price, commercial.rent_monthly_price, commercial.rent_price_period, commercial.rent_security_deposit, commercial.auction_start_price, commercial.auction_start_at, commercial.auction_end_at, JSON.stringify(condiciones)]);

  useEffect(() => {
    if (!commercial.discount_valid_until || !commercial.offer_price) return;
    const end = new Date(commercial.discount_valid_until + 'T23:59:59');
    if (isNaN(end.getTime())) return;
    if (end.getTime() < Date.now()) {
      patch('commercial', { offer_price: undefined, discount_type: undefined, discount_valid_until: undefined } as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercial.discount_valid_until, commercial.offer_price]);

  const formatLocalDateTime = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (listing_type === 'auction' && commercial.auction_start_at && !commercial.auction_end_at) {
      const start = new Date(commercial.auction_start_at);
      if (!isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        patch('commercial', { auction_end_at: formatLocalDateTime(end) } as any);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing_type, commercial.auction_start_at]);

  useEffect(() => {
    if ((basic as any).price != null && (commercial as any).price == null) {
      patch('commercial', { price: (basic as any).price } as any);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c: any = commercial;
    if (c.offer_price == null) {
      const legacyPrev = (c as any).previous_price;
      const legacyPct = (c as any).discount_percent;
      const legacyAmt = (c as any).discount_amount;
      const base = c.price;
      let offer: number | null = null;
      if (base != null && base > 0) {
        if (legacyPct != null && legacyPct > 0 && legacyPct < 100) {
          offer = Math.max(1, Math.floor(base - (base * legacyPct) / 100));
        } else if (legacyAmt != null && legacyAmt > 0 && legacyAmt < base) {
          offer = base - legacyAmt;
        } else if (legacyPrev != null && legacyPrev > base) {
        }
      }
      if (offer && offer > 0 && base && offer < base) {
        patch('commercial', { offer_price: offer } as any);
      }
    }

    const existingFlags: string[] = Array.isArray(commercial.condiciones?.flags) ? commercial.condiciones.flags : [];
    if (existingFlags.length === 0) {
      const flags = new Set<string>();
      if (commercial.financing_available) flags.add('financiamiento_disponible');
      if (commercial.exchange_considered) flags.add('acepta_permuta');
      if (flags.size > 0) {
        patch('commercial', { condiciones: { ...(commercial.condiciones || { notas: null, flags: [] }), flags: Array.from(flags) } } as any);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const legacyFlags = new Set(commercial.condiciones?.flags || []);
    if (legacyFlags.size === 0) return;
    let touched = false;
    const move: HistorialVehiculoTag[] = [];
    if (legacyFlags.delete('papeles_al_dia')) { move.push('mantencion_al_dia' as HistorialVehiculoTag); touched = true; }
    if (legacyFlags.delete('revision_tecnica_al_dia')) { move.push('revision_tecnica_vigente' as HistorialVehiculoTag); touched = true; }
    if (legacyFlags.delete('garantia_legal')) { touched = true; }
    if (!touched) return;
    if (move.length > 0) {
      const current = state.vehicle.historial || [];
      const merged = Array.from(new Set<HistorialVehiculoTag>([...current, ...move])) as HistorialVehiculoTag[];
      patch('vehicle', { historial: merged });
    }
    patch('commercial', { condiciones: { ...(commercial.condiciones || { notas: null, flags: [] }), flags: Array.from(legacyFlags) } } as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback((field: string, value: any) => {
    patch('commercial', { [field]: value } as any);
  }, [patch]);

  const updateCondiciones = (next: Partial<CondicionesComerciales>) => {
    patch('commercial', { condiciones: { ...condiciones, ...next } } as any);
  };

  const handleContinue = () => {
    if (Object.keys(errors).length > 0) return;
    setStep('review');
  };

  const toggle = (field: string) => {
    update(field, !commercial[field]);
  };

  useEffect(() => {
    if (!(state as any).vehicle_id) return;
    const id = (state as any).vehicle_id as string;
    const typeSlug = state.vehicle.type_key || '';
    const timeout = setTimeout(async () => {
      try {
        const mergedSpecs: Record<string, any> = { ...(state.vehicle.specs || {}) };
        mergedSpecs._commercial = {
          visibility: commercial.visibility,
          financing_available: !!commercial.financing_available,
          exchange_considered: !!commercial.exchange_considered,
          rent_daily_price: commercial.rent_daily_price,
          rent_weekly_price: commercial.rent_weekly_price,
          rent_monthly_price: commercial.rent_monthly_price,
          rent_price_period: commercial.rent_price_period,
          rent_security_deposit: commercial.rent_security_deposit,
          auction_start_price: commercial.auction_start_price,
          auction_start_at: commercial.auction_start_at,
          auction_end_at: commercial.auction_end_at,
        };
        await saveVehicleSpecs({ vehicleId: id, typeSlug, specs: mergedSpecs });
      } catch (e) {
        console.warn('[StepCommercial] Error guardando intermedio', e);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [state, state.vehicle.type_key, commercial.visibility, commercial.financing_available, commercial.exchange_considered, commercial.rent_daily_price, commercial.rent_weekly_price, commercial.rent_monthly_price, commercial.rent_price_period, commercial.rent_security_deposit, commercial.auction_start_price, commercial.auction_start_at, commercial.auction_end_at]);

  const showRent = listing_type === 'rent';
  const showAuction = listing_type === 'auction';
  const discountType = commercial.discount_type;

  useEffect(() => {
    if (commercial.offer_price && commercial.price && !discountValue && discountType) {
      const diff = commercial.price - commercial.offer_price;
      const percentCalc = (diff / commercial.price) * 100;

      if (discountType === 'percent') {
        setDiscountMode('percent');
        setDiscountValue(Math.round(percentCalc * 100) / 100);
      } else if (discountType === 'amount') {
        setDiscountMode('amount');
        setDiscountValue(diff);
      } else {
        setDiscountMode('percent');
        setDiscountValue(Math.round(percentCalc * 100) / 100);
      }
    }
  }, [commercial.offer_price, commercial.price, discountType, discountValue]);

  useEffect(() => {
    if (!discountType) {
      setDiscountValue(null);
      update('offer_price', null);
    }
  }, [discountType, update]);

  const commitRentPrice = (period: RentPeriod, value: number | null) => {
    const payload: Record<string, number | undefined> = {
      rent_daily_price: undefined,
      rent_weekly_price: undefined,
      rent_monthly_price: undefined,
    };
    if (value != null && !Number.isNaN(value)) {
      payload[`rent_${period}_price`] = value;
    }
    patch('commercial', { ...payload, rent_price_period: period } as any);
  };

  useEffect(() => {
    const nextPeriod = computeRentPeriod(commercial);
    setRentPeriod(nextPeriod);
    setRentPriceInput(computeRentPriceFor(commercial, nextPeriod));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commercial.rent_daily_price, commercial.rent_weekly_price, commercial.rent_monthly_price, commercial.rent_price_period]);

  return (
    <div className="w-full mx-auto max-w-5xl py-8 px-4 md:px-6 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">Condiciones comerciales</h2>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 max-w-2xl">Define precio, estrategia comercial, visibilidad y modalidad (venta, arriendo o subasta).</p>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        {!showRent && (
          <div>
            <Input
              label="Precio (CLP)"
              type="number"
              value={(commercial as any).price ?? ''}
              onChange={e => update('price', (e.target as HTMLInputElement).value === '' ? undefined : Number((e.target as HTMLInputElement).value))}
              placeholder="15000000"
              error={errors.price}
              shape="pill"
            />
          </div>
        )}

        {showRent && (
          <>
            <div className="flex flex-col gap-1 md:col-span-2">
              <Input
                label="Precio de arriendo (CLP)"
                type="number"
                value={rentPriceInput}
                onChange={e => {
                  const inputValue = (e.target as HTMLInputElement).value;
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Obligatorio para publicar un arriendo</p>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Escoge cómo se cobra el arriendo</p>
            </div>
          </>
        )}
      </div>

      {(listing_type === 'sale' || listing_type === 'auction') && commercial.price && commercial.price > 0 && (
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Descuento o Promoción (opcional)
          </h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Select
                label="Tipo de descuento"
                value={commercial.discount_type || ''}
                onChange={(val) => {
                  update('discount_type', val || null);
                  if (!val) {
                    update('offer_price', null);
                    setDiscountValue(null);
                  } else if (val === 'amount') {
                    setDiscountMode('amount');
                  } else if (val === 'percent') {
                    setDiscountMode('percent');
                  } else {
                    setDiscountMode('percent');
                  }
                }}
                options={[
                  { label: 'Sin descuento', value: '' },
                  { label: '💵 Descuento directo (CLP)', value: 'amount' },
                  { label: '📊 Descuento directo (%)', value: 'percent' },
                  { label: '🏦 Bono Financiamiento', value: 'financing_bonus' },
                  { label: '🏷️ Bono de Marca', value: 'brand_bonus' },
                ]}
                shape="pill"
                size="md"
              />
            </div>

            {commercial.discount_type && (
              <>
                {(commercial.discount_type === 'financing_bonus' || commercial.discount_type === 'brand_bonus') && (
                  <div>
                    <Select
                      label="Aplicar bono como"
                      value={discountMode}
                      onChange={(mode) => {
                        const newMode = mode as 'percent' | 'amount';
                        setDiscountMode(newMode);

                        if (discountValue && commercial.price) {
                          if (newMode === 'percent' && discountMode === 'amount') {
                            const percentValue = (discountValue / commercial.price) * 100;
                            setDiscountValue(Math.round(percentValue * 100) / 100);
                          } else if (newMode === 'amount' && discountMode === 'percent') {
                            const amountValue = (commercial.price * discountValue) / 100;
                            setDiscountValue(Math.round(amountValue));
                          }
                        }
                      }}
                      options={[
                        { label: '📊 Porcentaje (%)', value: 'percent' },
                        { label: '💵 Monto fijo (CLP)', value: 'amount' },
                      ]}
                      shape="pill"
                      size="md"
                    />
                  </div>
                )}

                <div>
                  <Input
                    label={(() => {
                      if (commercial.discount_type === 'amount') return 'Descuento (CLP)';
                      if (commercial.discount_type === 'percent') return 'Descuento (%)';
                      return discountMode === 'percent' ? 'Descuento (%)' : 'Descuento (CLP)';
                    })()}
                    type="number"
                    value={discountValue ?? ''}
                    onChange={(e) => {
                      const inputValue = (e.target as HTMLInputElement).value;
                      if (inputValue === '') {
                        setDiscountValue(null);
                        update('offer_price', null);
                        return;
                      }

                      const value = Number(inputValue);
                      const basePrice = commercial.price || 0;

                      let effectiveMode = discountMode;
                      if (commercial.discount_type === 'amount') effectiveMode = 'amount';
                      if (commercial.discount_type === 'percent') effectiveMode = 'percent';

                      if (effectiveMode === 'percent') {
                        if (value >= 0 && value <= 100) {
                          setDiscountValue(value);
                          const newOfferPrice = Math.round(basePrice * (1 - value / 100));
                          update('offer_price', newOfferPrice > 0 ? newOfferPrice : null);
                        }
                      } else {
                        if (value >= 0 && value < basePrice) {
                          setDiscountValue(value);
                          const newOfferPrice = basePrice - value;
                          update('offer_price', newOfferPrice > 0 ? newOfferPrice : null);
                        }
                      }
                    }}
                    placeholder={(() => {
                      if (commercial.discount_type === 'amount') return '2000000';
                      if (commercial.discount_type === 'percent') return '15';
                      return discountMode === 'percent' ? '15' : '2000000';
                    })()}
                    min={0}
                    max={(() => {
                      if (commercial.discount_type === 'percent') return 100;
                      if (commercial.discount_type === 'amount') return commercial.price;
                      return discountMode === 'percent' ? 100 : commercial.price;
                    })()}
                    shape="pill"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {commercial.discount_type === 'amount' && 'Descuento directo en monto fijo sobre el precio base'}
                    {commercial.discount_type === 'percent' && 'Descuento directo en porcentaje sobre el precio base'}
                    {commercial.discount_type === 'financing_bonus' && 'Bono por contratar financiamiento con la concesionaria'}
                    {commercial.discount_type === 'brand_bonus' && 'Descuento oficial promocional de la marca'}
                  </p>
                </div>
              </>
            )}

            {commercial.offer_price && commercial.offer_price < (commercial.price || 0) && discountValue && (
              <div className="md:col-span-3 mt-2 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Precio original</label>
                    <div className="text-lg text-gray-500 dark:text-gray-400 line-through">
                      {commercial.price?.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </div>
                  </div>

                  <div className="text-center px-4">
                    <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        {(() => {
                          if (commercial.discount_type === 'percent') {
                            return `${discountValue}% OFF`;
                          } else if (commercial.discount_type === 'amount') {
                            return `-${discountValue.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`;
                          } else if (discountMode === 'percent') {
                            return `${discountValue}% OFF`;
                          } else {
                            return `-${discountValue.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}`;
                          }
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <label className="text-xs font-medium text-green-700 dark:text-green-300 mb-1 block">Precio final</label>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {commercial.offer_price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {commercial.discount_type && (
              <div>
                <Input
                  label="Vigencia hasta"
                  type="date"
                  value={commercial.discount_valid_until || ''}
                  onChange={(e) => update('discount_valid_until', (e.target as HTMLInputElement).value || null)}
                  shape="pill"
                  error={errors.discount_valid_until}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fecha de expiración (opcional)</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 mt-6">
        {showRent && (
          <div className="flex flex-col gap-1">
            <Input
              label="Depósito garantía (CLP)"
              type="number"
              value={commercial.rent_security_deposit ?? ''}
              onChange={e => update('rent_security_deposit', (e.target as HTMLInputElement).value === '' ? undefined : Number((e.target as HTMLInputElement).value))}
              placeholder="100000"
              error={errors.rent_security_deposit}
              shape="pill"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Opcional</p>
          </div>
        )}

        <div>
          <Select
            label="Modo de publicación"
            value={commercial.visibility || 'normal'}
            onChange={val => update('visibility', val)}
            options={[
              { label: 'Normal', value: 'normal' },
              { label: 'Destacada', value: 'featured' },
              { label: 'Oculta', value: 'hidden' },
            ]}
            shape="pill"
            size="md"
            error={errors.visibility}
          />
        </div>

        {!showRent && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-black dark:text-white">Financiamiento</span>
              <button
                type="button"
                onClick={() => toggle('financing_available')}
                className={`h-10 px-6 rounded-full border text-xs font-medium transition focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white ${commercial.financing_available ? 'bg-primary text-white border-primary' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] text-[var(--field-text)]'}`}
              >{commercial.financing_available ? 'Disponible' : 'No'}</button>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-black dark:text-white">Acepta Permuta</span>
              <button
                type="button"
                onClick={() => toggle('exchange_considered')}
                className={`h-10 px-6 rounded-full border text-xs font-medium transition focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white ${commercial.exchange_considered ? 'bg-primary text-white border-primary' : 'bg-[var(--field-bg)] border-[var(--field-border)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] text-[var(--field-text)]'}`}
              >{commercial.exchange_considered ? 'Sí' : 'No'}</button>
            </div>
          </>
        )}

        {showAuction && (
          <>
            <div>
              <Input
                label="Precio base subasta (CLP)"
                type="number"
                value={commercial.auction_start_price ?? ''}
                onChange={e => update('auction_start_price', (e.target as HTMLInputElement).value === '' ? undefined : Number((e.target as HTMLInputElement).value))}
                placeholder="1000000"
                error={errors.auction_start_price}
                shape="pill"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Input
                label="Inicio subasta"
                type="datetime-local"
                value={commercial.auction_start_at || ''}
                onChange={e => update('auction_start_at', (e.target as HTMLInputElement).value || undefined)}
                error={errors.auction_start_at}
                shape="pill"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Input
                label="Fin subasta"
                type="datetime-local"
                value={commercial.auction_end_at || ''}
                onChange={e => update('auction_end_at', (e.target as HTMLInputElement).value || undefined)}
                error={errors.auction_end_at}
                shape="pill"
              />
              {(() => {
                const start = commercial.auction_start_at ? new Date(commercial.auction_start_at) : null;
                const end = commercial.auction_end_at ? new Date(commercial.auction_end_at) : null;
                let showBtn = false;
                if (start && !isNaN(start.getTime())) {
                  if (!end) showBtn = true; else if (!isNaN(end.getTime())) {
                    const diffDays = (end.getTime() - start.getTime()) / 86400000;
                    if (Math.abs(diffDays - 7) > 0.1) showBtn = true;
                  }
                }
                if (!showBtn) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      if (start && !isNaN(start.getTime())) {
                        const endCalc = new Date(start);
                        endCalc.setDate(endCalc.getDate() + 7);
                        update('auction_end_at', formatLocalDateTime(endCalc));
                      }
                    }}
                    className="self-start mt-1 text-[11px] text-primary hover:underline"
                  >Usar +7 días desde inicio</button>
                );
              })()}
              <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Si no defines un fin, se sugiere automáticamente +7 días. Puedes modificarlo libremente.</span>
            </div>
          </>
        )}
      </div>

      {(() => {
        const price = commercial.price;
        const offer = commercial.offer_price;
        if (price == null || price <= 0 || offer == null || offer <= 0 || offer >= price) return null;
        const pct = Math.floor(((price - offer) / price) * 100);
        return (
          <div className="mt-2 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="line-through text-red-500/70">{price.toLocaleString('es-CL')}</span>
            <span className="font-semibold">{offer.toLocaleString('es-CL')}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">-{pct}%</span>
            {commercial.discount_valid_until && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/5 text-primary/80 border border-primary/10">Hasta {commercial.discount_valid_until}</span>
            )}
          </div>
        );
      })()}

      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-200">Beneficios de la oferta</h3>
        <div className="flex flex-wrap gap-2">
          {['precio_negociable','acepta_permuta','financiamiento_disponible','garantia_12m','entrega_inmediata'].map(code => {
            const active = (condiciones.flags || []).includes(code);
            return (
              <button key={code} type="button" aria-pressed={active} onClick={() => {
                const flags = new Set(condiciones.flags || []);
                if (flags.has(code)) flags.delete(code); else flags.add(code);
                updateCondiciones({ flags: Array.from(flags) });
              }}
                className={`px-3 h-8 rounded-full text-[11px] font-medium border transition ${active ? 'bg-primary text-white border-primary' : 'bg-[var(--field-bg)] border-[var(--field-border)] text-[var(--field-text)] hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]'}`}
              >{code.replace(/_/g,' ')}</button>
            );
          })}
        </div>
        <div className="mt-4">
          <label className="block text-[11px] font-semibold uppercase tracking-wide mb-1 text-gray-500 dark:text-gray-400">Condiciones adicionales</label>
          <textarea
            value={condiciones.notas || ''}
            onChange={e => updateCondiciones({ notas: e.target.value })}
            maxLength={500}
            className="w-full min-h-[90px] text-sm rounded-md bg-[var(--field-bg)] border border-[var(--field-border)] px-3 py-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white resize-y"
            placeholder="Detalles extra (máx 500 caracteres)"
          />
          <div className="text-[10px] mt-1 text-gray-500 dark:text-gray-400">{(condiciones.notas||'').length}/500</div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-lightborder/10 dark:border-darkborder/10">
        <button
          type="button"
          onClick={() => setStep('media')}
          className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
        >Volver</button>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep('commercial_enhanced')}
            className="h-10 px-6 rounded-full text-sm font-semibold shadow-card border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          >
            Condiciones Avanzadas →
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="h-10 px-6 rounded-full text-sm font-semibold shadow-card bg-primary text-white hover:shadow-card-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white"
          >Continuar</button>
        </div>
      </div>
    </div>
  );
};

export default StepCommercial;
