"use client";
import React from "react";
import { PROPERTY_TYPE_OPTIONS, type ListingType } from "@/types/property";
import { Button } from "@simple/ui";
import { useWizard, type PropertyWizardData } from "../context/WizardContext";

const listingTypeOptions: Array<{ value: ListingType; label: string; description: string }> = [
  { value: "sale", label: "Venta", description: "Publicación tradicional para vender" },
  { value: "rent", label: "Arriendo", description: "Propiedades en arriendo mensual" },
  { value: "auction", label: "Subasta", description: "Ventas rápidas con puja" },
];

const cardBaseClass =
  "rounded-2xl ring-1 p-4 flex flex-col gap-2 cursor-pointer transition hover:ring-primary hover:bg-[var(--color-primary-a05)]";

function StepType() {
  const { state, patchSection } = useWizard();
  const selectedType = state.data.type.property_type;
  const selectedListing = state.data.type.listing_type;

  const handleListingChange = (value: ListingType) => {
    patchSection("type", { listing_type: value });
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Tipo de publicación</h3>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">
            Elige el formato que mejor se ajuste a tu operación actual.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {listingTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleListingChange(option.value)}
              className={[
                cardBaseClass,
                selectedListing === option.value
                  ? "ring-primary bg-[var(--color-primary-a05)] shadow-inner"
                  : "card-surface ring-border/60",
              ].join(" ")}
            >
              <span className="text-sm font-semibold text-lighttext dark:text-darktext">{option.label}</span>
              <span className="text-xs text-lighttext/70 dark:text-darktext/70">{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-lighttext dark:text-darktext">Categoría de propiedad</h3>
          <p className="text-sm text-lighttext/70 dark:text-darktext/70">
            Escoge la categoría que mejor describe tu propiedad.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => patchSection("type", { property_type: option.value })}
              className={[
                cardBaseClass,
                selectedType === option.value
                  ? "ring-primary bg-[var(--color-primary-a05)] shadow-inner"
                  : "card-surface ring-border/60",
              ].join(" ")}
            >
              <span className="text-2xl" aria-hidden>
                {option.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-lighttext dark:text-darktext">{option.label}</span>
                <span className="text-xs text-lighttext/70 dark:text-darktext/70">{option.value}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="card-surface ring-1 ring-border/60 rounded-xl p-4 text-sm text-lighttext/70 dark:text-darktext/70">
        <p className="font-medium text-lighttext dark:text-darktext">¿Qué sigue?</p>
        <p>
          Luego completaremos los detalles de la propiedad, ubicación y medios. Puedes modificar el tipo seleccionado en cualquier
          momento antes de publicar.
        </p>
      </div>

      <div className="flex justify-end">
        <Button variant="subtle" onClick={() => patchSection("type", createDefaultType())}>
          Limpiar selección
        </Button>
      </div>
    </div>
  );
}

function createDefaultType() {
  return { property_type: null, listing_type: null } as PropertyWizardData["type"];
}

export default StepType;
