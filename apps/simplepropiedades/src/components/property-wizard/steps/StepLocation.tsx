"use client";
import React from "react";
import { useWizard } from "../context/WizardContext";
import { wizardFieldClass, wizardLabelMutedClass } from "../styles";

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
  const { state, patchSection } = useWizard();
  const location = state.data.location;
  const [regions, setRegions] = React.useState<RegionOption[]>([]);
  const [communes, setCommunes] = React.useState<CommuneOption[]>([]);
  const [loadingRegions, setLoadingRegions] = React.useState(false);
  const [loadingCommunes, setLoadingCommunes] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    async function run() {
      try {
        setLoadingRegions(true);
        const response = await fetch("/api/geo?mode=regions", { cache: "no-store" });
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!active) return;
        const rows = Array.isArray((payload as { regions?: unknown[] }).regions)
          ? ((payload as { regions: Array<{ id: string | number; name: string }> }).regions ?? [])
          : [];
        setRegions(rows.map((row) => ({ id: String(row.id), name: row.name })));
      } finally {
        if (active) setLoadingRegions(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (!location.region_id) {
      setCommunes([]);
      return;
    }
    let active = true;
    async function fetchCommunes() {
      try {
        setLoadingCommunes(true);
        const params = new URLSearchParams({
          mode: "communes",
          region_id: String(location.region_id || ""),
        });
        const response = await fetch(`/api/geo?${params.toString()}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({} as Record<string, unknown>));
        if (!active) return;
        const rows = Array.isArray((payload as { communes?: unknown[] }).communes)
          ? ((payload as { communes: Array<{ id: string | number; name: string; region_id: string | number }> }).communes ?? [])
          : [];
        setCommunes(
          rows.map((row) => ({ id: String(row.id), name: row.name, region_id: String(row.region_id) }))
        );
      } finally {
        if (active) setLoadingCommunes(false);
      }
    }
    fetchCommunes();
    return () => {
      active = false;
    };
  }, [location.region_id]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="space-y-1">
          <span className={wizardLabelMutedClass}>Región</span>
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
            className={wizardFieldClass}
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
          <span className={wizardLabelMutedClass}>Comuna</span>
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
            className={`${wizardFieldClass} disabled:opacity-50`}
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
        <span className={wizardLabelMutedClass}>Dirección (opcional)</span>
        <input
          type="text"
          value={location.address}
          onChange={(event) => patchSection("location", { address: event.target.value })}
          placeholder="Av. Italia 1234, Ñuñoa"
          className={wizardFieldClass}
        />
      </label>

      <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-lighttext/70 dark:text-darktext/70">
        Próximamente podrás geolocalizar la propiedad arrastrando un pin en el mapa.
      </div>
    </div>
  );
}

export default StepLocation;
