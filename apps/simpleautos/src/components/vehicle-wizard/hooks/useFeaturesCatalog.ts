"use client";
import { useEffect, useState } from 'react';

export interface FeatureRow {
  id?: string;
  code: string;
  label: string;
  category?: string | null;
  sort_order?: number | null;
  active: boolean;
  allowed_types?: string[] | null;
  allowed_body_types?: string[] | null;
}

interface UseFeaturesOptions {
  typeSlug?: string | null;
  bodyType?: string | null;
  includeInactive?: boolean;
}

const featuresCache: Record<string, FeatureRow[]> = {};

export function useFeaturesCatalog(opts: UseFeaturesOptions) {
  const { typeSlug, bodyType, includeInactive } = opts;
  const [data, setData] = useState<FeatureRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!typeSlug) {
        setData([]);
        return;
      }

      const bodyTypeKey = bodyType ? String(bodyType) : 'any';
      const cacheKey = `${typeSlug}::bt=${bodyTypeKey}::${includeInactive ? 'all' : 'active'}`;

      if (featuresCache[cacheKey]) {
        setData(featuresCache[cacheKey]);
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type_slug: String(typeSlug) });
      if (bodyType) params.set('body_type', String(bodyType));
      if (includeInactive) params.set('include_inactive', 'true');

      const response = await fetch(`/api/features-catalog?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));

      if (!mounted) return;

      if (!response.ok) {
        setError('No se pudo cargar el catalogo de equipamiento');
        setLoading(false);
        return;
      }

      const rows = Array.isArray((payload as { features?: unknown[] }).features)
        ? ((payload as { features: FeatureRow[] }).features ?? [])
        : [];

      featuresCache[cacheKey] = rows;
      setData(rows);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [typeSlug, bodyType, includeInactive]);

  return { features: data, loading, error };
}
