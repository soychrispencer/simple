"use client";

import React from 'react';
import { FormStepper, type StepStatus } from '@simple/ui';
import {
  getWizardSteps,
  useWizard,
  WIZARD_STEP_LABELS,
  type WizardStep,
} from '@/components/vehicle-wizard/context/WizardContext';

function buildStatuses(state: any, activeSteps: WizardStep[]): Partial<Record<string, StepStatus>> {
  const v = state.validity || {};
  return activeSteps.reduce<Partial<Record<string, StepStatus>>>((acc, key) => {
    acc[key as any] = v[key as any] ? 'complete' : 'pending';
    return acc;
  }, {});
}

export function WizardProgressStepper({ className }: { className?: string }) {
  const { state, setStep, validateStep } = useWizard();

  const flow = React.useMemo(() => getWizardSteps(state) as WizardStep[], [state]);
  const steps = React.useMemo(
    () => flow.map((key) => ({ key, label: WIZARD_STEP_LABELS[key] || key })),
    [flow]
  );
  const statuses = React.useMemo(() => buildStatuses(state, flow), [state, flow]);

  if (state.step === 'intent') return null;

  return (
    <div className={['w-full flex justify-center', className].filter(Boolean).join(' ')}>
      <FormStepper
        steps={steps}
        current={state.step}
        statuses={statuses}
        clickable
        size="md"
        className="w-full max-w-4xl"
        onSelect={(key) => {
          if (key === state.step) return;
          const order = steps.map((s) => s.key);
          const targetIndex = order.indexOf(key as WizardStep);
          const currentIndex = order.indexOf(state.step as WizardStep);
          if (targetIndex === -1 || targetIndex > currentIndex) return;
          validateStep(key as WizardStep);
          setStep(key as WizardStep);
        }}
      />
    </div>
  );
}
