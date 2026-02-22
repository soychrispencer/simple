"use client";

import { useEffect, useState } from "react";

type DebugVehicle = {
  id: string;
  title: string | null;
  user_id: string | null;
  status: string | null;
  visibility: string | null;
  created_at: string | null;
};

type DebugPayload = {
  user_id: string;
  all_vehicles_count: number;
  all_vehicles: DebugVehicle[];
  my_vehicles_count: number;
  my_vehicles: DebugVehicle[];
  error?: string;
};

export default function DirectQueryPage() {
  const [results, setResults] = useState<DebugPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const response = await fetch("/api/debug-vehicles", { cache: "no-store" });
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        if (cancelled) return;

        if (!response.ok) {
          setResults({
            user_id: "",
            all_vehicles_count: 0,
            all_vehicles: [],
            my_vehicles_count: 0,
            my_vehicles: [],
            error: String((payload as { error?: unknown }).error || `HTTP ${response.status}`),
          });
          return;
        }

        setResults(payload as DebugPayload);
      } catch (error: any) {
        if (!cancelled) {
          setResults({
            user_id: "",
            all_vehicles_count: 0,
            all_vehicles: [],
            my_vehicles_count: 0,
            my_vehicles: [],
            error: String(error?.message || "Error desconocido"),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="p-8">Consultando API interna...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug de Vehículos (API Interna)</h1>

      {results?.error ? (
        <div className="bg-[var(--color-danger-subtle-bg)] border border-[var(--color-danger-subtle-border)] text-[var(--color-danger)] px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {results.error}
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="card-surface shadow-card p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Mi usuario</h2>
          <p className="font-mono text-sm break-all">{results?.user_id || "N/A"}</p>
        </div>

        <div className="card-surface shadow-card p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Vehículos visibles en muestra</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border/60">
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Global (últimos 10)</div>
              <div className="text-3xl font-bold text-primary">{results?.all_vehicles_count ?? 0}</div>
            </div>
            <div className="p-4 rounded-lg border border-border/60">
              <div className="text-sm text-lighttext/70 dark:text-darktext/70">Míos</div>
              <div className="text-3xl font-bold text-primary">{results?.my_vehicles_count ?? 0}</div>
            </div>
          </div>
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

