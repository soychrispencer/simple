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
    <div className="space-y-6">
      <FormStepper
        steps={steps}
        current={state.step}
        statuses={statuses}
        clickable
        onSelect={(key) => {
          const currentIndex = WIZARD_STEPS.indexOf(state.step);
          const targetIndex = WIZARD_STEPS.indexOf(key as WizardStep);
          if (targetIndex === -1 || targetIndex >= currentIndex) return;
          setStep(key as WizardStep);
          setNavError(null);
        }}
      />

      <div className="rounded-2xl card-surface ring-1 ring-border/60 shadow-token-lg p-6">
        <StepComponent />
      </div>

      {navError ? <p className="text-sm text-[var(--color-danger)]">{navError}</p> : null}

      <div className="flex items-center justify-between">
        <Button variant="ghost" disabled={state.step === "type"} onClick={handlePrev}>
          Anterior
        </Button>
        {state.step !== "review" ? (
          <Button variant="primary" onClick={handleNext}>
            Siguiente
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default PropertyWizard;
