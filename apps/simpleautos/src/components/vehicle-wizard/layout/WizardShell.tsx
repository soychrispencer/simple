"use client";
import React from 'react';
import { useWizard } from '../context/WizardContext';
import IntentChooser from '../steps/IntentChooser';
import StepBasic from '../steps/StepBasic';
import StepTypeSelect from '../steps/StepTypeSelect';
import StepSpecsDynamic from '../steps/StepSpecsDynamic';
import StepMedia from '../steps/StepMedia';
import StepCommercial from '../steps/StepCommercial';

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
    // TODO: agregar casos siguientes
    default:
      return <div className="text-sm text-lighttext/70 dark:text-darktext/70">Paso no implementado aún: {state.step}</div>;
  }
};

export const WizardShell: React.FC<WizardShellProps> = ({ className }) => {
  // Quitamos la barra de progreso "Paso X de Y" porque ya existe un stepper en el header.

  return (
    <div className={"w-full flex flex-col " + (className || '')}>
      <StepRenderer />
    </div>
  );
};

export default WizardShell;







