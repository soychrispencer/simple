"use client";
import React from "react";
import { useSupabase } from "@simple/ui";
import { useWizard } from "../context/WizardContext";

interface RegionOption {
  id: string;
  name: string;
}

interface CommuneOption {
  id: string;
  name: string;
  region_id: string;
}

function StepLocation() {
  const supabase = useSupabase();
  const { state, patchSection } = useWizard();
  const location = state.data.location;
  const [regions, setRegions] = React.useState<RegionOption[]>([]);
  const [communes, setCommunes] = React.useState<CommuneOption[]>([]);
  const [loadingRegions, setLoadingRegions] = React.useState(false);
  const [loadingCommunes, setLoadingCommunes] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function run() {
      setLoadingRegions(true);
      const { data } = await supabase.from("regions").select("id,name").order("name");
      if (!active) return;
      setRegions((data || []).map((row) => ({ id: String(row.id), name: row.name })));
      setLoadingRegions(false);
    }
    run();
    return () => {
      active = false;
    };
  }, [supabase]);

  React.useEffect(() => {
    if (!location.region_id) {
      setCommunes([]);
      return;
    }
    let active = true;
    async function fetchCommunes() {
      setLoadingCommunes(true);
      const { data } = await supabase
        .from("communes")
        .select("id,name,region_id")
        .eq("region_id", location.region_id)
        .order("name");
      if (!active) return;
      setCommunes((data || []).map((row) => ({ id: String(row.id), name: row.name, region_id: String(row.region_id) })));
      setLoadingCommunes(false);
    }
    fetchCommunes();
    return () => {
      active = false;
    };
  }, [location.region_id, supabase]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className="text-xs font-medium text-lighttext/80 dark:text-darktext/80">Región</span>
          <select
            value={location.region_id ?? ""}
            onChange={(event) =>
              patchSection("location", {
                region_id: event.target.value || null,
                commune_id: null,
                region_name: event.target.value
                  ? regions.find((region) => region.id === event.target.value)?.name || null
                  : null,
                commune_name: null,
              })
            }
            className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]"
          >
            <option value="" disabled>
              {loadingRegions ? "Cargando regiones..." : "Selecciona una región"}
            </option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-lighttext/80 dark:text-darktext/80">Comuna</span>
          <select
            value={location.commune_id ?? ""}
            onChange={(event) =>
              patchSection("location", {
                commune_id: event.target.value || null,
                commune_name: event.target.value
                  ? communes.find((com) => com.id === event.target.value)?.name || null
                  : null,
              })
            }
            disabled={!location.region_id}
            className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)] disabled:opacity-50"
          >
            <option value="" disabled>
              {!location.region_id
                ? "Selecciona una región primero"
                : loadingCommunes
                ? "Cargando comunas..."
                : "Selecciona una comuna"}
            </option>
            {communes.map((commune) => (
              <option key={commune.id} value={commune.id}>
                {commune.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="text-xs font-medium text-lighttext/80 dark:text-darktext/80">Dirección (opcional)</span>
        <input
          type="text"
          value={location.address}
          onChange={(event) => patchSection("location", { address: event.target.value })}
          placeholder="Av. Italia 1234, Ñuñoa"
          className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]"
        />
      </label>

      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-lighttext/70 dark:text-darktext/70">
        Próximamente podrás geolocalizar la propiedad arrastrando un pin en el mapa.
      </div>
    </div>
  );
}

export default StepLocation;
