'use client';

import { joinClasses } from '../shared/join-classes';
import type { SimplePublishStep } from './types';

export type SimplePublishProgressProps = {
    steps: SimplePublishStep[];
    stepIndex: number;
    onStepChange?: (key: string) => void;
};

export function SimplePublishProgress({ steps, stepIndex, onStepChange }: SimplePublishProgressProps) {
    const progress = steps.length > 0 ? ((stepIndex + 1) / steps.length) * 100 : 0;

    return (
        <div className="border-b border-(--border)/80 bg-(--surface)/60">
            <div className="mx-auto max-w-3xl px-4 lg:max-w-5xl lg:px-8">
                <div className="flex items-center gap-3 py-3">
                    {steps.map((step, index) => {
                        const done = index < stepIndex;
                        const active = index === stepIndex;
                        const clickable = Boolean(onStepChange) && index <= stepIndex;

                        return (
                            <button
                                key={step.key}
                                type="button"
                                disabled={!clickable}
                                onClick={() => clickable && onStepChange?.(step.key)}
                                className={joinClasses(
                                    'flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1 py-1 text-left transition-colors',
                                    clickable ? 'cursor-pointer' : 'cursor-default',
                                )}
                            >
                                <span
                                    className={joinClasses(
                                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                                        active
                                            ? 'bg-(--accent) text-(--accent-contrast)'
                                            : done
                                                ? 'bg-(--fg) text-(--bg)'
                                                : 'bg-(--bg-subtle) text-(--fg-muted)',
                                    )}
                                >
                                    {done && !active ? '✓' : index + 1}
                                </span>
                                <span className="min-w-0 hidden sm:block">
                                    <span
                                        className={joinClasses(
                                            'block truncate text-xs font-semibold',
                                            active ? 'text-(--fg)' : 'text-(--fg-muted)',
                                        )}
                                    >
                                        {step.label}
                                    </span>
                                    {step.helper && active ? (
                                        <span className="block truncate text-[11px] text-(--fg-muted)">
                                            {step.helper}
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="h-0.5 overflow-hidden rounded-full bg-(--bg-subtle)">
                    <div
                        className="h-full rounded-full bg-(--accent) transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
