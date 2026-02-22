"use client";
import React from "react";
import { Button, useToast } from "@simple/ui";
import { useWizard, WIZARD_STEPS } from "../context/WizardContext";
import { useSubmitProperty } from "@/lib/submitProperty";
import { wizardFieldClass, wizardHintCardClass, wizardLabelMutedClass } from "../styles";

function StepReview() {
  const { state, patchSection, validateStep, setPropertyId } = useWizard();
  const { submit } = useSubmitProperty();
  const toast = useToast();
  const [loading, setLoading] = React.useState<"draft" | "publish" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (mode: "draft" | "publish") => {
    const stepsToValidate = WIZARD_STEPS.filter((step) => step !== "review");
    for (const step of stepsToValidate) {
      const result = validateStep(step);
      if (!result.valid) {
        setError(result.reason ?? "Completa los pasos pendientes antes de publicar");
        return;
      }
    }

    patchSection("review", { publish_now: mode === "publish" });
    setError(null);
    setLoading(mode);
    const response = await submit(state, mode === "publish");
    setLoading(null);

    if (response.error) {
      toast.error(response.error.message ?? "No pudimos guardar, inténtalo nuevamente en unos minutos");
      return;
    }

    if (response.id) {
      setPropertyId(response.id);
    }

    if (mode === "publish") {
      toast.success("Publicación enviada. Tu propiedad ya aparece en Simple.");
      return;
    }

    toast.info("Borrador guardado. Puedes continuar editando cuando quieras.");
  };

  const summary = [
    { label: "Tipo", value: `${state.data.type.property_type || "—"} · ${state.data.type.listing_type || "—"}` },
    {
      label: "Ubicación",
      value: state.data.location.commune_name
        ? `${state.data.location.commune_name}, ${state.data.location.region_name}`
        : "Pendiente",
    },
    {
      label: "Precio",
      value:
        state.data.type.listing_type === "rent"
          ? currency(state.data.pricing.rent_price, state.data.pricing.currency)
          : currency(state.data.pricing.price, state.data.pricing.currency),
    },
    { label: "Imágenes", value: `${state.data.media.images.length} archivos` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {summary.map((item) => (
          <div key={item.label} className={wizardHintCardClass}>
            <p className="text-xs uppercase tracking-wide text-lighttext/60 dark:text-darktext/60">{item.label}</p>
            <p className="text-sm font-medium text-lighttext dark:text-darktext">{item.value}</p>
          </div>
        ))}
      </div>

      <label className="space-y-1 block">
        <span className={wizardLabelMutedClass}>Visibilidad</span>
        <select
          value={state.data.review.visibility}
          onChange={(event) => patchSection("review", { visibility: event.target.value as typeof state.data.review.visibility })}
          className={wizardFieldClass}
        >
          <option value="normal">Normal</option>
          <option value="featured">Destacada (requiere cupos)</option>
          <option value="hidden">Oculta</option>
        </select>
      </label>

      <div className="flex items-center gap-3 rounded-xl card-surface ring-1 ring-border/60 px-4 py-3">
        <input
          id="publish_now"
          type="checkbox"
          checked={state.data.review.publish_now}
          onChange={(event) => patchSection("review", { publish_now: event.target.checked })}
          className="h-4 w-4 accent-primary rounded border-[var(--field-border)] text-primary focus:ring-border/60 focus:ring-1"
        />
        <label htmlFor="publish_now" className="text-sm text-lighttext/80 dark:text-darktext/80">
          Publicar inmediatamente después de guardar
        </label>
      </div>

      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" onClick={() => handleSubmit("draft")} loading={loading === "draft"}>
          Guardar borrador
        </Button>
        <Button variant="primary" onClick={() => handleSubmit("publish")} loading={loading === "publish"}>
          Publicar ahora
        </Button>
      </div>
    </div>
  );
}

function currency(value: number | null, currencyCode: "CLP" | "USD") {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: currencyCode === "CLP" ? 0 : 2,
  }).format(value || 0);
}

export default StepReview;
