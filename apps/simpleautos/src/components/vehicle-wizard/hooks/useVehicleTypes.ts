"use client";
import { useEffect, useState } from 'react';

export interface VehicleTypeRow {
  id: string;
  slug: string;
  label: string;
  category?: string | null;
  active: boolean;
  sort_order: number;
}

interface UseVehicleTypesOptions {
  includeInactive?: boolean;
}

export function useVehicleTypes(opts: UseVehicleTypesOptions = {}) {
  const [data, setData] = useState<VehicleTypeRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const normalizeSlug = (value: string | null | undefined) => {
      const base = (value ?? '').trim();
      return base
        ? base.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
        : '';
    };

    async function load() {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/vehicle-catalog?mode=types', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      const rowsRaw = Array.isArray((payload as { types?: unknown[] }).types)
        ? ((payload as { types: Record<string, unknown>[] }).types ?? [])
        : [];

      if (!mounted) return;
      if (!response.ok) {
        setError('No se pudieron cargar los tipos de vehiculo');
        setLoading(false);
        return;
      }

      const rows = rowsRaw.map((row: any): VehicleTypeRow => {
        const fallbackLabel = row.label ?? row.name ?? row.slug ?? 'Otro';
        return {
          id: row.id,
          slug: row.slug ?? normalizeSlug(fallbackLabel) ?? '',
          label: fallbackLabel,
          category: typeof row.category === 'string' ? row.category : (row.category ?? null),
          active: typeof row.active === 'boolean' ? row.active : true,
          sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
        };
      });

      const filtered = rows.filter((r: VehicleTypeRow) => (opts.includeInactive ? true : r.active));
      setData(filtered);
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [opts.includeInactive]);

  return { vehicleTypes: data, loading, error };
}
