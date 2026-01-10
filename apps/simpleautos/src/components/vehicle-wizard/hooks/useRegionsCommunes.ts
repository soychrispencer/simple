"use client";
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';

export interface Region { id:number; name:string; slug:string|null; active:boolean; sort_order:number }
export interface Commune { id:number; region_id:number; name:string; slug:string|null; active:boolean; sort_order:number }

interface UseRegionsCommunesOptions { includeInactive?: boolean; enableFallbackSeed?: boolean }

interface ReturnShape {
  regions: Region[];
  communes: Commune[];
  loadingRegions: boolean;
  loadingCommunes: boolean;
  errorRegions: string|null;
  errorCommunes: string|null;
  loadCommunesByRegionSlug: (slug: string|null) => void;
  refreshRegions: () => Promise<void>;
  diagnostics: {
    usedFallback: boolean;
    regionCount: number;
  };
}

const cacheRegions: { data: Region[] | null } = { data: null };
const cacheCommunes: Record<string, Commune[] | undefined> = {};

export function useRegionsCommunes(opts: UseRegionsCommunesOptions = {}): ReturnShape {
  const supabase = useSupabase();
  const { includeInactive, enableFallbackSeed } = opts;
  const [regions, setRegions] = useState<Region[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [errorRegions, setErrorRegions] = useState<string|null>(null);
  const [errorCommunes, setErrorCommunes] = useState<string|null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const internalLoad = async (forceReload = false) => {
    if (!forceReload && cacheRegions.data) { setRegions(cacheRegions.data || []); return; }
    setLoadingRegions(true); setErrorRegions(null); setUsedFallback(false);
    let query = supabase.from('regions').select('*').order('sort_order');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) { setErrorRegions(error.message); setLoadingRegions(false); return; }
    const rows = data || [];
    if (rows.length === 0 && enableFallbackSeed) {
      const fallback: Region[] = [
        { id: -1, name: 'Región Metropolitana (seed)', slug: 'rm', active: true, sort_order: 10 },
        { id: -2, name: 'Valparaíso (seed)', slug: 'valparaiso', active: true, sort_order: 20 },
        { id: -3, name: 'Biobío (seed)', slug: 'biobio', active: true, sort_order: 30 }
      ];
      setErrorRegions('Tabla regions vacía (fallback).');
      cacheRegions.data = fallback;
      setRegions(fallback);
      setUsedFallback(true);
      setLoadingRegions(false);
      return;
    }
    cacheRegions.data = rows;
    setRegions(rows);
    setLoadingRegions(false);
  };

  useEffect(() => {
    internalLoad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, includeInactive]);

  const refreshRegions = async () => {
    await internalLoad(true);
  };

  const loadCommunesByRegionSlug = async (slug: string|null) => {
    if (!slug) { setCommunes([]); return; }
    if (cacheCommunes[slug]) { setCommunes(cacheCommunes[slug]!); return; }
    setLoadingCommunes(true); setErrorCommunes(null);
    const region = (cacheRegions.data || regions).find(r => r.slug === slug);
    if (!region) { setErrorCommunes('Región no encontrada'); setLoadingCommunes(false); return; }
    let query = supabase.from('communes').select('*').eq('region_id', region.id).order('sort_order');
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) { setErrorCommunes(error.message); setLoadingCommunes(false); return; }
    cacheCommunes[slug] = data || [];
    setCommunes(cacheCommunes[slug]!);
    setLoadingCommunes(false);
  };

  return { regions, communes, loadingRegions, loadingCommunes, errorRegions, errorCommunes, loadCommunesByRegionSlug, refreshRegions, diagnostics: { usedFallback, regionCount: regions.length } };
}


