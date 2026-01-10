"use client";
import { useEffect, useState } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';

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
  const supabase = useSupabase();
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
      setLoading(true); setError(null);
      let response = await supabase
        .from('vehicle_types')
        .select('*')
        .order('sort_order', { ascending: true });

      // En entornos donde aún no existe sort_order, repetimos sin ese ORDER.
      if (response.error && /sort_order/i.test(response.error.message)) {
        response = await supabase
          .from('vehicle_types')
          .select('*')
          .order('name', { ascending: true });
      }

      if (!mounted) return;
      if (response.error) {
        setError(response.error.message);
        setLoading(false);
        return;
      }

      const rows = (response.data || []).map((row: any): VehicleTypeRow => {
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
    return () => { mounted = false; };
  }, [supabase, opts.includeInactive]);

  return { vehicleTypes: data, loading, error };
}


