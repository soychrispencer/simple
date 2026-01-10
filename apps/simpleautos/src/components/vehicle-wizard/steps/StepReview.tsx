"use client";
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast, Button } from '@simple/ui';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import { validateAdvancedVehicle, resolveSpecKey, specCategories } from '../specDescriptors';
import { WizardStepLayout } from '../layout/WizardStepLayout';
import { useSubmitVehicle } from '@/lib/submitVehicle';
import { CONDITION_TAGS } from '@/lib/conditionTags';
import { formatPrice } from '@/lib/format';
import { ConfirmCancelModal } from '../components/ConfirmCancelModal';
import { useFeaturesCatalog } from '../hooks/useFeaturesCatalog';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import type { Vehicle } from '@/types/vehicle';

const sectionCard = "p-3 rounded-lg card-surface shadow-card flex flex-col gap-2";
const label = "text-[11px] uppercase tracking-wide font-semibold text-lighttext/70 dark:text-darktext/70";
const chipBase = "px-2 py-0.5 rounded-full text-[10px] font-medium";
const chipPrimary = `${chipBase} bg-[var(--color-primary-a10)] text-[var(--color-primary)]`;
const chipNeutral = `${chipBase} card-surface shadow-card text-lighttext/80 dark:text-darktext/80`;
const chipField = `${chipBase} bg-[var(--field-bg)] border border-[var(--field-border)] text-[var(--field-text)]`;

const StepReview: React.FC = () => {
  const { state, setStep, isPublishable, reset } = useWizard();
  const router = useRouter();
  const { addToast } = useToast();
  // Paso de revisión vuelve a ser el último: aquí se publica directamente
  const publishable = isPublishable();
  const { submit } = useSubmitVehicle();
  const [publishing, setPublishing] = useState(false);
  const [needsContact, setNeedsContact] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const condiciones = state.commercial.condiciones || { flags: [], notas: null };
  const currency = (state.commercial as any).currency || 'CLP';
  const historialLabels = useMemo(() => new Map(CONDITION_TAGS.map(tag => [tag.code, tag.label])), []);

  const rawType = state.vehicle.type_key;
  const resolvedSpecKey = rawType ? resolveSpecKey(rawType) : null;
  const specsState = state.vehicle.specs || {};
  const bodyType = resolvedSpecKey === 'car' ? ((specsState as any)?.body_type ?? null) : null;
  const { features: featuresCatalog } = useFeaturesCatalog({ typeSlug: rawType || null, bodyType });

  const featureLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of featuresCatalog) {
      map.set(f.code, f.label);
    }
    return map;
  }, [featuresCatalog]);

  const humanizeFeatureCode = (code: string) => {
    const cleaned = String(code || '').trim();
    if (!cleaned) return '—';
    const spaced = cleaned.replace(/[_-]+/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  const displayCommercialFlags = useMemo(() => {
    const forbidden = new Set(['acepta_permuta', 'financiamiento_disponible']);
    const isRent = state.listing_type === 'rent';
    const labels: Record<string, string> = {
      precio_negociable: isRent ? 'Precio de arriendo negociable' : 'Precio negociable',
      garantia_vendedor: 'Garantía del vendedor',
      garantia_extendida: 'Garantía extendida',
      entrega_inmediata: 'Entrega inmediata',
      entrega_domicilio: 'Entrega a domicilio',
      pago_tarjeta: 'Acepta pago con tarjeta',
      pago_transferencia: 'Acepta transferencia',
      financiamiento_directo: 'Financiamiento directo',
    };
    const src = Array.isArray(condiciones.flags) ? condiciones.flags : [];
    return src
      .filter((f) => typeof f === 'string' && f.trim().length > 0 && !forbidden.has(f))
      .map((f) => labels[f] ?? f);
  }, [condiciones.flags, state.listing_type]);

  const advanced = state.commercial.advanced_conditions;
  const hasAdvancedDetails = useMemo(() => {
    if (!advanced) return false;
    if (Array.isArray(advanced.financing) && advanced.financing.length > 0) return true;
    if (Array.isArray(advanced.bonuses) && advanced.bonuses.length > 0) return true;
    if (Array.isArray(advanced.discounts) && advanced.discounts.length > 0) return true;
    return false;
  }, [advanced]);

  const missing = useMemo(() => {
    const issues: string[] = [];
    if (!state.listing_type) issues.push('Selecciona tipo de publicación');
    if (!state.vehicle.type_key) issues.push('Selecciona tipo de vehículo');
    if (!state.basic.brand_id) issues.push('Marca requerida');
    if (!state.basic.model_id) issues.push('Modelo requerido');
    if (state.basic.year == null) issues.push('Año requerido');
    if (!state.basic.color || state.basic.color === 'generic') issues.push('Color requerido');
    if (!state.basic.region || !state.basic.commune) issues.push('Ubicación incompleta');
  if ((state.listing_type === 'sale' || state.listing_type === 'auction') && (state.commercial.price == null)) issues.push('Precio requerido');
    if (state.media.images.length === 0) issues.push('Al menos una imagen');
    return issues;
  }, [state]);

  // (Ya no marcamos validity para 'review' porque no existe en WizardStep)

  const publishDisabled = !publishable || publishing; // tras éxito se redirige

  const handlePublish = async (asDraft: boolean = false) => {
    if (publishDisabled && !asDraft) return;
    setPublishing(true);
    try {
      // Para borrador exigimos lo mínimo (sin bloquear por ubicación/imágenes/precio).
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
      
      // Si guardamos como borrador, no validamos todo
      if (!asDraft) {
        const adv = validateAdvancedVehicle({ basic: state.basic, commercial: state.commercial, specs: state.vehicle.specs || {}, listing_type: state.listing_type });
        if (!adv.ok) throw new Error(Object.values(adv.errors).slice(0,1)[0] || 'Validación avanzada falló');
      }
      
      const images = state.media.images || [];
      
      // Agregar el status al estado antes de enviar
      const stateWithStatus = {
        ...state,
        publication_status: asDraft ? 'draft' : 'active'
      };
      
      // Pasar el estado con el status
      const { error } = await submit(stateWithStatus, images);
      if (error) throw error;
      
      // Publicación exitosa: mostrar mensaje y redirigir inmediatamente
      const isEditing = !!state.vehicle_id;
      const message = asDraft 
        ? (isEditing ? 'Borrador guardado correctamente' : 'Borrador creado correctamente')
        : (isEditing ? 'Publicación actualizada correctamente' : 'Publicación creada correctamente');
      addToast(message, { type: 'success' });

      // Limpiar el draft del wizard para que una nueva publicación no herede datos.
      // (El submit ya persistió todo en DB.)
      reset();

      // Redirigir inmediatamente.
      router.replace('/panel/mis-publicaciones');
    } catch(e:any) {
      const msg = e?.message || 'Error al publicar';
      addToast(msg, { type: 'error' });
      const lower = msg.toLowerCase();
      if (lower.includes('whatsapp') || lower.includes('teléfono') || lower.includes('telefono') || lower.includes('datos de contacto') || lower.includes('contacto')) {
        setNeedsContact(true);
      }
      setPublishing(false);
    }
  };

  const GoEdit: React.FC<{ step: any }> = ({ step }) => (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="h-auto px-0 py-0 text-[11px] text-primary hover:underline"
      onClick={() => setStep(step)}
    >
      Editar
    </Button>
  );

  const friendlyType = useMemo(() => {
    const map: Record<string,string> = {
      car: 'Auto',
      suv: 'SUV',
      pickup: 'Camioneta',
      motorcycle: 'Moto',
      van: 'Van',
      truck: 'Camión'
    };
    if (!state.vehicle.type_key) return null;
    return map[state.vehicle.type_key] || state.vehicle.type_key;
  }, [state.vehicle.type_key]);

  const previewVehicle = useMemo<Vehicle>(() => {
    const now = new Date().toISOString();
    const imgs = Array.isArray(state.media.images) ? state.media.images : [];
    const imageUrls = imgs
      .map((img: any) => img?.dataUrl || img?.url)
      .filter(Boolean);

    const listingType = state.listing_type || 'sale';

    const specs = state.vehicle.specs || {};
    const fuelType = (specs as any).fuel_type ?? (specs as any).fuel ?? null;
    const transmission = (specs as any).transmission ?? null;

    const base: Vehicle = {
      id: 'preview',
      owner_id: 'preview',
      type_id: (state.vehicle as any).type_id || 'preview',
      title: state.basic.title || '—',
      description: state.basic.description || null,
      listing_type: listingType as any,
      listing_kind: listingType as any,
      price: (listingType === 'sale' && state.commercial.price != null) ? state.commercial.price : null,
      year: state.basic.year ?? null,
      mileage: state.basic.mileage ?? null,
      brand_id: state.basic.brand_id || null,
      model_id: state.basic.model_id || null,
      color: state.basic.color || null,
      region_id: (state.basic as any).region_id ?? null,
      commune_id: (state.basic as any).commune_id ?? null,
      image_urls: imageUrls as any,
      image_paths: imageUrls as any,
      allow_financing: !!state.commercial.financing_available,
      allow_exchange: !!state.commercial.exchange_considered,
      featured: false,
      visibility: 'normal',
      created_at: now,
      updated_at: now,
      extra_specs: {
        estado: state.basic.estado ?? null,
        fuel_type: fuelType,
        transmission,
        legacy: {
          commune_name: (state.basic as any).commune_name ?? null,
          region_name: (state.basic as any).region_name ?? null,
        },
      },
      type_key: (state.vehicle.type_key as any) ?? null,
      type_label: friendlyType ?? undefined,
      commune_name: (state.basic as any).commune_name ?? null,
      region_name: (state.basic as any).region_name ?? null,
      // Rental support (para que VehicleCard calcule el precio)
      rent_daily_price: state.commercial.rent_daily_price ?? null,
      rent_weekly_price: state.commercial.rent_weekly_price ?? null,
      rent_monthly_price: state.commercial.rent_monthly_price ?? null,
      rent_price_period: (state.commercial as any).rent_price_period ?? null,
      rent_security_deposit: state.commercial.rent_security_deposit ?? null,
    };

    if (listingType === 'auction') {
      (base as any).auction_start_price = state.commercial.auction_start_price ?? null;
      base.extra_specs = {
        ...(base.extra_specs || {}),
        auction_start_price: state.commercial.auction_start_price ?? null,
      };
    }

    if (listingType === 'rent') {
      base.extra_specs = {
        ...(base.extra_specs || {}),
        rent_price_period: (state.commercial as any).rent_price_period ?? null,
        rent_daily_price: state.commercial.rent_daily_price ?? null,
        rent_weekly_price: state.commercial.rent_weekly_price ?? null,
        rent_monthly_price: state.commercial.rent_monthly_price ?? null,
      };
    }

    return base;
  }, [friendlyType, state]);

  return (
    <WizardStepLayout
      title="Revisión Final"
      description="Confirma que toda la información es correcta antes de publicar. Puedes volver a cualquier paso para ajustar."
      summary={publishable ? 'Revisa el resumen y publica cuando estés listo.' : `Pendientes para publicar: ${missing.length}`}
      actions={(
        <div className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium ${publishable ? 'border-[var(--color-success-subtle-border)] text-[var(--color-success)] bg-[var(--color-success-subtle-bg)]' : 'border-[var(--color-warn-subtle-border)] text-[var(--color-warn)] bg-[var(--color-warn-subtle-bg)]'}`}>
          {publishable ? 'Listo para publicar' : 'Faltan requisitos'}
        </div>
      )}
      footer={(
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep('commercial')}>Volver</Button>
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
      <div className="flex flex-col gap-4">
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

        {!publishable && missing.length > 0 && (
          <div className="text-[11px] bg-[var(--color-warn-subtle-bg)] border border-[var(--color-warn-subtle-border)] rounded-lg p-3 text-[var(--color-warn)] flex flex-col gap-1">
            <span className="font-semibold tracking-wide">Pendientes:</span>
            <ul className="list-disc ml-4 space-y-0.5">
              {missing.map(i => <li key={i}>{i}</li>)}
            </ul>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
        {/* Vista previa (tarjeta real) */}
        <div className={`${sectionCard} lg:col-span-2`}>
          <div className="flex items-center justify-between">
            <span className={label}>VISTA PREVIA</span>
          </div>
          <VehicleCard
            vehicle={previewVehicle}
            preview
            onClick={undefined}
          />
        </div>

        {/* Básicos (incluye ubicación ahora) */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between"><span className={label}>BÁSICOS</span><GoEdit step="basic"/></div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-lighttext dark:text-darktext">{state.basic.title || '—'}</p>
              {state.basic.description && (
                <p className="text-[12px] text-lighttext/70 dark:text-darktext/70 mt-0.5 line-clamp-3">{state.basic.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {(state.basic.estado) && <span className={chipPrimary}>{state.basic.estado}</span>}
              {state.basic.year && <span className={chipNeutral}>Año {state.basic.year}</span>}
              {state.basic.color && <span className={chipNeutral}>{state.basic.color}</span>}
              {state.basic.mileage != null && (state.listing_type === 'sale' || state.listing_type === 'auction') && (
                <span className={chipNeutral}>{state.basic.mileage.toLocaleString('es-CL')} km</span>
              )}
              {(state.basic as any).region_name && (state.basic as any).commune_name && (
                <span className={chipNeutral}>{(state.basic as any).commune_name}, {(state.basic as any).region_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tipo */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between"><span className={label}>TIPO</span><GoEdit step="type"/></div>
          <p className="text-xs text-lighttext/70 dark:text-darktext/70">{friendlyType || '—'}</p>
        </div>

        {/* Especificaciones */}
        <div className={`${sectionCard} lg:col-span-2`}>
          <div className="flex items-center justify-between"><span className={label}>ESPECIFICACIONES</span><GoEdit step="specs"/></div>
          {(() => {
            const t = state.vehicle.type_key ? specCategories[resolveSpecKey(state.vehicle.type_key)] : null;
            const specs = state.vehicle.specs || {};
            const entries = Object.entries(specs).filter(([,v]) => v !== undefined && v !== null && v !== '');
            if (!t || entries.length === 0) return <p className="text-xs text-lighttext/70 dark:text-darktext/70">Sin especificaciones</p>;
            // Mapear id -> label y formatear valores select
            const fieldMap = Object.fromEntries(t.fields.map(f => [f.id, f]));
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-[11px] text-lighttext/70 dark:text-darktext/70">
                {entries.map(([k,v]) => {
                  const fd = fieldMap[k];
                  let displayValue: any = v;
                  if (fd) {
                    if (fd.type === 'select' && fd.options) {
                      const opt = fd.options.find(o => o.value === v);
                      if (opt) displayValue = opt.label; // label amigable
                    }
                    if (fd.unit && typeof v === 'number') {
                      displayValue = `${v} ${fd.unit}`;
                    }
                  }
                  const labelText = fd ? fd.label : k;
                  return (
                    <div key={k} className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-lighttext/70 dark:text-darktext/70">{labelText}</span>
                      <span className="text-[11px] text-lighttext dark:text-darktext/90 font-medium">{String(displayValue)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Etiquetas */}
        {Array.isArray(state.vehicle.historial) && state.vehicle.historial.length > 0 && (
          <div className={sectionCard}>
            <div className="flex items-center justify-between"><span className={label}>ETIQUETAS</span><GoEdit step="specs"/></div>
            <div className="flex flex-wrap gap-1">
              {state.vehicle.historial.map(tag => (
                <span key={tag} className={chipNeutral}>{historialLabels.get(tag) || tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Equipamiento (features) */}
        {Array.isArray(state.vehicle.features) && state.vehicle.features.length > 0 && (
          <div className={sectionCard}>
            <div className="flex items-center justify-between"><span className={label}>EQUIPAMIENTO</span><GoEdit step="specs"/></div>
            <div className="flex flex-wrap gap-1">
              {state.vehicle.features.map((code) => {
                const label = featureLabelByCode.get(code) || humanizeFeatureCode(code);
                return (
                  <span key={code} className={chipPrimary}>{label}</span>
                );
              })}
            </div>
          </div>
        )}

        {/* Condiciones comerciales */}
        <div className={`${sectionCard} lg:col-span-2`}>
          <div className="flex items-center justify-between"><span className={label}>CONDICIONES COMERCIALES</span><GoEdit step="commercial"/></div>
          <div className="flex flex-col gap-3 text-xs text-lighttext/70 dark:text-darktext/70">
            {(state.listing_type === 'sale' || state.listing_type === 'auction') && (
              <div className="flex items-end gap-3 flex-wrap">
                {state.commercial.price != null && (
                  <span className="text-base font-semibold text-lighttext dark:text-darktext">{formatPrice(state.commercial.price, { currency })}</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-1">
              {displayCommercialFlags.map((f) => (
                <span key={f} className={chipPrimary}>{f}</span>
              ))}
              {state.commercial.financing_available && <span className={chipNeutral}>Financia</span>}
              {state.commercial.exchange_considered && <span className={chipNeutral}>Permuta</span>}
            </div>
            {condiciones.notas && (
              <p className="text-[11px] text-lighttext/70 dark:text-darktext/70 whitespace-pre-line leading-snug">{condiciones.notas}</p>
            )}
            {state.listing_type === 'rent' && (
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const { rent_price_period, rent_daily_price, rent_weekly_price, rent_monthly_price } = state.commercial;
                  const rentPrice = rent_price_period === 'daily'
                    ? rent_daily_price
                    : rent_price_period === 'weekly'
                      ? rent_weekly_price
                      : rent_monthly_price;
                  if (rent_price_period && rentPrice != null) {
                    const label = rent_price_period === 'daily' ? 'Diario' : rent_price_period === 'weekly' ? 'Semanal' : 'Mensual';
                    return (
                      <span className={chipField}>
                        {label}: {rentPrice.toLocaleString('es-CL')}
                      </span>
                    );
                  }
                  return null;
                })()}
                {state.commercial.rent_security_deposit != null && <span className={chipField}>Depósito: {state.commercial.rent_security_deposit.toLocaleString('es-CL')}</span>}
              </div>
            )}
            {state.listing_type === 'auction' && (
              <div className="flex flex-wrap gap-1">
                {state.commercial.auction_start_price != null && <span className={chipField}>Base {state.commercial.auction_start_price.toLocaleString('es-CL')}</span>}
                {state.commercial.auction_start_at && <span className={chipField}>Inicio {state.commercial.auction_start_at}</span>}
                {state.commercial.auction_end_at && <span className={chipField}>Fin {state.commercial.auction_end_at}</span>}
              </div>
            )}
          </div>
        </div>

        {hasAdvancedDetails && (
          <div className={`${sectionCard} lg:col-span-2`}>
            <div className="flex items-center justify-between"><span className={label}>PROMOCIONES Y FINANCIAMIENTO</span><GoEdit step="commercial"/></div>
            <div className="flex flex-col gap-4 text-xs text-lighttext dark:text-darktext">
              {advanced?.financing && advanced.financing.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-lighttext/70 dark:text-darktext/70">Financiamiento</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {advanced.financing.map((option, idx) => {
                      const meta = [
                        option.rate != null ? `Tasa ${option.rate}%` : null,
                        option.term_months ? `${option.term_months} meses` : null,
                        option.down_payment_percent != null ? `Pie ${option.down_payment_percent}%` : null,
                      ].filter(Boolean).join(' · ');
                      return (
                        <div key={`financing-${idx}`} className="rounded-lg card-surface shadow-card p-3">
                          <p className="text-[11px] font-semibold text-lighttext dark:text-darktext">{option.bank || 'Entidad financiera'}</p>
                          {meta && <p className="text-[10px] text-lighttext/70 dark:text-darktext/70">{meta}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {advanced?.bonuses && advanced.bonuses.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-lighttext/70 dark:text-darktext/70">Bonos y promociones</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {advanced.bonuses.map((bonus, idx) => {
                      const typeLabel = bonus.type === 'cash'
                        ? 'Bono en efectivo'
                        : bonus.type === 'accessory'
                          ? 'Accesorio incluido'
                          : 'Servicio incluido';
                      return (
                        <div key={`bonus-${idx}`} className="rounded-lg card-surface shadow-card border border-[var(--color-success-subtle-border)] p-3">
                          <p className="text-[11px] font-semibold text-[var(--color-success)]">{typeLabel}</p>
                          <p className="text-[11px] text-lighttext dark:text-darktext/90">{bonus.description || 'Sin descripción'}</p>
                          {bonus.type === 'cash' && bonus.value != null && (
                            <p className="text-[10px] text-lighttext/70 dark:text-darktext/70">Valor {bonus.value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', currencyDisplay: 'symbol' })}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {advanced?.discounts && advanced.discounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-lighttext/70 dark:text-darktext/70">Descuentos estructurados</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {advanced.discounts.map((discount, idx) => {
                      const valueLabel = discount.type === 'percentage'
                        ? `${discount.value}%`
                        : discount.value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', currencyDisplay: 'symbol' });
                      const expiry = discount.valid_until ? new Date(discount.valid_until).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
                      return (
                        <div key={`discount-${idx}`} className="rounded-lg card-surface shadow-card border border-[var(--color-warn-subtle-border)] p-3">
                          <p className="text-[11px] font-semibold text-[var(--color-warn)]">{discount.description || 'Descuento'}</p>
                          <p className="text-[11px] text-lighttext dark:text-darktext/90">{valueLabel}</p>
                          <div className="text-[10px] text-lighttext/70 dark:text-darktext/70 flex flex-wrap gap-2">
                            <span>{discount.type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}</span>
                            {expiry && <span>Vigente hasta {expiry}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Imágenes */}
        <div className={`${sectionCard} lg:col-span-2`}>
          <div className="flex items-center justify-between"><span className={label}>IMÁGENES</span><GoEdit step="media"/></div>
          {state.media.images.length === 0 && <p className="text-xs text-lighttext/60 dark:text-darktext/60">Sin imágenes</p>}
          {state.media.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {state.media.images.map((img:any) => (
                <div key={img.id} className="relative w-28 aspect-video rounded-md overflow-hidden shadow-card bg-lightbg dark:bg-darkcard">
                  <img src={img.dataUrl || img.url} alt="preview" className="object-cover w-full h-full" />
                  {img.main && <span className="absolute top-1 left-1 bg-primary text-[var(--color-on-primary)] text-[9px] px-1.5 py-0.5 rounded">PORTADA</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </WizardStepLayout>
  );
};

export default StepReview;







