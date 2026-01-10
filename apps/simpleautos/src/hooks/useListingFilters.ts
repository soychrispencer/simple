import { useCallback, useEffect, useRef, useState } from 'react';
import { buildSearchUrl, normalizeKindForQuery } from '@/lib/builders/buildSearchUrl';

export interface ListingFiltersState {
  listing_kind: string; // es (venta|arriendo|subasta)
  type_id?: string; // ID del tipo de vehículo
  type_key?: string; // Legacy - mantener por compatibilidad
  brand_id?: string;
  model_id?: string;
  body_type?: string; // Tipo de carrocería
  region_id?: string;
  commune_id?: string;
  price_min?: string;
  price_max?: string;
  year_min?: string;
  year_max?: string;
  transmission?: string;
  fuel_type?: string;
  color?: string;
  estado?: string; // macro estado
  page: number;
  page_size: number;
}

const DEFAULTS: ListingFiltersState = {
  listing_kind: 'venta',
  type_id: undefined,
  type_key: undefined,
  brand_id: undefined,
  model_id: undefined,
  body_type: undefined,
  region_id: undefined,
  commune_id: undefined,
  price_min: undefined,
  price_max: undefined,
  year_min: undefined,
  year_max: undefined,
  transmission: undefined,
  fuel_type: undefined,
  color: undefined,
  estado: undefined,
  page: 1,
  page_size: 24,
};

function parseQuery(kindDefault: string): ListingFiltersState {
  const params = new URLSearchParams(window.location.search);
  const base: ListingFiltersState = { ...DEFAULTS, listing_kind: kindDefault };
  if (!params) return base;
  
  // Si viene listing_kind en la URL, usarlo en lugar del kindDefault
  const urlListingKind = params.get('listing_kind');
  if (urlListingKind && ['venta', 'arriendo', 'subasta', 'todos'].includes(urlListingKind)) {
    base.listing_kind = urlListingKind;
  }
  
  params.forEach((v,k) => {
    if (!v || v === 'null' || v === 'undefined') return;
    // Migración: aceptar legacy 'state' o 'condition' y mapear a 'estado'
    if (k === 'state' || k === 'condition') {
      (base as any).estado = v;
      return;
    }
    if (k in base || k === 'page_size') {
      if (k === 'page' || k === 'page_size') (base as any)[k] = Number(v) || (k === 'page' ? 1 : 24);
      else (base as any)[k] = v;
    }
  });
  return base;
}

export function useListingFilters(kindDefault: string) {
  const [filters, setFilters] = useState<ListingFiltersState>({ ...DEFAULTS, listing_kind: kindDefault });
  const pendingUrlRef = useRef<string | null>(null);

  // Sincronizar con query params en el cliente
  useEffect(() => {
    setFilters(parseQuery(kindDefault));
  }, [kindDefault]);

  // Sincronizar si cambia el query externamente (popstate)
  useEffect(() => {
    const onPop = () => setFilters(parseQuery(kindDefault));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [kindDefault]);

  const update = useCallback((patch: Partial<ListingFiltersState>, pushUrl = false) => {
    setFilters(prev => {
      const merged = { ...prev, ...patch } as ListingFiltersState;
      if (pushUrl) {
        pendingUrlRef.current = buildSearchUrl(merged);
      }
      return merged;
    });
  }, []);

  useEffect(() => {
    if (!pendingUrlRef.current) return;
    const nextUrl = pendingUrlRef.current;
    pendingUrlRef.current = null;
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', nextUrl);
    }
  }, [filters]);

  const setPage = useCallback((page: number, pushUrl = true) => {
    update({ page }, pushUrl);
  }, [update]);

  const normalizedForQuery = {
    ...filters,
    listing_kind: normalizeKindForQuery(filters.listing_kind),
  };

  return { filters, update, setPage, normalizedForQuery };
}


