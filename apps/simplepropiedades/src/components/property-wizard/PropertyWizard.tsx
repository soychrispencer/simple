"use client";

import React from "react";
import { Button } from "@simple/ui";
import { useWizard, WIZARD_STEPS, type WizardStep } from "./context/WizardContext";
import StepType from "./steps/StepType";
import StepBasic from "./steps/StepBasic";
import StepFeatures from "./steps/StepFeatures";
import StepAmenities from "./steps/StepAmenities";
import StepPricing from "./steps/StepPricing";
import StepLocation from "./steps/StepLocation";
import StepMedia from "./steps/StepMedia";
import StepReview from "./steps/StepReview";
import { WizardContainer } from "./WizardContainer";
import { WizardStepLayout } from "./layout/WizardStepLayout";

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

const STEP_CONTENT: Record<WizardStep, { title: string; description: string }> = {
  type: {
    title: "Define la publicación",
    description: "Selecciona operación y categoría para adaptar el formulario de la propiedad.",
  },
  basic: {
    title: "Información comercial",
    description: "Completa el título y descripción para destacar tu publicación.",
  },
  features: {
    title: "Características técnicas",
    description: "Ingresa superficies, dormitorios, baños y datos estructurales.",
  },
  amenities: {
    title: "Amenities y atributos",
    description: "Activa los atributos que agregan valor a la propiedad.",
  },
  pricing: {
    title: "Precio y modalidad",
    description: "Define moneda, periodo y valor para venta o arriendo.",
  },
  location: {
    title: "Ubicación",
    description: "Selecciona región, comuna y dirección para mejorar la visibilidad.",
  },
  media: {
    title: "Galería y recursos",
    description: "Sube imágenes principales y agrega video o tour virtual.",
  },
  review: {
    title: "Revisión final",
    description: "Valida el resumen y decide si guardar borrador o publicar.",
  },
};

export function PropertyWizard() {
  const { state, validity, nextStep, previousStep } = useWizard();
  const [navError, setNavError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNavError(null);
  }, [state.step]);

  const completedSteps = React.useMemo(
    () => WIZARD_STEPS.filter((step) => validity[step]).length,
    [validity]
  );

  const StepComponent = React.useMemo(() => STEP_COMPONENTS[state.step] ?? MissingStep, [state.step]);
  const currentStepIndex = WIZARD_STEPS.indexOf(state.step);
  const isFirstStep = currentStepIndex <= 0;
  const isReviewStep = state.step === "review";
  const isTypeStep = state.step === "type";
  const stepContent = STEP_CONTENT[state.step];

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
    <div className="w-full">
      <WizardStepLayout
        eyebrow="Publicación"
        title={stepContent.title}
        description={stepContent.description}
        summary={
          isReviewStep
            ? "Último paso: revisa todo y publica cuando esté listo."
            : `${completedSteps} de ${WIZARD_STEPS.length} pasos completados`
        }
        align={isTypeStep ? "center" : "left"}
        footer={
          isReviewStep ? null : (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <Button variant="ghost" onClick={handlePrev} disabled={isFirstStep}>
                Anterior
              </Button>
              <Button variant="primary" onClick={handleNext}>
                Siguiente
              </Button>
            </div>
          )
        }
      >
        {navError ? <p className="text-sm text-[var(--color-danger)] mb-3">{navError}</p> : null}
        <WizardContainer stepKey={state.step}>
          <StepComponent />
        </WizardContainer>
      </WizardStepLayout>
    </div>
  );
}

export default PropertyWizard;
