"use client";
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';

export interface RegionRow { id: number; code: string; name: string; sort_order: number; active: boolean }
export interface CommuneRow { id: number; region_id: number; code: string; name: string; sort_order: number; active: boolean }

interface UseGeoOptions { includeInactive?: boolean }

interface UseGeoLocationsReturn {
  regions: RegionRow[];
  communes: CommuneRow[];
  loadingRegions: boolean;
  loadingCommunes: boolean;
  errorRegions: string | null;
  errorCommunes: string | null;
  loadCommunes: (regionCode: string | null) => void;
}

const cacheRegions: { data: RegionRow[] | null } = { data: null };
const cacheCommunes: Record<string, CommuneRow[] | undefined> = {};

export function useGeoLocations(opts: UseGeoOptions = {}): UseGeoLocationsReturn {
  const supabase = useSupabase();
  const { includeInactive } = opts;
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [errorRegions, setErrorRegions] = useState<string | null>(null);
  const [errorCommunes, setErrorCommunes] = useState<string | null>(null);

  // Cargar regiones una vez
  useEffect(() => {
    let mounted = true;
    async function loadRegions() {
  if (cacheRegions.data) { setRegions(cacheRegions.data || []); return; }
      setLoadingRegions(true); setErrorRegions(null);
      let query = supabase.from('geo_regions').select('*').order('sort_order', { ascending: true });
      if (!includeInactive) query = query.eq('active', true);
      const { data, error } = await query;
      if (!mounted) return;
      if (error) { setErrorRegions(error.message); setLoadingRegions(false); return; }
  cacheRegions.data = (data || []);
  setRegions(cacheRegions.data || []);
      setLoadingRegions(false);
    }
    loadRegions();
    return () => { mounted = false; };
  }, [supabase, includeInactive]);

  const loadCommunes = async (regionCode: string | null) => {
    if (!regionCode) { setCommunes([]); return; }
    if (cacheCommunes[regionCode]) { setCommunes(cacheCommunes[regionCode]!); return; }
    setLoadingCommunes(true); setErrorCommunes(null);
    // Primero obtener id de la región (desde cacheRegions o de BD si no estuvo)
    let region = regions.find(r => r.code === regionCode);
    if (!region) {
      // Fallback query puntual
      const { data: regData } = await supabase.from('geo_regions').select('*').eq('code', regionCode).single();
      region = regData as any;
    }
    if (!region) { setErrorCommunes('Región no encontrada'); setLoadingCommunes(false); return; }
    let query = supabase.from('geo_communes').select('*').eq('region_id', region.id).order('sort_order', { ascending: true });
    if (!includeInactive) query = query.eq('active', true);
    const { data, error } = await query;
    if (error) { setErrorCommunes(error.message); setLoadingCommunes(false); return; }
    cacheCommunes[regionCode] = data || [];
    setCommunes(cacheCommunes[regionCode]!);
    setLoadingCommunes(false);
  };

  return { regions, communes, loadingRegions, loadingCommunes, errorRegions, errorCommunes, loadCommunes };
}


