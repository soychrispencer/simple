"use client";
import React from "react";
import { PROPERTY_TYPE_OPTIONS, type ListingType } from "@/types/property";
import { Button } from "@simple/ui";
import { useWizard, type PropertyWizardData } from "../context/WizardContext";
import { wizardSectionDescriptionClass, wizardSectionTitleClass, wizardHintCardClass } from "../styles";
import {
  IconBuildingSkyscraper,
  IconBuildingStore,
  IconBuildingWarehouse,
  IconHome,
  IconMap2,
  IconBuildingCommunity,
} from "@tabler/icons-react";

const listingTypeOptions: Array<{ value: ListingType; label: string; description: string }> = [
  { value: "sale", label: "Venta", description: "Publicación tradicional para vender" },
  { value: "rent", label: "Arriendo", description: "Propiedades en arriendo mensual" },
];

const STAGGER_CLASSES = ["wizard-stagger-0", "wizard-stagger-1", "wizard-stagger-2", "wizard-stagger-3", "wizard-stagger-4", "wizard-stagger-5"];

function propertyIcon(value: string) {
  const iconProps = { size: 34, stroke: 1.5 } as const;
  switch (value) {
    case "house":
      return <IconHome {...iconProps} />;
    case "apartment":
      return <IconBuildingCommunity {...iconProps} />;
    case "commercial":
      return <IconBuildingStore {...iconProps} />;
    case "land":
      return <IconMap2 {...iconProps} />;
    case "office":
      return <IconBuildingSkyscraper {...iconProps} />;
    case "warehouse":
      return <IconBuildingWarehouse {...iconProps} />;
    default:
      return <IconHome {...iconProps} />;
  }
}

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
          <h3 className={wizardSectionTitleClass}>Tipo de publicación</h3>
          <p className={wizardSectionDescriptionClass}>
            Elige el formato que mejor se ajuste a tu operación actual.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listingTypeOptions.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleListingChange(option.value)}
              className={[
                "intent-card-base animate-fade-up-soft",
                STAGGER_CLASSES[idx % STAGGER_CLASSES.length],
                selectedListing === option.value ? "intent-card-base-selected" : "",
              ].join(" ")}
            >
              <div className={`intent-card-base-icon ${selectedListing === option.value ? "animate-pop-in" : ""}`}>
                {option.value === "sale" ? "V" : "A"}
              </div>
              <span className="intent-card-base-title">{option.label}</span>
              <span className="type-caption text-lighttext/70 dark:text-darktext/70">{option.description}</span>
              {selectedListing === option.value ? <div className="intent-card-base-check">✓</div> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className={wizardSectionTitleClass}>Categoría de propiedad</h3>
          <p className={wizardSectionDescriptionClass}>
            Escoge la categoría que mejor describe tu propiedad.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {PROPERTY_TYPE_OPTIONS.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              onClick={() => patchSection("type", { property_type: option.value })}
              className={[
                "intent-card-base animate-fade-up-soft",
                STAGGER_CLASSES[idx % STAGGER_CLASSES.length],
                selectedType === option.value ? "intent-card-base-selected" : "",
              ].join(" ")}
            >
              <div className={`intent-card-base-icon ${selectedType === option.value ? "animate-pop-in" : ""}`}>
                {propertyIcon(option.value)}
              </div>
              <span className="intent-card-base-title">{option.label}</span>
              <span className="intent-card-base-desc">{option.value}</span>
              {selectedType === option.value ? <div className="intent-card-base-check">✓</div> : null}
            </button>
          ))}
        </div>
      </section>

      <div className={`${wizardHintCardClass} type-body-sm text-lighttext/70 dark:text-darktext/70`}>
        <p className="type-body-sm font-medium text-lighttext dark:text-darktext">¿Qué sigue?</p>
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
