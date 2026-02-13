import React from 'react';

interface Step {
  key: string;
  label: string;
}

interface FormStepperProps {
  steps: Step[];
  current: string;
  statuses?: Record<string, 'pending' | 'complete' | 'error' | 'current'>;
  clickable?: boolean;
  onSelect?: (key: string) => void;
}

export const FormStepper: React.FC<FormStepperProps> = ({
  steps,
  current,
  statuses = {},
  clickable = false,
  onSelect
}) => {
  const currentIndex = steps.findIndex((step) => step.key === current);

  const handleStepClick = (stepKey: string) => {
    if (clickable && onSelect) {
      onSelect(stepKey);
    }
  };

  return (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => {
          const isCompleted = statuses[step.key] === 'complete';
          const isCurrent = step.key === current || statuses[step.key] === 'current';
          const isError = statuses[step.key] === 'error';
          const isClickable = clickable && onSelect;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium cursor-${
                    isClickable ? 'pointer' : 'default'
                  } ${
                    isError
                      ? 'bg-[var(--color-danger)] text-[var(--color-on-primary)]'
                      : isCompleted
                      ? 'bg-primary text-[var(--color-on-primary)]'
                      : isCurrent
                      ? 'bg-primary text-[var(--color-on-primary)]'
                      : 'bg-[var(--field-bg)] border border-[var(--field-border)] text-lighttext/70 dark:text-darktext/70'
                  }`}
                  onClick={() => handleStepClick(step.key)}
                >
                  {isError ? '!' : isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={`mt-2 text-xs ${
                    isCurrent ? 'text-primary font-medium' : 'text-lighttext/70 dark:text-darktext/70'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-0.5 ${
                    isCompleted ? 'bg-primary' : 'bg-[var(--field-bg)]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default FormStepper;
