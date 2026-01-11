"use client";
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/supabase';

type DebugResults = {
  total: number;
  visibilityCounts: Record<string, number>;
  listingTypeCounts: Record<string, number>;
  profiles: Array<{ id: string; public_name: string | null; username: string | null }>;
  vehicles: Array<{ id: string; title: string; listing_type: string; visibility: string; user_id: string | null }>;
  error?: string;
};

export default function DirectQueryPage() {
  const [results, setResults] = useState<DebugResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = getSupabaseClient();

      try {
        const visibilityCounts: Record<string, number> = {};
        const listingTypeCounts: Record<string, number> = {};

        const { count: total } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true });

        const { data: visData } = await supabase
          .from('listings')
          .select('visibility')
          .limit(1000);

        visData?.forEach((row: any) => {
          if (!row?.visibility) return;
          visibilityCounts[row.visibility] = (visibilityCounts[row.visibility] || 0) + 1;
        });

        const { data: typeData } = await supabase
          .from('listings')
          .select('listing_type')
          .limit(1000);

        typeData?.forEach((row: any) => {
          if (!row?.listing_type) return;
          listingTypeCounts[row.listing_type] = (listingTypeCounts[row.listing_type] || 0) + 1;
        });

        const { data: profilesRaw } = await supabase
          .from('public_profiles')
          .select('owner_profile_id, public_name, slug')
          .order('updated_at', { ascending: false })
          .limit(10);

        const profiles = (profilesRaw ?? []).map((p: any) => ({
          id: String(p.owner_profile_id ?? ''),
          public_name: p.public_name ?? null,
          username: p.slug ?? null,
        }));

        const { data: vehiclesRaw } = await supabase
          .from('listings')
          .select('id, title, listing_type, visibility, user_id')
          .order('updated_at', { ascending: false })
          .limit(10);

        const vehicles = (vehiclesRaw ?? []).map((v: any) => ({
          id: String(v.id ?? ''),
          title: v.title ?? '',
          listing_type: v.listing_type ?? '',
          visibility: v.visibility ?? '',
          user_id: v.user_id ?? null,
        }));

        setResults({
          total: total || 0,
          visibilityCounts,
          listingTypeCounts,
          profiles,
          vehicles,
        });
      } catch (err: any) {
        setResults({
          total: 0,
          visibilityCounts: {},
          listingTypeCounts: {},
          profiles: [],
          vehicles: [],
          error: err?.message || 'Error desconocido',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div className="p-8">Consultando base de datos...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">?? Consulta Directa a Supabase</h1>
      
      {results?.error && (
        <div className="bg-[var(--color-danger-subtle-bg)] border border-[var(--color-danger-subtle-border)] text-[var(--color-danger)] px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {results.error}
        </div>
      )}

      <div className="space-y-6">
        <div className="card-surface shadow-card p-6 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">?? Total de veh�culos</h2>
          <p className="text-4xl font-bold text-primary">{results?.total || 0}</p>
        </div>

        <div className="card-surface shadow-card p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">??? Por Visibilidad</h2>
          <div className="space-y-2">
            {results?.visibilityCounts && Object.entries(results.visibilityCounts).map(([vis, count]) => (
              <div key={vis} className="flex justify-between items-center p-3 card-surface shadow-card rounded">
                <span className="font-mono font-semibold">&lsquo;{vis}&rsquo;</span>
                  <span className="text-2xl font-bold text-primary">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface shadow-card p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">?? Por Tipo de Publicación (listing_type)</h2>
          <div className="space-y-2">
            {results?.listingTypeCounts && Object.entries(results.listingTypeCounts).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center p-3 card-surface shadow-card rounded">
                <span className="font-mono font-semibold">&lsquo;{type}&rsquo;</span>
                  <span className="text-2xl font-bold text-primary">{count as number}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface shadow-card p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">?? Profiles de Vendedores</h2>
          <p className="mb-2">Total: <strong>{results?.profiles?.length || 0}</strong></p>
          {results?.profiles?.length ? (
            <div className="space-y-2">
              {results.profiles.map((p: any) => (
                <div key={p.id} className="text-sm p-2 card-surface shadow-card rounded">
                  <strong>{p.public_name || 'Sin nombre'}</strong> (@{p.username || 'sin-username'})
                  <div className="text-xs text-lighttext/70 dark:text-darktext/70">ID: {p.id}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="card-surface shadow-card p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">?? Listado de Veh�culos</h2>
          {results?.vehicles?.length ? (
            <div className="space-y-3">
              {results.vehicles.map((v: any) => (
                <div key={v.id} className="p-4 shadow-card rounded card-surface">
                  <div className="font-bold text-lg mb-2">{v.title}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-lighttext/70 dark:text-darktext/70">ID:</span> <code className="text-xs">{v.id}</code></div>
                    <div><span className="text-lighttext/70 dark:text-darktext/70">Tipo:</span> <strong className="text-primary">{v.listing_type}</strong></div>
                    <div><span className="text-lighttext/70 dark:text-darktext/70">Visibilidad:</span> <strong className="text-primary">{v.visibility}</strong></div>
                    <div><span className="text-lighttext/70 dark:text-darktext/70">Owner ID:</span> <code className="text-xs">{v.user_id?.slice(0, 16)}...</code></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-lighttext/70 dark:text-darktext/70">No hay veh�culos en la base de datos</p>
          )}
        </div>

        <div className="card-surface shadow-card p-4 rounded">
          <details>
            <summary className="cursor-pointer font-semibold mb-2">Ver JSON completo</summary>
            <pre className="mt-4 text-xs overflow-auto max-h-96 bg-[var(--field-bg)] p-4 rounded">
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}







