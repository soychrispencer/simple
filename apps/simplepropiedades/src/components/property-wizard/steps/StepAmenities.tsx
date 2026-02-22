"use client";
import React from "react";
import { useWizard } from "../context/WizardContext";
import { wizardSectionTitleClass } from "../styles";

const amenityGroups = [
  {
    title: "Confort",
    items: [
      { key: "has_pool", label: "Piscina" },
      { key: "has_garden", label: "Jardín" },
      { key: "has_balcony", label: "Balcón" },
      { key: "has_terrace", label: "Terraza" },
    ],
  },
  {
    title: "Edificio",
    items: [
      { key: "has_elevator", label: "Ascensor" },
      { key: "has_gym", label: "Gimnasio" },
      { key: "has_security", label: "Seguridad 24/7" },
    ],
  },
  {
    title: "Reglas",
    items: [
      { key: "is_furnished", label: "Amoblado" },
      { key: "allows_pets", label: "Acepta mascotas" },
    ],
  },
] as const;

type AmenityKey = (typeof amenityGroups)[number]["items"][number]["key"];

function StepAmenities() {
  const { state, patchSection } = useWizard();
  const values = state.data.amenities;

  const toggle = (key: AmenityKey) => {
    patchSection("amenities", { [key]: !values[key] });
  };

  return (
    <div className="space-y-6">
      {amenityGroups.map((group) => (
        <section key={group.title} className="space-y-3">
          <h4 className={wizardSectionTitleClass}>{group.title}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => toggle(item.key)}
                className={[
                  "flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition ring-1",
                  values[item.key]
                    ? "ring-primary bg-[var(--color-primary-a05)] text-primary"
                    : "card-surface ring-border/60 text-lighttext/70 dark:text-darktext/70 hover:bg-[var(--field-bg-hover)] hover:ring-border",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-5 w-5 items-center justify-center rounded-full border",
                    values[item.key]
                      ? "border-primary bg-primary text-[var(--color-on-primary)]"
                      : "border-[var(--field-border)] text-lighttext/70",
                  ].join(" ")}
                >
                  {values[item.key] ? "✓" : ""}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default StepAmenities;
