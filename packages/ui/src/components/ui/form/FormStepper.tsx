import React from "react";

export type Step = { key: string; label: string };
export type StepStatus = 'pending' | 'complete' | 'error' | 'current';

interface FormStepperProps {
  steps: Step[];
  current: string;
  statuses?: Partial<Record<string, StepStatus>>; // por key
  onSelect?: (key: string) => void;
  clickable?: boolean;
  className?: string;
  size?: 'md' | 'sm';
}

export default function FormStepper({ steps, current, statuses = {}, onSelect, clickable = false, className, size = 'md' }: FormStepperProps) {
  const nodeClass = size === 'sm'
    ? 'step-node relative flex items-center justify-center rounded-full text-[10px] font-medium w-7 h-7 transition shrink-0'
    : 'step-node relative flex items-center justify-center rounded-full text-[11px] font-medium w-8 h-8 transition shrink-0';
  const labelClass = size === 'sm'
    ? 'ml-2 text-[11px] font-medium truncate transition select-none'
    : 'ml-2 text-xs font-medium truncate transition select-none';
  const connectorMarginTop = size === 'sm' ? 'mt-1' : 'mt-1';
  const connectorHeight = size === 'sm' ? 'h-1' : 'h-1';

  return (
    <nav className={["flex items-center w-full", className].filter(Boolean).join(' ')} aria-label="Progreso del formulario">
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
                nodeClass,
                active && 'bg-primary text-[var(--color-on-primary)] shadow-sm',
                !active && !isComplete && !isError && 'bg-[var(--field-bg)] border border-[var(--field-border)] text-[var(--text-secondary)]',
                isComplete && 'bg-primary text-[var(--color-on-primary)]',
                isError && 'bg-[var(--color-danger)] text-[var(--color-on-primary)]',
                canClick && 'cursor-pointer hover:scale-[1.05] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary-a50)]',
                !canClick && 'cursor-default opacity-70'
              ].filter(Boolean).join(' ')}
            >
              {isComplete ? '✓' : (isError ? '!' : i + 1)}
              <span className="sr-only">{s.label}</span>
            </button>
            <div className="flex flex-col flex-1 min-w-0">
              <span
                className={[
                  labelClass,
                  active && 'text-[var(--text-primary)]',
                  !active && !isComplete && !isError && 'text-[var(--text-secondary)]',
                  isComplete && 'text-primary',
                  isError && 'text-[var(--color-danger)]'
                ].join(' ')}
              >{s.label}</span>
              {i < steps.length - 1 && (
                <div className={[connectorMarginTop, 'ml-2', connectorHeight, 'w-full rounded bg-[var(--field-bg)] overflow-hidden'].join(' ')}>
                  <div className={[
                    'h-full transition-all',
                    (isComplete || active) ? 'bg-primary w-full' : 'bg-[var(--field-border)] w-0'
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