"use client";
import React, { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/toast/ToastProvider';
import { useWizard } from '../context/WizardContext';
import { validateStepData } from '../schemas';
import { validateAdvancedVehicle, resolveSpecKey, specCategories } from '../specDescriptors';
import { useSubmitVehicle } from '@/lib/submitVehicle';
import { CONDITION_TAGS } from '@/lib/conditionTags';

const sectionCard = "p-4 rounded-lg bg-lightcard dark:bg-darkcard ring-1 ring-black/5 dark:ring-white/5 flex flex-col gap-2";
const editBtn = "text-[11px] text-primary hover:underline font-medium";
const label = "text-[11px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400";

const StepReview: React.FC = () => {
  const { state, setStep, isPublishable } = useWizard();
  const { addToast } = useToast();
  // Paso de revisión vuelve a ser el último: aquí se publica directamente
  const publishable = isPublishable();
  const { submit } = useSubmitVehicle();
  const [publishing, setPublishing] = useState(false);
  const condiciones = state.commercial.condiciones || { flags: [], notas: null };
  const historialLabels = useMemo(() => new Map(CONDITION_TAGS.map(tag => [tag.code, tag.label])), []);

  const missing = useMemo(() => {
    const issues: string[] = [];
    if (!state.listing_type) issues.push('Selecciona tipo de publicación');
    if (!state.vehicle.type_key) issues.push('Selecciona tipo de vehículo');
    if (!state.basic.title) issues.push('Título faltante');
    if (!state.basic.region || !state.basic.commune) issues.push('Ubicación incompleta');
  if ((state.listing_type === 'sale' || state.listing_type === 'auction') && !state.basic.estado) issues.push('Condición obligatoria');
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
      if (!validateStepData('basic', state.basic).ok) throw new Error('Datos básicos inválidos');
      
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
      
      // Redirigir inmediatamente sin resetear (para evitar cambio de paso)
      window.location.href = '/panel/publicaciones';
    } catch(e:any) {
      addToast(e?.message || 'Error al publicar', { type: 'error' });
      setPublishing(false);
    }
  };

  const GoEdit: React.FC<{ step: any }> = ({ step }) => (
    <button onClick={() => setStep(step)} className={editBtn}>Editar</button>
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

  return (
    <div className="w-full mx-auto max-w-5xl py-8 px-4 md:px-6 flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black dark:text-white">Revisión Final</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl">Confirma que toda la información es correcta antes de publicar. Puedes volver a cualquier paso para ajustar.</p>
        </div>
        <div className={`text-[11px] px-2.5 py-1.5 rounded-full border font-medium ${publishable ? 'border-green-500/40 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10' : 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10'}`}>
          {publishable ? 'Listo para publicar' : 'Faltan requisitos'}
        </div>
      </header>
      {!publishable && missing.length > 0 && (
        <div className="text-[11px] bg-amber-50 dark:bg-amber-500/10 border border-amber-500/30 dark:border-amber-500/40 rounded-lg p-3 text-amber-700 dark:text-amber-300 flex flex-col gap-1">
          <span className="font-semibold tracking-wide">Pendientes:</span>
          <ul className="list-disc ml-4 space-y-0.5">
            {missing.map(i => <li key={i}>{i}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Básicos (incluye ubicación ahora) */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between"><span className={label}>BÁSICOS</span><GoEdit step="basic"/></div>
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">{state.basic.title || '—'}</p>
              {state.basic.description && (
                <p className="text-[12px] text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-3">{state.basic.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {(state.basic.estado) && <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{state.basic.estado}</span>}
              {state.basic.year && <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Año {state.basic.year}</span>}
              {state.basic.color && <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{state.basic.color}</span>}
              {state.basic.mileage != null && (state.listing_type === 'sale' || state.listing_type === 'auction') && (
                <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{state.basic.mileage.toLocaleString('es-CL')} km</span>
              )}
              {(state.basic as any).region_name && (state.basic as any).commune_name && (
                <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{(state.basic as any).commune_name}, {(state.basic as any).region_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Tipo */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between"><span className={label}>TIPO</span><GoEdit step="type"/></div>
          <p className="text-xs text-gray-600 dark:text-gray-300">{friendlyType || '—'}</p>
        </div>

        {/* Especificaciones */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between"><span className={label}>ESPECIFICACIONES</span><GoEdit step="specs"/></div>
          {(() => {
            const t = state.vehicle.type_key ? specCategories[resolveSpecKey(state.vehicle.type_key)] : null;
            const specs = state.vehicle.specs || {};
            const entries = Object.entries(specs).filter(([,v]) => v !== undefined && v !== null && v !== '');
            if (!t || entries.length === 0) return <p className="text-xs text-gray-400">Sin especificaciones</p>;
            // Mapear id -> label y formatear valores select
            const fieldMap = Object.fromEntries(t.fields.map(f => [f.id, f]));
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-[11px] text-gray-600 dark:text-gray-300">
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
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{labelText}</span>
                      <span className="text-[11px] text-black dark:text-white/90 font-medium">{String(displayValue)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Historial */}
        {Array.isArray(state.vehicle.historial) && state.vehicle.historial.length > 0 && (
          <div className={sectionCard}>
            <div className="flex items-center justify-between"><span className={label}>HISTORIAL</span><GoEdit step="specs"/></div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {state.vehicle.historial.map(tag => (
                <span key={tag} className="px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">{historialLabels.get(tag) || tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Equipamiento (features) */}
        {Array.isArray(state.vehicle.features) && state.vehicle.features.length > 0 && (
          <div className={sectionCard}>
            <div className="flex items-center justify-between"><span className={label}>EQUIPAMIENTO</span><GoEdit step="specs"/></div>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {state.vehicle.features.map(code => (
                <span key={code} className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{code}</span>
              ))}
            </div>
          </div>
        )}

        {/* Condiciones comerciales */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between"><span className={label}>CONDICIONES COMERCIALES</span><GoEdit step="commercial"/></div>
          <div className="flex flex-col gap-3 text-xs text-gray-600 dark:text-gray-300">
            {(state.listing_type === 'sale' || state.listing_type === 'auction') && (
              <div className="flex items-end gap-3 flex-wrap">
                {state.commercial.price != null && (
                  <span className="text-base font-semibold text-black dark:text-white">{state.commercial.price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', currencyDisplay: 'symbol' })}</span>
                )}
                {(() => {
                  const { price, offer_price } = state.commercial;
                  if (price != null && offer_price != null && offer_price < price) {
                    const pct = ((price - offer_price) / price) * 100;
                    if (pct >= 3) {
                      return (
                        <>
                          <span className="line-through text-gray-400 text-[11px]">{price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', currencyDisplay: 'symbol' })}</span>
                          <span className="text-base font-semibold text-primary">{offer_price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', currencyDisplay: 'symbol' })}</span>
                          <span className="text-[11px] font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">-{Math.floor(pct)}%</span>
                        </>
                      );
                    } else {
                      // Si el descuento es menor al umbral, tratamos offer_price como precio normal (sin tachar ni badge)
                      return (
                        <span className="text-base font-semibold text-black dark:text-white">{offer_price.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', currencyDisplay: 'symbol' })}</span>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
            )}
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Visibilidad: {state.commercial.visibility}</span>
              {Array.isArray(condiciones.flags) && condiciones.flags.map(f => (
                <span key={f} className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{f}</span>
              ))}
              {state.commercial.discount_valid_until && (
                <span className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Vigente hasta {state.commercial.discount_valid_until}</span>
              )}
              {state.commercial.discount_type && (
                <span className="px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{state.commercial.discount_type}</span>
              )}
              {state.commercial.financing_available && <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Financia</span>}
              {state.commercial.exchange_considered && <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Permuta</span>}
            </div>
            {condiciones.notas && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-pre-line leading-snug">{condiciones.notas}</p>
            )}
            {state.listing_type === 'rent' && (
              <div className="flex flex-wrap gap-2 text-[10px]">
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
                      <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                        {label}: {rentPrice.toLocaleString('es-CL')}
                      </span>
                    );
                  }
                  return null;
                })()}
                {state.commercial.rent_security_deposit != null && <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Depósito: {state.commercial.rent_security_deposit.toLocaleString('es-CL')}</span>}
              </div>
            )}
            {state.listing_type === 'auction' && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                {state.commercial.auction_start_price != null && <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Base {state.commercial.auction_start_price.toLocaleString('es-CL')}</span>}
                {state.commercial.auction_start_at && <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Inicio {state.commercial.auction_start_at}</span>}
                {state.commercial.auction_end_at && <span className="px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">Fin {state.commercial.auction_end_at}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Imágenes */}
        <div className={sectionCard}>
          <div className="flex items-center justify-between"><span className={label}>IMÁGENES</span><GoEdit step="media"/></div>
          {state.media.images.length === 0 && <p className="text-xs text-gray-400">Sin imágenes</p>}
          {state.media.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {state.media.images.map((img:any) => (
                <div key={img.id} className="relative w-28 aspect-video rounded-md overflow-hidden ring-1 ring-black/5 dark:ring-white/10 bg-lightbg dark:bg-[#1c1c1c]">
                  <img src={img.dataUrl || img.url} alt="preview" className="object-cover w-full h-full" />
                  {img.main && <span className="absolute top-1 left-1 bg-primary text-white text-[9px] px-1.5 py-0.5 rounded">PORTADA</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-4 border-t border-lightborder/10 dark:border-darkborder/10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep('commercial')}
            className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
          >Volver</button>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={publishing}
              onClick={() => handlePublish(true)}
              className={`h-10 px-6 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-600 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white ${publishing ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >{publishing ? 'Guardando...' : 'Guardar borrador'}</button>
            <button
              type="button"
              disabled={publishDisabled}
              onClick={() => handlePublish(false)}
              className={`h-10 px-6 rounded-full text-sm font-semibold shadow-card transition focus:outline-none focus-visible:ring-1 focus-visible:ring-black dark:focus-visible:ring-white ${publishDisabled ? 'opacity-40 cursor-not-allowed bg-primary text-white' : 'bg-primary text-white hover:shadow-card-hover'}`}
            >{publishing ? 'Publicando...' : 'Publicar'}</button>
          </div>
        </div>
        {/* Mensajes inline reemplazados por toasts; mantenemos estados para controlar el botón */}
      </div>
    </div>
  );
};

export default StepReview;
