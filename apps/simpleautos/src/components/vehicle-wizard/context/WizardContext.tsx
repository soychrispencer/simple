"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { CONDITION_TAGS } from '@/lib/conditionTags';
import { CondicionesComerciales, EstadoVehiculo, HistorialVehiculoTag, RentPricePeriod, legacyToCanon } from '@/types/vehicle';

export type WizardStep = 'intent' | 'basic' | 'type' | 'specs' | 'media' | 'commercial';
export type ListingType = 'sale' | 'rent' | 'auction' | null;

const FLOW_WITHOUT_INTENT: WizardStep[] = ['type','basic','specs','media','commercial'];

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  intent: 'Intención',
  type: 'Tipo',
  basic: 'Básico',
  specs: 'Especificaciones',
  media: 'Multimedia',
  commercial: 'Condiciones',
};

export function getWizardSteps(state: WizardState, opts?: { includeIntent?: boolean }): WizardStep[] {
  const includeIntent = opts?.includeIntent ?? false;
  const base = FLOW_WITHOUT_INTENT;
  if (includeIntent) {
    return ['intent', ...base] as WizardStep[];
  }
  return base;
}

// Estado mínimo inicial (iremos ampliando)
export interface WizardBasic {
  title: string;
  estado: EstadoVehiculo | null;
  year: number | null;
  mileage: number | null; // sale/auction
  brand_id?: string | null;
  brand_name?: string | null;
  model_id?: string | null;
  model_name?: string | null;
  color?: string | null; // usado para el título canónico
  description?: string; // descripción larga opcional
  // IDs geográficos ahora son UUID (string). Drafts antiguos se normalizan a null.
  region?: string | null;
  commune?: string | null;
  region_name?: string | null;
  commune_name?: string | null;
  address?: string | null;
}

export interface WizardVehicle {
  type_key: string | null; // car | motorcycle | ...
  type_id?: string | null; // FK a vehicle_types.id
  type_ids?: string[] | null; // IDs agrupados (ej: car incluye suv/pickup/etc)
  specs: Record<string, any>; // dinámico por categoría
  features?: string[]; // códigos de equipamiento (pivot)
  historial: HistorialVehiculoTag[]; // etiquetas del historial del vehículo
}


export interface WizardMedia {
  images: { id: string; url?: string; file?: File; main?: boolean; dataUrl?: string }[];
  video_url?: string;
  documents: { id: string; name: string; type: string; size: number; is_public?: boolean; record_id?: string; file?: File; path?: string }[];
}

export interface WizardFinancingOption {
  bank: string;
  rate: number;
  term_months: number;
  down_payment_percent: number;
}

export type WizardBonusType = 'cash' | 'accessory' | 'service';

export interface WizardBonus {
  type: WizardBonusType;
  description: string;
  value?: number;
}

export type WizardDiscountType = 'percentage' | 'fixed_amount';

export interface WizardDiscount {
  type: WizardDiscountType;
  value: number;
  description: string;
  valid_until?: string;
}

export type WizardWarrantyOfferKind = 'seller' | 'extended';

export interface WizardWarrantyOffer {
  kind: WizardWarrantyOfferKind;
  duration_months?: number | null;
  provider?: string | null;
  details?: string | null;
}

export interface WizardAdvancedCommercial {
  financing?: WizardFinancingOption[];
  bonuses?: WizardBonus[];
  discounts?: WizardDiscount[];
  warranty_offer?: WizardWarrantyOffer | null;
  additional_conditions?: string;
}

export interface WizardCommercial {
  visibility: 'featured' | 'normal' | 'hidden';
  financing_available?: boolean;
  promotions_available?: boolean;
  discounts_available?: boolean;
  exchange_considered?: boolean;
  exchange_accepts?: 'car_suv_pickup' | 'motorcycle' | 'commercial_vehicle' | 'depends' | null;
  exchange_balance?: 'to_seller' | 'to_buyer' | 'negotiable' | null;
  currency?: 'CLP' | 'USD' | null;
  // Precios
  price?: number | null;             // precio base
  offer_price?: number | null;       // precio de oferta (si existe debe ser < price)
  discount_type?: 'percent' | 'amount' | 'financing_bonus' | 'brand_bonus' | null; // opcional (contextualiza oferta)
  discount_valid_until?: string | null;     // YYYY-MM-DD vigencia de la oferta
  // Condiciones comerciales estructuradas
  condiciones: CondicionesComerciales;
  // auction / rent fields se agregan luego
  // rent
  rent_daily_price?: number | null;
  rent_weekly_price?: number | null;
  rent_monthly_price?: number | null;
  rent_price_period?: RentPricePeriod | null;
  rent_security_deposit?: number | null;
  // auction
  auction_start_price?: number | null;
  auction_start_at?: string | null;
  auction_end_at?: string | null;
  advanced_conditions?: WizardAdvancedCommercial | null;
}

export interface WizardMeta {
  created_at: string;
  updated_at: string;
  last_auto_save?: string;
  version: number;
  showAdvancedStep?: boolean;
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
  basic: {
    title: '',
    estado: null,
    year: null,
    mileage: 0,
    brand_id: null,
    brand_name: null,
    model_id: null,
    model_name: null,
    color: null,
    description: '',
    region: null,
    commune: null,
    region_name: null,
    commune_name: null,
    address: null,
  },
  vehicle: { type_key: null, type_id: null, type_ids: null, specs: {}, features: [], historial: [] },
  media: { images: [], video_url: undefined, documents: [] },
  commercial: {
    visibility: 'normal',
    financing_available: false,
    promotions_available: false,
    discounts_available: false,
    exchange_considered: false,
    exchange_accepts: null,
    exchange_balance: null,
    currency: 'CLP',
    price: null,
    offer_price: null,
    condiciones: { flags: [], notas: null },
    advanced_conditions: null,
  },
  meta: { created_at: new Date().toISOString(), updated_at: new Date().toISOString(), version: 1, showAdvancedStep: false },
  validity: {
    intent: true,
    type: false,
    basic: false,
    specs: false,
    media: false,
    commercial: false,
  },
};

// Draft storage key (por defecto). En edición conviene aislarlo por ID para evitar
// que el progreso/validity de una publicación se mezcle con otra.
const DEFAULT_STORAGE_KEY = 'vwizard:draft:v1';

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (UUID_REGEX.test(trimmed)) return trimmed;
  return null;
}

function normalizeBasicLocation(basic: WizardBasic): WizardBasic {
  const region = sanitizeUuid(basic.region);
  const commune = sanitizeUuid(basic.commune);
  return {
    ...basic,
    region,
    commune,
    region_name: region ? (basic.region_name ?? null) : null,
    commune_name: commune ? (basic.commune_name ?? null) : null,
  };
}

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

function coerceMileage(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return Math.max(0, Math.trunc(parsed));
  }
  return 0;
}

export const WizardProvider: React.FC<{ children: React.ReactNode; storageKey?: string }> = ({
  children,
  storageKey = DEFAULT_STORAGE_KEY,
}) => {
  const [state, setState] = useState<WizardState>(() => {
    if (typeof window === 'undefined') return INITIAL_STATE;
    // 1) Intentar leer draft existente del wizard
    const existing = localStorage.getItem(storageKey);
    const parsedExisting = safeParse(existing);
    if (parsedExisting) {
      // Compatibilidad: drafts antiguos pueden no traer `media.documents`.
      (parsedExisting as any).media = {
        ...INITIAL_STATE.media,
        ...((parsedExisting as any).media || {}),
        documents: Array.isArray((parsedExisting as any).media?.documents) ? (parsedExisting as any).media.documents : [],
      };
      // Migración suave: si algún draft antiguo quedó en el paso eliminado 'publish', lo enviamos a 'commercial'
      if ((parsedExisting as any).step === 'publish') {
        (parsedExisting as any).step = 'commercial';
        try { localStorage.setItem(storageKey, JSON.stringify(parsedExisting)); } catch { /* silent */ }
      }
      // Migración suave: el paso 'review' ya no existe; lo mapeamos a 'commercial'.
      if ((parsedExisting as any).step === 'review') {
        (parsedExisting as any).step = 'commercial';
        try { localStorage.setItem(storageKey, JSON.stringify(parsedExisting)); } catch { /* silent */ }
      }
        // Migración suave: eliminamos el paso antiguo "commercial_enhanced" (ahora está dentro de commercial)
        if ((parsedExisting as any).step === 'commercial_enhanced') {
          (parsedExisting as any).step = 'commercial';
          try { localStorage.setItem(storageKey, JSON.stringify(parsedExisting)); } catch { /* silent */ }
        }
      // Normalizamos al nuevo formato canónico
      const canon = legacyToCanon({
        basic: parsedExisting.basic as any,
        vehicle: parsedExisting.vehicle as any,
        commercial: parsedExisting.commercial as any,
      });
      const allowed = new Set(CONDITION_TAGS.map(t => t.code));
      const historialNormalizado = (canon.historial || []).filter((t: string) => allowed.has(t));
      const incomingEstado = String((parsedExisting.basic as any)?.estado || '').trim().toLowerCase();
      const migratedEstado = incomingEstado === 'collection' ? null : ((parsedExisting.basic as any)?.estado ?? canon.estado ?? null);
      const migratedHistorial = (() => {
        if (incomingEstado !== 'collection') return historialNormalizado;
        return Array.from(new Set([...(historialNormalizado || []), 'collectible']));
      })();

      const migratedSpecs = (() => {
        const srcSpecs = ((parsedExisting.vehicle as any)?.specs || {}) as any;
        if (!srcSpecs || typeof srcSpecs !== 'object') return srcSpecs;
        const next = { ...srcSpecs };

        // Legacy: is_motorhome -> body_type
        if (next.is_motorhome) {
          if (!next.body_type) next.body_type = 'motorhome';
          delete next.is_motorhome;
        }

        // Legacy: drivetrain -> traction
        if (!next.traction && next.drivetrain) {
          next.traction = next.drivetrain;
          delete next.drivetrain;
        }

        const parseCc = (raw: unknown): number | null => {
          if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw);
          const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
          if (!s) return null;
          const mL = s.match(/(\d+(?:\.\d+)?)\s*l/);
          if (mL) {
            const liters = Number(mL[1]);
            if (Number.isFinite(liters) && liters > 0) return Math.round(liters * 1000);
          }
          const mCc = s.match(/(\d{3,5})\s*cc/);
          if (mCc) {
            const cc = Number(mCc[1]);
            if (Number.isFinite(cc) && cc > 0) return Math.round(cc);
          }
          const num = Number(s.replace(',', '.'));
          if (Number.isFinite(num)) {
            // Heurística: si es < 20, probablemente litros
            if (num > 0 && num < 20) return Math.round(num * 1000);
            // Si parece cc
            if (num >= 300 && num <= 12000) return Math.round(num);
          }
          return null;
        };

        const parseHp = (raw: unknown): number | null => {
          if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw);
          const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
          if (!s) return null;
          const m = s.match(/(\d{2,4})(?:\s*(hp|cv|ps))?/);
          if (!m) return null;
          const n = Number(m[1]);
          return Number.isFinite(n) ? Math.round(n) : null;
        };

        const parseKmL = (raw: unknown): number | null => {
          if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
          const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
          if (!s) return null;
          const m = s.match(/(\d+(?:\.\d+)?)\s*km\s*\/\s*l/);
          if (m) {
            const n = Number(m[1]);
            return Number.isFinite(n) ? n : null;
          }
          const num = Number(s.replace(',', '.'));
          return Number.isFinite(num) ? num : null;
        };

        // Legacy: engine/engine_size/cilindrada -> engine_displacement_cc
        if (next.engine_displacement_cc == null) {
          const cc = parseCc(next.engine_displacement_cc ?? next.cilindrada ?? next.engine_size ?? next.engine);
          if (cc != null) next.engine_displacement_cc = cc;
        }
        if (next.engine_displacement_cc != null) {
          delete next.engine;
          delete next.engine_size;
          delete next.cilindrada;
        }

        // Legacy: power -> engine_power_hp
        if (next.engine_power_hp == null) {
          const hp = parseHp(next.engine_power_hp ?? next.power);
          if (hp != null) next.engine_power_hp = hp;
        }
        if (next.engine_power_hp != null) {
          delete next.power;
        }

        // Legacy: fuel_consumption -> fuel_consumption_km_l
        if (next.fuel_consumption_km_l == null) {
          const kmL = parseKmL(next.fuel_consumption_km_l ?? next.fuel_consumption);
          if (kmL != null) next.fuel_consumption_km_l = kmL;
        }
        if (next.fuel_consumption_km_l != null) {
          delete next.fuel_consumption;
        }

        return next;
      })();

      const normalized: WizardState = {
        ...parsedExisting,
        basic: normalizeBasicLocation({
          ...INITIAL_STATE.basic,
          ...(parsedExisting.basic as any),
          estado: migratedEstado,
          mileage: coerceMileage((parsedExisting.basic as any)?.mileage),
        }),
        vehicle: {
          ...INITIAL_STATE.vehicle,
          ...(parsedExisting.vehicle as any),
          historial: migratedHistorial,
          specs: migratedSpecs,
        },
        commercial: {
          ...INITIAL_STATE.commercial,
          ...(parsedExisting.commercial as any),
          condiciones: (() => {
            const src = ((parsedExisting.commercial as any)?.condiciones ?? canon.condiciones) as any;
            const flags = Array.isArray(src?.flags) ? src.flags : [];
            const migratedFlags = flags.map((f: any) => (f === 'garantia_12m' ? 'garantia_vendedor' : f));
            return { ...src, flags: migratedFlags };
          })(),
          advanced_conditions: (parsedExisting.commercial as any)?.advanced_conditions ?? INITIAL_STATE.commercial.advanced_conditions ?? null,
        },
      };

      delete (normalized.basic as any).condition;
      delete (normalized.vehicle as any).condition_tags;
      delete (normalized.vehicle as any).status_tags;
      delete (normalized.commercial as any).conditions_flags;
      delete (normalized.commercial as any).conditions_notes;

      try { localStorage.setItem(storageKey, JSON.stringify(normalized)); } catch { /* silent */ }
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
            mileage: coerceMileage(mileageRaw),
            brand_id: brandIdRaw,
            model_id: modelIdRaw,
            color: colorRaw,
            description: descriptionRaw,
            region: null,
            commune: null,
            region_name: locSrc.region_name || null,
            commune_name: locSrc.commune_name || null,
            address: locSrc.address || null,
          },
          vehicle: { type_key: type_key || null, type_id: null, type_ids: null, specs: { ...specsSrc }, features: [], historial: canonLegacy.historial },
          media: {
            images: Array.isArray(legacyImages) ? legacyImages.map((img: any, idx: number) => ({
              id: img.id || crypto.randomUUID(),
              url: img.url,
              dataUrl: img.dataUrl,
              main: img.cover || img.main || idx === 0,
            })) : [],
            video_url: (legacyForm.media && legacyForm.media.video_url) || (legacyForm.multimedia && legacyForm.multimedia.videoUrl) || undefined,
            documents: [],
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
        localStorage.setItem(storageKey, JSON.stringify(migrated));
        // Limpiar claves legacy para evitar confusión futura
        localStorage.removeItem('pub:form');
        localStorage.removeItem('pub:images');
        localStorage.removeItem('pub:step');
        return migrated;
      }
    } catch {/* silent migration failure */}

    return INITIAL_STATE;
  });

  const persistNow = useCallback((next: WizardState) => {
    if (typeof window === 'undefined') return;
    try {
      const sanitizedImages = next.media.images.map(img => ({ id: img.id, url: img.url, dataUrl: img.dataUrl, main: img.main }));
      const sanitizedDocuments = (next.media.documents || [])
        .map((doc: any) => ({ id: doc.id, name: doc.name, type: doc.type, size: doc.size, path: doc.path, is_public: !!doc.is_public, record_id: doc.record_id }));
      const toStore: WizardState = {
        ...next,
        media: { ...next.media, images: sanitizedImages, documents: sanitizedDocuments },
      };
      localStorage.setItem(storageKey, JSON.stringify(toStore));
    } catch {
      /* silent */
    }
  }, [storageKey]);

  const setListingType = useCallback((t: ListingType) => {
    // Eliminamos auto avance: ahora el paso solo cambia cuando el usuario pulsa "Continuar".
    setState(prev => ({
      ...prev,
      listing_type: t,
      meta: { ...prev.meta, updated_at: new Date().toISOString() },
    }));
  }, []);

  const setStep = useCallback((s: WizardStep) => {
    // Guardamos SOLO al avanzar de paso (sin autosave por escritura).
    setState(prev => {
      const iso = new Date().toISOString();
      const nextMeta: WizardMeta = { ...prev.meta, updated_at: iso, last_auto_save: iso };
      const next: WizardState = { ...prev, step: s, meta: nextMeta };
      // Side-effect intencional: persistimos el draft en el cambio de paso.
      persistNow(next);
      return next;
    });
  }, [persistNow]);

  const patch = useCallback(<K extends keyof WizardState>(section: K, value: Partial<WizardState[K]>) => {
    setState(prev => {
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
  }, []);

  const isPublishable = useCallback(() => {
    const lt = state.listing_type;
    if (!lt) return false;
    if (!state.vehicle.type_key) return false;
    if (!state.basic.brand_id) return false;
    if (!state.basic.model_id) return false;
    if (state.basic.year == null) return false;
    if (!state.basic.color || state.basic.color === 'generic') return false;
    if (!state.basic.region || !state.basic.commune) return false;
    if (lt === 'sale' || lt === 'auction') {
      if (state.commercial.price == null) return false;
    }
    if (lt === 'rent') {
      const period = state.commercial.rent_price_period;
      const rentValue = period ? (state.commercial as any)[`rent_${period}_price`] : null;
      if (!period) return false;
      if (!rentValue || rentValue <= 0) return false;
    }
    if (lt === 'auction') {
      if (!state.commercial.auction_start_price) return false;
      if (!state.commercial.auction_start_at) return false;
      if (!state.commercial.auction_end_at) return false;
    }
    if (state.media.images.length === 0) return false;
    return true;
  }, [state]);

  const validateStep = useCallback((s: WizardStep) => {
    if (s === 'intent') {
      return true;
    }
    let valid = true;
    try {
      if (s === 'type') {
        valid = !!state.vehicle.type_key;
      } else if (s === 'basic') {
        const hasRequiredBasics = !!state.basic.brand_id
          && !!state.basic.model_id
          && state.basic.year != null
          && !!state.basic.color
          && state.basic.color !== 'generic'
          && !!state.basic.region
          && !!state.basic.commune;
        const hasListingType = !!state.listing_type;
        valid = hasRequiredBasics && hasListingType;
      } else if (s === 'specs') {
        valid = true;
      } else if (s === 'media') {
        valid = state.media.images.length > 0;
      } else if (s === 'commercial') {
        valid = true;
      }
    } catch {
      valid = false;
    }
    setState(prev => {
      if (prev.validity[s] === valid) return prev;
      return { ...prev, validity: { ...prev.validity, [s]: valid } };
    });
    return valid;
  }, [state.vehicle.type_key, state.basic.brand_id, state.basic.model_id, state.basic.year, state.basic.color, state.basic.region, state.basic.commune, state.listing_type, state.media.images.length]);

  const computeProgress = useCallback(() => {
    const steps = getWizardSteps(state) as WizardStep[];
    if (steps.length === 0) return 0;
    const done = steps.filter((key) => state.validity[key]);
    return Math.round((done.length / steps.length) * 100);
  }, [state]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
  }, [storageKey]);

  const forceSave = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const current = state;
      const iso = new Date().toISOString();
      const sanitizedImages = current.media.images.map(img => ({ id: img.id, url: img.url, dataUrl: img.dataUrl, main: img.main }));
      const sanitizedDocuments = (current.media.documents || [])
        .map((doc: any) => ({ id: doc.id, name: doc.name, type: doc.type, size: doc.size, path: doc.path, is_public: !!doc.is_public, record_id: doc.record_id }));
      const toStore: WizardState = {
        ...current,
        media: { ...current.media, images: sanitizedImages, documents: sanitizedDocuments },
        meta: { ...current.meta, last_auto_save: iso, updated_at: iso }
      };
      localStorage.setItem(storageKey, JSON.stringify(toStore));
      setState(prev => ({ ...prev, meta: { ...prev.meta, last_auto_save: iso, updated_at: iso } }));
    } catch {/* silent */}
  }, [state, storageKey]);

  // validate automatically when parts change (lightweight)
  useEffect(() => {
    let active = true;
    const scheduleValidation = async () => {
      await Promise.resolve();
      if (!active) return;
      validateStep(state.step);
    };
    scheduleValidation();
    return () => {
      active = false;
    };
  }, [state.step, validateStep]);

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







