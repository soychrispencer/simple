"use client";
import React from "react";
import { useWizard, type PropertyWizardData } from "../context/WizardContext";

const featureFields: Array<{
  key: keyof PropertyWizardData["features"];
  label: string;
  suffix?: string;
  min?: number;
}> = [
  { key: "area_m2", label: "Superficie total", suffix: "m²", min: 10 },
  { key: "area_built_m2", label: "Construidos", suffix: "m²" },
  { key: "land_area", label: "Terreno", suffix: "m²" },
  { key: "bedrooms", label: "Dormitorios", min: 0 },
  { key: "bathrooms", label: "Baños", min: 0 },
  { key: "parking_spaces", label: "Estacionamientos", min: 0 },
  { key: "floor", label: "Piso" },
  { key: "total_floors", label: "Pisos totales" },
  { key: "year_built", label: "Año construcción" },
];

function StepFeatures() {
  const { state, patchSection } = useWizard();
  const values = state.data.features;

  const handleChange = (field: keyof typeof values, raw: string) => {
    const numeric = raw === "" ? null : Number(raw);
    patchSection("features", { [field]: Number.isFinite(numeric) ? numeric : null });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {featureFields.map((field) => (
          <label key={field.key} className="space-y-1">
            <span className="text-xs font-medium text-lighttext/80 dark:text-darktext/80">{field.label}</span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={field.min ?? undefined}
                value={values[field.key] ?? ""}
                onChange={(event) => handleChange(field.key, event.target.value)}
                className="w-full rounded-xl bg-[var(--field-bg)] border border-[var(--field-border)] px-4 py-3 text-sm text-[var(--field-text)] placeholder:text-[var(--field-placeholder)] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-border/60 hover:bg-[var(--field-bg-hover)] hover:border-[var(--field-border-hover)]"
              />
              {field.suffix ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-lighttext/70 dark:text-darktext/70">{field.suffix}</span>
              ) : null}
            </div>
          </label>
        ))}
      </div>

      <div className="rounded-xl card-surface ring-1 ring-border/60 p-4 text-sm text-lighttext/70 dark:text-darktext/70">
        <p className="font-medium text-lighttext dark:text-darktext">Consejo</p>
        <p>
          Completar superficies y año de construcción ayuda a posicionar mejor la propiedad en portales externos y cruces internos.
        </p>
      </div>
    </div>
  );
}

export default StepFeatures;
