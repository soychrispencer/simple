"use client";

import React from "react";
import { Button, FormStepper } from "@simple/ui";
import { useWizard, STEP_LABELS, WIZARD_STEPS, type WizardStep } from "./context/WizardContext";
import StepType from "./steps/StepType";
import StepBasic from "./steps/StepBasic";
import StepFeatures from "./steps/StepFeatures";
import StepAmenities from "./steps/StepAmenities";
import StepPricing from "./steps/StepPricing";
import StepLocation from "./steps/StepLocation";
import StepMedia from "./steps/StepMedia";
import StepReview from "./steps/StepReview";
import { WizardContainer } from "./WizardContainer";

const STEP_COMPONENTS: Record<WizardStep, React.FC> = {
  type: StepType,
  basic: StepBasic,
  features: StepFeatures,
  amenities: StepAmenities,
  pricing: StepPricing,
  location: StepLocation,
  media: StepMedia,
  review: StepReview,
};

const MissingStep: React.FC = () => <div>Paso no implementado</div>;

const STATUS_LABELS: Record<"pending" | "complete" | "current" | "error", string> = {
  pending: "Pendiente",
  complete: "Completo",
  current: "Actual",
  error: "Revisar",
};

export function PropertyWizard() {
  const { state, validity, nextStep, previousStep, setStep } = useWizard();
  const [navError, setNavError] = React.useState<string | null>(null);

  const steps = React.useMemo(
    () =>
      WIZARD_STEPS.map((key) => ({
        key,
        label: STEP_LABELS[key],
      })),
    []
  );

  const statuses = React.useMemo(() => {
    return steps.reduce<Record<string, "pending" | "complete" | "current" | "error">>((acc, step) => {
      if (state.step === step.key) {
        acc[step.key] = "current";
      } else if (validity[step.key]) {
        acc[step.key] = "complete";
      } else {
        acc[step.key] = "pending";
      }
      return acc;
    }, {});
  }, [steps, state.step, validity]);

  const completedSteps = React.useMemo(
    () => steps.filter((step) => statuses[step.key] === "complete").length,
    [steps, statuses]
  );

  const StepComponent = React.useMemo(() => STEP_COMPONENTS[state.step] ?? MissingStep, [state.step]);

  const handleNext = () => {
    const result = nextStep();
    if (!result.moved) {
      setNavError(result.reason ?? "Completa los campos requeridos antes de continuar");
    } else {
      setNavError(null);
    }
  };

  const handlePrev = () => {
    previousStep();
    setNavError(null);
  };

  return (
    <div className="space-y-5">
      <div className="card-surface rounded-panel p-4 sm:p-5">
        <FormStepper
          steps={steps}
          current={state.step}
          statuses={statuses}
          clickable
          className="w-full"
          onSelect={(key) => {
            const currentIndex = WIZARD_STEPS.indexOf(state.step);
            const targetIndex = WIZARD_STEPS.indexOf(key as WizardStep);
            if (targetIndex === -1 || targetIndex >= currentIndex) return;
            setStep(key as WizardStep);
            setNavError(null);
          }}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="rounded-panel card-surface border border-border/60 p-5 sm:p-7">
          <WizardContainer stepKey={state.step}>
            <StepComponent />
          </WizardContainer>
        </div>

        <aside className="rounded-panel card-surface border border-border/60 p-5 sm:p-6 space-y-5 xl:sticky xl:top-6">
          <div className="space-y-1">
            <p className="type-label text-lighttext/60 dark:text-darktext/60">Publicacion</p>
            <h2 className="type-title-3 text-lighttext dark:text-darktext">{STEP_LABELS[state.step]}</h2>
            <p className="type-body-sm text-lighttext/70 dark:text-darktext/70">
              {completedSteps} de {steps.length} pasos completados
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {steps.map((step, index) => {
              const status = statuses[step.key];
              const isCurrent = status === "current";
              return (
                <div
                  key={step.key}
                  className={[
                    "rounded-xl border px-3 py-2 text-sm transition-colors",
                    isCurrent
                      ? "border-[color:var(--color-primary-a40)] bg-[var(--color-primary-a10)]"
                      : "border-border/60 bg-[var(--field-bg)]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="type-body-sm font-medium text-lighttext dark:text-darktext">
                      {index + 1}. {step.label}
                    </span>
                    <span
                      className={[
                        "type-caption",
                        status === "complete" || status === "current"
                          ? "text-primary"
                          : "text-lighttext/70 dark:text-darktext/70",
                      ].join(" ")}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {navError ? <p className="text-sm text-[var(--color-danger)]">{navError}</p> : null}

          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <Button variant="ghost" disabled={state.step === "type"} onClick={handlePrev}>
              Anterior
            </Button>
            {state.step !== "review" ? (
              <Button variant="primary" onClick={handleNext}>
                Siguiente
              </Button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PropertyWizard;
