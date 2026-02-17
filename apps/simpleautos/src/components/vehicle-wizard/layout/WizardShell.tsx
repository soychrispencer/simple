"use client";

import React from "react";
import { useWizard, type WizardStep } from "../context/WizardContext";
import IntentChooser from "../steps/IntentChooser";
import StepBasic from "../steps/StepBasic";
import StepTypeSelect from "../steps/StepTypeSelect";
import StepSpecsDynamic from "../steps/StepSpecsDynamic";
import StepMedia from "../steps/StepMedia";
import StepCommercial from "../steps/StepCommercial";
import { WizardContainer } from "./WizardContainer";

interface WizardShellProps {
  className?: string;
}

const STEP_COMPONENTS: Record<WizardStep, React.FC> = {
  intent: IntentChooser,
  type: StepTypeSelect,
  basic: StepBasic,
  specs: StepSpecsDynamic,
  media: StepMedia,
  commercial: StepCommercial,
};

export const WizardShell: React.FC<WizardShellProps> = ({ className }) => {
  const { state } = useWizard();
  const StepComponent = STEP_COMPONENTS[state.step];

  return (
    <div className={["w-full flex flex-col", className].filter(Boolean).join(" ")}>
      <WizardContainer stepKey={state.step}>
        {StepComponent ? (
          <StepComponent />
        ) : (
          <div className="text-sm text-lighttext/70 dark:text-darktext/70">
            Paso no implementado aun: {state.step}
          </div>
        )}
      </WizardContainer>
    </div>
  );
};

export default WizardShell;
