"use client";
import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CONDITION_TAGS } from '@/lib/conditionTags';
import { CondicionesComerciales, EstadoVehiculo, HistorialVehiculoTag, RentPricePeriod, legacyToCanon } from '@/types/vehicle';

export type WizardStep = 'intent' | 'basic' | 'type' | 'specs' | 'media' | 'commercial' | 'commercial_enhanced' | 'review';
export type ListingType = 'sale' | 'rent' | 'auction' | null;

// Estado mínimo inicial (iremos ampliando)
export interface WizardBasic {
  title: string;
  estado: EstadoVehiculo | null;
  year: number | null;
  mileage: number | null; // sale/auction
  brand_id?: string | null;
  model_id?: string | null;
  color?: string | null; // usado para el título canónico
  description?: string; // descripción larga opcional
  // rent/auction extenderán después
  // Ahora se persisten como IDs numéricos (FK) en vez de slug/string
  region?: number | null;
  commune?: number | null;
}

export interface WizardVehicle {
  type_key: string | null; // car | motorcycle | ...
  type_id?: string | null; // FK a vehicle_types.id
  specs: Record<string, any>; // dinámico por categoría
  features?: string[]; // códigos de equipamiento (pivot)
  historial: HistorialVehiculoTag[]; // etiquetas del historial del vehículo
}


export interface WizardMedia {
  images: { id: string; url?: string; file?: File; main?: boolean; dataUrl?: string }[];
  video_url?: string;
}

export interface WizardCommercial {
  visibility: 'featured' | 'normal' | 'hidden';
  financing_available?: boolean;
  exchange_considered?: boolean;
  // Precios
  price?: number | null;             // precio base
  offer_price?: number | null;       // precio de oferta (si existe debe ser < price)
  discount_type?: 'percent' | 'amount' | 'financing_bonus' | 'brand_bonus'; // opcional (contextualiza oferta)
  discount_valid_until?: string;     // YYYY-MM-DD vigencia de la oferta
  // Condiciones comerciales estructuradas
  condiciones: CondicionesComerciales;
  // auction / rent fields se agregan luego
  // rent
  rent_daily_price?: number;
  rent_weekly_price?: number;
  rent_monthly_price?: number;
  rent_price_period?: RentPricePeriod | null;
  rent_security_deposit?: number;
  // auction
  auction_start_price?: number;
  auction_start_at?: string;
  auction_end_at?: string;
}

export interface WizardMeta {
  created_at: string;
  updated_at: string;
  last_auto_save?: string;
  version: number;
}

export interface WizardState {
  vehicle_id?: string | null;
  listing_type: ListingType;
  publication_status?: 'active' | 'paused' | 'draft';
  step: WizardStep;
  basic: WizardBasic;
  vehicle: WizardVehicle;
  media: WizardMedia;
  commercial: WizardCommercial;
  meta: WizardMeta;
  validity: Partial<Record<WizardStep, boolean>>;
}

export const INITIAL_STATE: WizardState = {
  vehicle_id: null,
  listing_type: null,
  step: 'intent',
  basic: { title: '', estado: null, year: null, mileage: null, brand_id: null, model_id: null, color: null, description: '', region: null, commune: null },
  vehicle: { type_key: null, type_id: null, specs: {}, features: [], historial: [] },
  media: { images: [], video_url: undefined },
  commercial: {
    visibility: 'normal',
    financing_available: false,
    exchange_considered: false,
    price: null,
    offer_price: null,
    condiciones: { flags: [], notas: null },
  },
  meta: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1 },
  validity: { intent: true },
};

// Draft storage key
const STORAGE_KEY = 'vwizard:draft:v1';

interface WizardContextValue {
  state: WizardState;
  setListingType: (t: ListingType) => void;
  setStep: (s: WizardStep) => void;
  patch: <K extends keyof WizardState>(section: K, value: Partial<WizardState[K]>) => void;
  validateStep: (s: WizardStep) => boolean;
  computeProgress: () => number;
  reset: () => void;
  forceSave: () => void;
  isPublishable: () => boolean;
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

function safeParse(raw: any): WizardState | null {
  if (!raw) return null;
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== 'object') return null;
    // naive shape check
    if (!('meta' in obj)) return null;
    return {
      ...INITIAL_STATE,
      ...obj,
      meta: { ...obj.meta, updated_at: new Date().toISOString() },
    } as WizardState;
  } catch {
    return null;
  }
}

export const WizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WizardState>(() => {
    if (typeof window === 'undefined') return INITIAL_STATE;
    // 1) Intentar leer draft existente del wizard
    const existing = localStorage.getItem(STORAGE_KEY);
    const parsedExisting = safeParse(existing);
    if (parsedExisting) {
      // Migración suave: si algún draft antiguo quedó en el paso eliminado 'publish', lo enviamos a 'review'
      if ((parsedExisting as any).step === 'publish') {
        (parsedExisting as any).step = 'review';
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedExisting)); } catch { /* silent */ }
      }
      // Normalizamos al nuevo formato canónico
      const canon = legacyToCanon({
        basic: parsedExisting.basic as any,
        vehicle: parsedExisting.vehicle as any,
        commercial: parsedExisting.commercial as any,
      });
      const allowed = new Set(CONDITION_TAGS.map(t => t.code));
      const historialNormalizado = (canon.historial || []).filter((t: string) => allowed.has(t));

      const normalized: WizardState = {
        ...parsedExisting,
        basic: {
          ...INITIAL_STATE.basic,
          ...(parsedExisting.basic as any),
          estado: (parsedExisting.basic as any)?.estado ?? canon.estado ?? null,
        },
        vehicle: {
          ...INITIAL_STATE.vehicle,
          ...(parsedExisting.vehicle as any),
          historial: (parsedExisting.vehicle as any)?.historial ?? historialNormalizado,
        },
        commercial: {
          ...INITIAL_STATE.commercial,
          ...(parsedExisting.commercial as any),
          condiciones: (parsedExisting.commercial as any)?.condiciones ?? canon.condiciones,
        },
      };

      delete (normalized.basic as any).condition;
      delete (normalized.vehicle as any).condition_tags;
      delete (normalized.vehicle as any).status_tags;
      delete (normalized.commercial as any).conditions_flags;
      delete (normalized.commercial as any).conditions_notes;

      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch { /* silent */ }
      return normalized;
    }

    // 2) Migración desde claves legacy del formulario antiguo (pub:form / pub:images / pub:step)
    try {
      const legacyFormRaw = localStorage.getItem('pub:form');
      if (legacyFormRaw) {
        const legacyForm = JSON.parse(legacyFormRaw);
        const legacyImages = (() => { try { return JSON.parse(localStorage.getItem('pub:images')||'[]'); } catch { return []; } })();
        // Normalizar fuentes (soportar claves en español / inglés)
        const basicSrc = legacyForm.basic || legacyForm.basicos || {};
        const specsSrc = legacyForm.specs || legacyForm.especificaciones || {};
        const locSrc = legacyForm.location || legacyForm.ubicacion || {};
        const extraSrc = legacyForm.extra || legacyForm.extras || {};

  const listing_kind = basicSrc.listing_kind || basicSrc.tipoLista || null;
        const type_key = basicSrc.type_key || basicSrc.tipoVehiculo || null;
        const title = basicSrc.title || basicSrc.titulo || '';
    const legacyCondition = basicSrc.condition || basicSrc.estado || basicSrc.state || '';
        const yearRaw = basicSrc.year || basicSrc.anio;
  const priceRaw = basicSrc.price || basicSrc.precio;
        const mileageRaw = basicSrc.mileage || basicSrc.mileage_km || basicSrc.km;
    const colorRaw = basicSrc.color || basicSrc.colour || null;
  const descriptionRaw = basicSrc.description || basicSrc.descripcion || '';
  const brandIdRaw = basicSrc.brand_id || basicSrc.marca_id || null;
  const modelIdRaw = basicSrc.model_id || basicSrc.modelo_id || null;

        const canonLegacy = legacyToCanon({
          basic: { condition: legacyCondition } as any,
          vehicle: { condition_tags: basicSrc.status_tags || basicSrc.condition_tags || [] } as any,
          commercial: {
            conditions_flags: extraSrc.conditions_flags || extraSrc.condiciones || [],
            conditions_notes: extraSrc.conditions_notes || extraSrc.condiciones_notas || null,
          } as any,
        });

        const migrated: WizardState = {
          ...INITIAL_STATE,
          listing_type: listing_kind,
          step: type_key ? 'basic' : 'type',
          basic: {
            title,
            estado: canonLegacy.estado,
            year: yearRaw ? Number(yearRaw) : null,
            mileage: mileageRaw ? Number(mileageRaw) : null,
            brand_id: brandIdRaw,
            model_id: modelIdRaw,
            color: colorRaw,
            description: descriptionRaw,
            // Intentamos parsear a número; si viene slug legacy no podemos mapear y lo dejamos null
            region: (() => { const v = locSrc.region || locSrc.region_code; const n = Number(v); return Number.isFinite(n) ? n : null; })(),
            commune: (() => { const v = locSrc.commune || locSrc.comuna || locSrc.commune_code; const n = Number(v); return Number.isFinite(n) ? n : null; })(),
          },
          vehicle: { type_key: type_key || null, type_id: null, specs: { ...specsSrc }, features: [], historial: canonLegacy.historial },
          media: {
            images: Array.isArray(legacyImages) ? legacyImages.map((img: any, idx: number) => ({
              id: img.id || crypto.randomUUID(),
              url: img.url,
              dataUrl: img.dataUrl,
              main: img.cover || img.main || idx === 0,
            })) : [],
            video_url: (legacyForm.media && legacyForm.media.video_url) || (legacyForm.multimedia && legacyForm.multimedia.videoUrl) || undefined,
          },
          commercial: {
            visibility: extraSrc.visibility === 'destacado' ? 'featured' : (extraSrc.visibility === 'oculto' ? 'hidden' : 'normal'),
            financing_available: extraSrc.financing === 'si' || extraSrc.financia === 'si' || false,
            exchange_considered: extraSrc.exchange === 'si' || extraSrc.permuta === 'si' || false,
            price: priceRaw ? Number(priceRaw) : null,
            condiciones: canonLegacy.condiciones,
          },
          meta: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1 },
          validity: { intent: !!listing_kind, type: !!type_key, basic: !!title },
        };
        // Persistimos inmediatamente la versión migrada
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        // Limpiar claves legacy para evitar confusión futura
        localStorage.removeItem('pub:form');
        localStorage.removeItem('pub:images');
        localStorage.removeItem('pub:step');
        return migrated;
      }
    } catch {/* silent migration failure */}

    return INITIAL_STATE;
  });

  const saveRef = useRef<any>(null);
  const lastPersistedRef = useRef<WizardState | null>(null);
  const scheduleSave = useCallback((next: WizardState) => {
    if (typeof window === 'undefined') return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      try {
        const prevPersisted = lastPersistedRef.current;
        const changed: Partial<WizardState> = {};
        // Comparaciones superficiales por sección para evitar reconstruir todo el objeto
        (['basic','vehicle','media','commercial','listing_type','step'] as (keyof WizardState)[]).forEach(key => {
          if (!prevPersisted || prevPersisted[key] !== next[key]) {
            (changed as any)[key] = next[key];
          }
        });
        if (!prevPersisted || Object.keys(changed).length > 0) {
          const iso = new Date().toISOString();
          const sanitizedImages = next.media.images.map(img => ({ id: img.id, url: img.url, dataUrl: img.dataUrl, main: img.main }));
          const base: WizardState = prevPersisted ? { ...prevPersisted } : { ...next };
          if (changed.basic) base.basic = next.basic;
          if (changed.vehicle) base.vehicle = next.vehicle;
          if (changed.media) base.media = { ...next.media, images: sanitizedImages };
          if (changed.commercial) base.commercial = next.commercial;
          if (changed.listing_type !== undefined) base.listing_type = next.listing_type;
          if (changed.step !== undefined) base.step = next.step as any;
          base.meta = { ...next.meta, last_auto_save: iso };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
          lastPersistedRef.current = base;
          setState(prev => ({ ...prev, meta: { ...prev.meta, last_auto_save: iso } }));
        }
      } catch { /* silent */ }
    }, 400);
  }, []);

  const updateState = useCallback((updater: (prev: WizardState) => WizardState) => {
    setState(prev => {
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const setListingType = useCallback((t: ListingType) => {
    // Eliminamos auto avance: ahora el paso solo cambia cuando el usuario pulsa "Continuar".
    updateState(prev => ({
      ...prev,
      listing_type: t,
      meta: { ...prev.meta, updated_at: new Date().toISOString() },
    }));
  }, [updateState]);

  const setStep = useCallback((s: WizardStep) => {
    updateState(prev => ({ ...prev, step: s, meta: { ...prev.meta, updated_at: new Date().toISOString() } }));
  }, [updateState]);

  const patch = useCallback(<K extends keyof WizardState>(section: K, value: Partial<WizardState[K]>) => {
    updateState(prev => {
      const current = prev[section];
      let nextSection: any;
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        nextSection = { ...current, ...value };
      } else {
        // para campos escalares (listing_type, step) sobrescribimos directo
        nextSection = (value as any);
      }
      return {
        ...prev,
        [section]: nextSection,
        meta: { ...prev.meta, updated_at: new Date().toISOString() },
      } as WizardState;
    });
  }, [updateState]);

  const validateStep = useCallback((s: WizardStep) => {
    let valid = true;
    try {
      if (s === 'type') valid = !!state.vehicle.type_key;
      else if (s === 'basic') {
        // simple check: título + tipo + ubicación (region/commune) y condition si aplica sale/auction
        const hasTitle = !!state.basic.title;
        const hasListingType = !!state.listing_type;
        const locOk = !!state.basic.region && !!state.basic.commune;
  const condOk = (state.listing_type === 'sale' || state.listing_type === 'auction') ? !!state.basic.estado : true;
        valid = hasTitle && hasListingType && locOk && condOk;
      } else if (s === 'specs') valid = true; // validación específica se hace en componente
      else if (s === 'media') valid = state.media.images.length > 0;
      else if (s === 'commercial') valid = true;
    } catch { valid = false; }
    setState(prev => ({ ...prev, validity: { ...prev.validity, [s]: valid } }));
    return valid;
  }, [state.vehicle.type_key, state.basic.title, state.listing_type, state.basic.region, state.basic.commune, state.basic.estado, state.media.images.length]);

  const isPublishable = useCallback(() => {
    const lt = state.listing_type;
    if (!lt) return false;
    if (!state.vehicle.type_key) return false;
    if (!state.basic.title) return false;
    if (!state.basic.region || !state.basic.commune) return false;
    if (lt === 'sale' || lt === 'auction') {
  if (!state.basic.estado) return false;
      if (state.commercial.price == null) return false;
    }
    if (state.media.images.length === 0) return false;
    return true;
  }, [state]);

  const computeProgress = useCallback(() => {
  const keys: WizardStep[] = ['type','basic','specs','media','commercial','review'];
    const done = keys.filter(k => state.validity[k]);
    return Math.round((done.length / keys.length) * 100);
  }, [state.validity]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  }, []);

  const forceSave = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const current = state;
      const iso = new Date().toISOString();
      const sanitizedImages = current.media.images.map(img => ({ id: img.id, url: img.url, dataUrl: img.dataUrl, main: img.main }));
      const toStore: WizardState = {
        ...current,
        media: { ...current.media, images: sanitizedImages },
        meta: { ...current.meta, last_auto_save: iso, updated_at: iso }
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      setState(prev => ({ ...prev, meta: { ...prev.meta, last_auto_save: iso, updated_at: iso } }));
    } catch {/* silent */}
  }, [state]);

  // validate automatically when parts change (lightweight)
  // validateStep depende de varios campos; lo memorizamos indirectamente via dependencias usadas al declararlo
  useEffect(() => { validateStep(state.step); }, [state.step, validateStep]);

  const value: WizardContextValue = useMemo(() => ({
    state,
    setListingType,
    setStep,
    patch,
    validateStep,
    computeProgress,
    reset,
    forceSave,
    isPublishable,
  }), [state, setListingType, setStep, patch, validateStep, computeProgress, reset, forceSave, isPublishable]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard debe usarse dentro de <WizardProvider>');
  return ctx;
}
