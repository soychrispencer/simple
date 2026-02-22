"use client";
import { useEffect, useState } from 'react';

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
  const { includeInactive } = opts;
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [errorRegions, setErrorRegions] = useState<string | null>(null);
  const [errorCommunes, setErrorCommunes] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRegions() {
      if (cacheRegions.data) {
        setRegions(cacheRegions.data || []);
        return;
      }

      setLoadingRegions(true);
      setErrorRegions(null);

      const response = await fetch('/api/geo?mode=regions', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));

      if (!mounted) return;
      if (!response.ok) {
        setErrorRegions('No se pudieron cargar las regiones');
        setLoadingRegions(false);
        return;
      }

      const rawRows = Array.isArray((payload as { regions?: unknown[] }).regions)
        ? ((payload as { regions: RegionRow[] }).regions ?? [])
        : [];

      const filtered = includeInactive ? rawRows : rawRows.filter((row) => row.active !== false);
      cacheRegions.data = filtered;
      setRegions(filtered);
      setLoadingRegions(false);
    }

    loadRegions();
    return () => {
      mounted = false;
    };
  }, [includeInactive]);

  const loadCommunes = async (regionCode: string | null) => {
    if (!regionCode) {
      setCommunes([]);
      return;
    }

    if (cacheCommunes[regionCode]) {
      setCommunes(cacheCommunes[regionCode] || []);
      return;
    }

    setLoadingCommunes(true);
    setErrorCommunes(null);

    let region = regions.find((r) => r.code === regionCode);
    if (!region && cacheRegions.data) {
      region = cacheRegions.data.find((r) => r.code === regionCode);
    }

    if (!region) {
      setErrorCommunes('Region no encontrada');
      setLoadingCommunes(false);
      return;
    }

    const params = new URLSearchParams({ mode: 'communes', region_id: String(region.id) });
    const response = await fetch(`/api/geo?${params.toString()}`, { cache: 'no-store' });
    const payload = await response.json().catch(() => ({} as Record<string, unknown>));

    if (!response.ok) {
      setErrorCommunes('No se pudieron cargar las comunas');
      setLoadingCommunes(false);
      return;
    }

    const rawRows = Array.isArray((payload as { communes?: unknown[] }).communes)
      ? ((payload as { communes: CommuneRow[] }).communes ?? [])
      : [];

    const filtered = includeInactive ? rawRows : rawRows.filter((row) => row.active !== false);
    cacheCommunes[regionCode] = filtered;
    setCommunes(filtered);
    setLoadingCommunes(false);
  };

  return { regions, communes, loadingRegions, loadingCommunes, errorRegions, errorCommunes, loadCommunes };
}
