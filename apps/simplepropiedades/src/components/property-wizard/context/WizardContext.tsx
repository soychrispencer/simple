"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ListingType, PropertyType } from "@/types/property";
import { logError } from "@/lib/logger";

export type WizardStep =
  | "type"
  | "basic"
  | "features"
  | "amenities"
  | "pricing"
  | "location"
  | "media"
  | "review";

export const WIZARD_STEPS: WizardStep[] = [
  "type",
  "basic",
  "features",
  "amenities",
  "pricing",
  "location",
  "media",
  "review",
];

export const STEP_LABELS: Record<WizardStep, string> = {
  type: "Tipo",
  basic: "Información",
  features: "Características",
  amenities: "Amenities",
  pricing: "Precios",
  location: "Ubicación",
  media: "Media",
  review: "Revisión",
};

export interface WizardImage {
  id: string;
  file?: File;
  dataUrl?: string;
  url?: string;
  remoteUrl?: string | null;
  main?: boolean;
}

export interface PropertyWizardData {
  type: {
    property_type: PropertyType | null;
    listing_type: ListingType | null;
  };
  basic: {
    title: string;
    description: string;
  };
  features: {
    area_m2: number | null;
    area_built_m2: number | null;
    land_area: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    parking_spaces: number | null;
    floor: number | null;
    total_floors: number | null;
    year_built: number | null;
  };
  amenities: {
    has_pool: boolean;
    has_garden: boolean;
    has_balcony: boolean;
    has_terrace: boolean;
    has_elevator: boolean;
    has_gym: boolean;
    has_security: boolean;
    is_furnished: boolean;
    allows_pets: boolean;
  };
  pricing: {
    price: number | null;
    rent_price: number | null;
    currency: "CLP" | "USD";
    rent_period: "monthly" | "weekly" | "daily" | null;
  };
  location: {
    country: string;
    region_id: string | null;
    commune_id: string | null;
    address: string;
    latitude: number | null;
    longitude: number | null;
    region_name?: string | null;
    commune_name?: string | null;
  };
  media: {
    images: WizardImage[];
    video_url: string | null;
    virtual_tour_url: string | null;
  };
  review: {
    visibility: "normal" | "featured" | "hidden";
    publish_now: boolean;
    notes?: string;
  };
}

export interface WizardState {
  step: WizardStep;
  data: PropertyWizardData;
  propertyId: string | null;
  meta: {
    createdAt: string;
    updatedAt: string;
    lastAutoSave: string | null;
    lastValidationError: string | null;
  };
}

export type WizardStateSnapshot = WizardState;

interface WizardContextValue {
  state: WizardState;
  validity: Partial<Record<WizardStep, boolean>>;
  setStep: (next: WizardStep) => void;
  patchSection: <K extends keyof PropertyWizardData>(section: K, value: Partial<PropertyWizardData[K]>) => void;
  replaceData: (payload: Partial<PropertyWizardData>, propertyId?: string | null) => void;
  reset: () => void;
  validateStep: (step: WizardStep) => { valid: boolean; reason?: string };
  computeProgress: () => number;
  nextStep: () => { moved: boolean; reason?: string };
  previousStep: () => void;
  forceSave: () => void;
  setPropertyId: (id: string | null) => void;
}

const STORAGE_KEY = "simple:property-wizard:v1";

function createInitialData(): PropertyWizardData {
  return {
    type: { property_type: null, listing_type: null },
    basic: { title: "", description: "" },
    features: {
      area_m2: null,
      area_built_m2: null,
      land_area: null,
      bedrooms: null,
      bathrooms: null,
      parking_spaces: null,
      floor: null,
      total_floors: null,
      year_built: null,
    },
    amenities: {
      has_pool: false,
      has_garden: false,
      has_balcony: false,
      has_terrace: false,
      has_elevator: false,
      has_gym: false,
      has_security: false,
      is_furnished: false,
      allows_pets: false,
    },
    pricing: {
      price: null,
      rent_price: null,
      currency: "CLP",
      rent_period: "monthly",
    },
    location: {
      country: "Chile",
      region_id: null,
      commune_id: null,
      address: "",
      latitude: null,
      longitude: null,
      region_name: null,
      commune_name: null,
    },
    media: {
      images: [],
      video_url: null,
      virtual_tour_url: null,
    },
    review: {
      visibility: "normal",
      publish_now: false,
      notes: "",
    },
  };
}

function createInitialState(): WizardState {
  const now = new Date().toISOString();
  return {
    step: "type",
    data: createInitialData(),
    propertyId: null,
    meta: {
      createdAt: now,
      updatedAt: now,
      lastAutoSave: null,
      lastValidationError: null,
    },
  };
}

const WizardContext = createContext<WizardContextValue | undefined>(undefined);

type SectionKey = keyof PropertyWizardData;

type ValidationResult = { valid: boolean; reason?: string };

function safeNumber(value: number | null, min = 0) {
  if (typeof value !== "number") return false;
  if (!Number.isFinite(value)) return false;
  return value >= min;
}

function validateStepData(step: WizardStep, data: PropertyWizardData): ValidationResult {
  switch (step) {
    case "type": {
      if (!data.type.property_type) return { valid: false, reason: "Selecciona el tipo de propiedad" };
      if (!data.type.listing_type) return { valid: false, reason: "Selecciona el tipo de publicación" };
      return { valid: true };
    }
    case "basic": {
      if (!data.basic.title || data.basic.title.trim().length < 8) {
        return { valid: false, reason: "Agrega un título descriptivo" };
      }
      return { valid: true };
    }
    case "features": {
      if (!safeNumber(data.features.area_m2, 10)) {
        return { valid: false, reason: "Ingresa la superficie total" };
      }
      if (!safeNumber(data.features.bedrooms, 0)) {
        return { valid: false, reason: "Indica habitaciones" };
      }
      if (!safeNumber(data.features.bathrooms, 0)) {
        return { valid: false, reason: "Indica baños" };
      }
      return { valid: true };
    }
    case "amenities":
      return { valid: true };
    case "pricing": {
      if (data.type.listing_type === "rent") {
        if (!safeNumber(data.pricing.rent_price, 1)) {
          return { valid: false, reason: "Define el valor de arriendo" };
        }
        return { valid: true };
      }
      if (!safeNumber(data.pricing.price, 1000000)) {
        return { valid: false, reason: "Define el precio de referencia" };
      }
      return { valid: true };
    }
    case "location": {
      if (!data.location.region_id || !data.location.commune_id) {
        return { valid: false, reason: "Selecciona región y comuna" };
      }
      return { valid: true };
    }
    case "media": {
      if (!Array.isArray(data.media.images) || data.media.images.length === 0) {
        return { valid: false, reason: "Agrega al menos una imagen" };
      }
      return { valid: true };
    }
    case "review":
      return { valid: true };
    default:
      return { valid: true };
  }
}

function mergeWizardData(base: PropertyWizardData, incoming?: Partial<PropertyWizardData>): PropertyWizardData {
  const next: PropertyWizardData = {
    type: { ...base.type },
    basic: { ...base.basic },
    features: { ...base.features },
    amenities: { ...base.amenities },
    pricing: { ...base.pricing },
    location: { ...base.location },
    media: { ...base.media, images: [...base.media.images] },
    review: { ...base.review },
  };

  if (!incoming) return next;

  (Object.keys(incoming) as SectionKey[]).forEach((section) => {
    const value = incoming[section];
    if (value === undefined) return;
    if (Array.isArray(value) || value === null) {
      (next as any)[section] = value;
    } else if (typeof value === "object") {
      (next as any)[section] = { ...(next as any)[section], ...value };
    } else {
      (next as any)[section] = value;
    }
  });

  return next;
}

function serializeDraft(state: WizardState) {
  const safeImages = (state.data.media.images || []).map((img) => ({
    id: img.id,
    dataUrl: img.dataUrl ?? null,
    url: img.url ?? null,
    remoteUrl: img.remoteUrl ?? null,
    main: !!img.main,
  }));
  return JSON.stringify({
    step: state.step,
    propertyId: state.propertyId,
    data: {
      ...state.data,
      media: { ...state.data.media, images: safeImages },
    },
  });
}

function loadDraft(): WizardState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const draftData = mergeWizardData(createInitialData(), parsed?.data || {});
    const step: WizardStep = WIZARD_STEPS.includes(parsed?.step) ? parsed.step : "type";
    return {
      step,
      data: draftData,
      propertyId: parsed?.propertyId ?? null,
      meta: {
        createdAt: parsed?.meta?.createdAt || new Date().toISOString(),
        updatedAt: parsed?.meta?.updatedAt || new Date().toISOString(),
        lastAutoSave: parsed?.meta?.lastAutoSave || null,
        lastValidationError: null,
      },
    };
  } catch (error) {
    logError("[WizardProvider] Error al cargar draft", error);
    return createInitialState();
  }
}

export const WizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WizardState>(() => loadDraft());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = serializeDraft(state);
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, payload);
        setState((prev) => ({
          ...prev,
          meta: { ...prev.meta, lastAutoSave: new Date().toISOString() },
        }));
      } catch (error) {
        logError("[WizardProvider] Error guardando draft", error);
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [state]);

  const validity = useMemo(() => {
    const result: Partial<Record<WizardStep, boolean>> = {};
    WIZARD_STEPS.forEach((step) => {
      result[step] = validateStepData(step, state.data).valid;
    });
    return result;
  }, [state.data]);

  const setStep = useCallback((next: WizardStep) => {
    setState((prev) => ({
      ...prev,
      step: next,
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const patchSection = useCallback(<K extends SectionKey>(section: K, value: Partial<PropertyWizardData[K]>) => {
    setState((prev) => {
      const currentSection = prev.data[section];
      let nextSection: PropertyWizardData[K];
      if (
        currentSection &&
        typeof currentSection === "object" &&
        !Array.isArray(currentSection) &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        nextSection = { ...(currentSection as Record<string, any>), ...(value as Record<string, any>) } as PropertyWizardData[K];
      } else {
        nextSection = value as PropertyWizardData[K];
      }
      return {
        ...prev,
        data: { ...prev.data, [section]: nextSection },
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      };
    });
  }, []);

  const replaceData = useCallback((payload: Partial<PropertyWizardData>, propertyId?: string | null) => {
    setState((prev) => ({
      ...prev,
      data: mergeWizardData(prev.data, payload),
      propertyId: typeof propertyId === "undefined" ? prev.propertyId : propertyId,
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setState(createInitialState());
  }, []);

  const validateStep = useCallback(
    (step: WizardStep): ValidationResult => {
      const result = validateStepData(step, state.data);
      setState((prev) => ({
        ...prev,
        meta: { ...prev.meta, lastValidationError: result.valid ? null : result.reason || null },
      }));
      return result;
    },
    [state.data]
  );

  const computeProgress = useCallback(() => {
    const completed = WIZARD_STEPS.filter((step) => validity[step]).length;
    return Math.round((completed / WIZARD_STEPS.length) * 100);
  }, [validity]);

  const nextStep = useCallback(() => {
    const currentIndex = WIZARD_STEPS.indexOf(state.step);
    if (currentIndex === -1 || currentIndex === WIZARD_STEPS.length - 1) {
      return { moved: false };
    }
    const validation = validateStep(state.step);
    if (!validation.valid) {
      return { moved: false, reason: validation.reason };
    }
    setStep(WIZARD_STEPS[currentIndex + 1]);
    return { moved: true };
  }, [setStep, state.step, validateStep]);

  const previousStep = useCallback(() => {
    const currentIndex = WIZARD_STEPS.indexOf(state.step);
    if (currentIndex <= 0) return;
    setStep(WIZARD_STEPS[currentIndex - 1]);
  }, [setStep, state.step]);

  const forceSave = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const payload = serializeDraft(state);
      window.localStorage.setItem(STORAGE_KEY, payload);
      setState((prev) => ({
        ...prev,
        meta: { ...prev.meta, lastAutoSave: new Date().toISOString() },
      }));
    } catch (error) {
      logError("[WizardProvider] Error haciendo forceSave", error);
    }
  }, [state]);

  const setPropertyId = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      propertyId: id,
      meta: { ...prev.meta, updatedAt: new Date().toISOString() },
    }));
  }, []);

  const value = useMemo<WizardContextValue>(() => ({
    state,
    validity,
    setStep,
    patchSection,
    replaceData,
    reset,
    validateStep,
    computeProgress,
    nextStep,
    previousStep,
    forceSave,
    setPropertyId,
  }), [state, validity, setStep, patchSection, replaceData, reset, validateStep, computeProgress, nextStep, previousStep, forceSave, setPropertyId]);

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
};

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizard debe ejecutarse dentro de WizardProvider");
  }
  return ctx;
}
