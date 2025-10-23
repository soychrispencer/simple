import React from "react";

export type Step = { key: string; label: string };
export type StepStatus = 'pending' | 'complete' | 'error' | 'current';

interface FormStepperProps {
  steps: Step[];
  current: string;
  statuses?: Partial<Record<string, StepStatus>>; // por key
  onSelect?: (key: string) => void;
  clickable?: boolean;
}

export default function FormStepper({ steps, current, statuses = {}, onSelect, clickable = false }: FormStepperProps) {
  return (
    <nav className="flex items-center w-full" aria-label="Progreso del formulario">
      {steps.map((s, i) => {
        const rawStatus = statuses[s.key];
        const active = s.key === current;
        const status: StepStatus = active ? 'current' : (rawStatus || 'pending');
        const isComplete = status === 'complete';
        const isError = status === 'error';
        const canClick = clickable && (isComplete || active); // permitir ir atrás o al actual
        return (
          <div
            key={s.key}
            className="flex items-center flex-1 min-w-0 group"
            aria-current={active ? 'step' : undefined}
          >
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onSelect?.(s.key)}
              className={[
                'step-node relative flex items-center justify-center rounded-full text-[11px] font-medium w-8 h-8 transition shrink-0',
                active && 'bg-primary text-white shadow-sm',
                !active && !isComplete && !isError && 'bg-gray-300 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300',
                isComplete && 'bg-primary text-white',
                isError && 'bg-red-500 text-white',
                canClick && 'cursor-pointer hover:scale-[1.05] focus:outline-none focus:ring-2 focus:ring-primary/50',
                !canClick && 'cursor-default opacity-70'
              ].filter(Boolean).join(' ')}
            >
              {isComplete ? '✓' : (isError ? '!' : i + 1)}
              <span className="sr-only">{s.label}</span>
            </button>
            <div className="flex flex-col flex-1 min-w-0">
              <span
                className={[
                  'ml-2 text-xs font-medium truncate transition select-none',
                  active && 'text-black dark:text-white',
                  !active && !isComplete && !isError && 'text-gray-500 dark:text-gray-400',
                  isComplete && 'text-primary',
                  isError && 'text-red-500 dark:text-red-400'
                ].join(' ')}
              >{s.label}</span>
              {i < steps.length - 1 && (
                <div className="mt-1 ml-2 h-1 w-full rounded bg-gray-300 dark:bg-neutral-700 overflow-hidden">
                  <div className={[
                    'h-full transition-all',
                    (isComplete || active) ? 'bg-primary w-full' : 'bg-gray-400 dark:bg-neutral-600 w-0'
                  ].join(' ')} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
