"use client";
import React from "react";
import { useWizard, type PropertyWizardData } from "../context/WizardContext";
import { wizardFieldClass, wizardHintCardClass, wizardLabelMutedClass } from "../styles";

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
            <span className={wizardLabelMutedClass}>{field.label}</span>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min={field.min ?? undefined}
                value={values[field.key] ?? ""}
                onChange={(event) => handleChange(field.key, event.target.value)}
                className={wizardFieldClass}
              />
              {field.suffix ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-lighttext/70 dark:text-darktext/70">{field.suffix}</span>
              ) : null}
            </div>
          </label>
        ))}
      </div>

      <div className={`${wizardHintCardClass} text-sm text-lighttext/70 dark:text-darktext/70`}>
        <p className="font-medium text-lighttext dark:text-darktext">Consejo</p>
        <p>
          Completar superficies y año de construcción ayuda a posicionar mejor la propiedad en portales externos y cruces internos.
        </p>
      </div>
    </div>
  );
}

export default StepFeatures;
