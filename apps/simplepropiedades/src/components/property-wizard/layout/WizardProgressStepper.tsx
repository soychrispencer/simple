"use client";

import React from "react";
import { FormStepper, type StepStatus } from "@simple/ui";
import { STEP_LABELS, useWizard, WIZARD_STEPS, type WizardStep } from "../context/WizardContext";

function buildStatuses(
  validity: Partial<Record<WizardStep, boolean>>,
  steps: WizardStep[]
): Partial<Record<string, StepStatus>> {
  return steps.reduce<Partial<Record<string, StepStatus>>>((acc, step) => {
    acc[step] = validity[step] ? "complete" : "pending";
    return acc;
  }, {});
}

export function WizardProgressStepper({ className }: { className?: string }) {
  const { state, validity, setStep, validateStep } = useWizard();

  const steps = React.useMemo(
    () => WIZARD_STEPS.map((key) => ({ key, label: STEP_LABELS[key] })),
    []
  );
  const statuses = React.useMemo(
    () => buildStatuses(validity, WIZARD_STEPS),
    [validity]
  );

  return (
    <div className={["w-full", className].filter(Boolean).join(" ")}>
      <FormStepper
        steps={steps}
        current={state.step}
        statuses={statuses}
        clickable
        className="w-full"
        onSelect={(key) => {
          if (key === state.step) return;
          const target = key as WizardStep;
          const targetIndex = WIZARD_STEPS.indexOf(target);
          const currentIndex = WIZARD_STEPS.indexOf(state.step);
          if (targetIndex === -1 || targetIndex > currentIndex) return;
          validateStep(target);
          setStep(target);
        }}
      />
    </div>
  );
}

export default WizardProgressStepper;
