"use client";
import React from 'react';
import { useWizard } from '../context/WizardContext';
import IntentChooser from '../steps/IntentChooser';
import StepBasic from '../steps/StepBasic';
import StepTypeSelect from '../steps/StepTypeSelect';
import StepSpecsDynamic from '../steps/StepSpecsDynamic';
import StepMedia from '../steps/StepMedia';
import StepCommercial from '../steps/StepCommercial';
import StepCommercialEnhanced from '../steps/StepCommercialEnhanced';
import StepReview from '../steps/StepReview';
import ProgressBar from '@/components/ui/ProgressBar';

interface WizardShellProps {
  className?: string;
}

// Mapeo simple de step -> componente (iremos llenando)
const StepRenderer: React.FC = () => {
  const { state } = useWizard();
  switch (state.step) {
    case 'intent':
      return <IntentChooser />;
    case 'type':
      return <StepTypeSelect />;
    case 'basic':
      return <StepBasic />;
    case 'specs':
      return <StepSpecsDynamic />;
    case 'media':
      return <StepMedia />;
    case 'commercial':
      return <StepCommercial />;
    case 'commercial_enhanced':
      return <StepCommercialEnhanced />;
    case 'review':
      return <StepReview />;
    // TODO: agregar casos siguientes
    default:
      return <div className="text-sm text-gray-500">Paso no implementado aún: {state.step}</div>;
  }
};

const steps = ['intent', 'type', 'basic', 'specs', 'media', 'commercial', 'commercial_enhanced', 'review'];
const stepLabels = ['Intención', 'Tipo', 'Básico', 'Especificaciones', 'Media', 'Comercial', 'Comercial Avanzado', 'Revisión'];

export const WizardShell: React.FC<WizardShellProps> = ({ className }) => {
  const { state } = useWizard();
  const currentStepIndex = steps.indexOf(state.step) + 1;

  return (
    <div className={"w-full flex flex-col gap-4 " + (className || '')}>
      <ProgressBar
        current={currentStepIndex}
        total={steps.length}
        labels={stepLabels}
      />
      <div className="p-4 rounded-xl bg-lightcard dark:bg-darkcard shadow-card ring-1 ring-black/5 dark:ring-white/5 w-full">
        <StepRenderer />
      </div>
    </div>
  );
};

export default WizardShell;
