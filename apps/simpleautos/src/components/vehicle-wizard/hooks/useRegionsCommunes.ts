"use client";

import { useEffect, useState } from "react";

export interface Region {
  id: number;
  name: string;
  slug: string | null;
  active: boolean;
  sort_order: number;
}

export interface Commune {
  id: number;
  region_id: number;
  name: string;
  slug: string | null;
  active: boolean;
  sort_order: number;
}

interface UseRegionsCommunesOptions {
  includeInactive?: boolean;
  enableFallbackSeed?: boolean;
}

interface ReturnShape {
  regions: Region[];
  communes: Commune[];
  loadingRegions: boolean;
  loadingCommunes: boolean;
  errorRegions: string | null;
  errorCommunes: string | null;
  loadCommunesByRegionSlug: (slug: string | null) => void;
  refreshRegions: () => Promise<void>;
  diagnostics: {
    usedFallback: boolean;
    regionCount: number;
  };
}

type RegionsPayload = {
  regions?: Array<{
    id: number | string;
    name: string;
    slug?: string | null;
    active?: boolean | null;
    sort_order?: number | string | null;
  }>;
};

type CommunesPayload = {
  communes?: Array<{
    id: number | string;
    region_id: number | string;
    name: string;
    slug?: string | null;
    active?: boolean | null;
    sort_order?: number | string | null;
  }>;
};

const cacheRegions: { data: Region[] | null } = { data: null };
const cacheCommunes: Record<string, Commune[] | undefined> = {};

function normalizeRegions(payload: RegionsPayload): Region[] {
  return (payload.regions || [])
    .map((region, index) => ({
      id: Number(region.id),
      name: String(region.name || ""),
      slug: typeof region.slug === "string" ? region.slug : null,
      active: region.active !== false,
      sort_order: Number(region.sort_order ?? index + 1),
    }))
    .filter((region) => Number.isFinite(region.id) && region.name.length > 0);
}

function normalizeCommunes(payload: CommunesPayload): Commune[] {
  return (payload.communes || [])
    .map((commune, index) => ({
      id: Number(commune.id),
      region_id: Number(commune.region_id),
      name: String(commune.name || ""),
      slug: typeof commune.slug === "string" ? commune.slug : null,
      active: commune.active !== false,
      sort_order: Number(commune.sort_order ?? index + 1),
    }))
    .filter(
      (commune) =>
        Number.isFinite(commune.id) &&
        Number.isFinite(commune.region_id) &&
        commune.name.length > 0
    );
}

export function useRegionsCommunes(
  opts: UseRegionsCommunesOptions = {}
): ReturnShape {
  const { includeInactive, enableFallbackSeed } = opts;
  const [regions, setRegions] = useState<Region[]>([]);
  const [communes, setCommunes] = useState<Commune[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [errorRegions, setErrorRegions] = useState<string | null>(null);
  const [errorCommunes, setErrorCommunes] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const internalLoad = async (forceReload = false) => {
    if (!forceReload && cacheRegions.data) {
      setRegions(cacheRegions.data || []);
      return;
    }
    setLoadingRegions(true);
    setErrorRegions(null);
    setUsedFallback(false);

    try {
      const response = await fetch("/api/geo?mode=regions", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`No se pudieron cargar regiones (${response.status})`);
      }

      const payload = (await response.json()) as RegionsPayload;
      let rows = normalizeRegions(payload);
      if (!includeInactive) {
        rows = rows.filter((region) => region.active);
      }

      if (rows.length === 0 && enableFallbackSeed) {
        const fallback: Region[] = [
          {
            id: -1,
            name: "Región Metropolitana (seed)",
            slug: "rm",
            active: true,
            sort_order: 10,
          },
          {
            id: -2,
            name: "Valparaíso (seed)",
            slug: "valparaiso",
            active: true,
            sort_order: 20,
          },
          {
            id: -3,
            name: "Biobío (seed)",
            slug: "biobio",
            active: true,
            sort_order: 30,
          },
        ];
        setErrorRegions("Tabla regions vacía (fallback).");
        cacheRegions.data = fallback;
        setRegions(fallback);
        setUsedFallback(true);
        return;
      }

      cacheRegions.data = rows;
      setRegions(rows);
    } catch (error) {
      setErrorRegions(
        error instanceof Error ? error.message : "Error cargando regiones"
      );
    } finally {
      setLoadingRegions(false);
    }
  };

  useEffect(() => {
    internalLoad(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  const refreshRegions = async () => {
    await internalLoad(true);
  };

  const loadCommunesByRegionSlug = async (slug: string | null) => {
    if (!slug) {
      setCommunes([]);
      return;
    }
    if (cacheCommunes[slug]) {
      setCommunes(cacheCommunes[slug] || []);
      return;
    }

    setLoadingCommunes(true);
    setErrorCommunes(null);
    const region = (cacheRegions.data || regions).find((r) => r.slug === slug);
    if (!region) {
      setErrorCommunes("Región no encontrada");
      setLoadingCommunes(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/geo?mode=communes&region_id=${encodeURIComponent(String(region.id))}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(`No se pudieron cargar comunas (${response.status})`);
      }

      const payload = (await response.json()) as CommunesPayload;
      let rows = normalizeCommunes(payload);
      if (!includeInactive) {
        rows = rows.filter((commune) => commune.active);
      }

      cacheCommunes[slug] = rows;
      setCommunes(rows);
    } catch (error) {
      setErrorCommunes(
        error instanceof Error ? error.message : "Error cargando comunas"
      );
    } finally {
      setLoadingCommunes(false);
    }
  };

  return {
    regions,
    communes,
    loadingRegions,
    loadingCommunes,
    errorRegions,
    errorCommunes,
    loadCommunesByRegionSlug,
    refreshRegions,
    diagnostics: {
      usedFallback,
      regionCount: regions.length,
    },
  };
}

