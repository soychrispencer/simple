'use client';

import type { QuickPublishStep } from './types';

interface Props {
    step: QuickPublishStep;
}

const STEPS = [
    { n: 1, label: 'Fotos' },
    { n: 2, label: 'Datos' },
    { n: 3, label: 'Precio' },
];

export default function ProgressBar({ step }: Props) {
    const current = step === 'success' ? 4 : (step as number);

    return (
        <div className="flex items-center gap-2">
            {STEPS.map(({ n, label }, i) => {
                const isActive = n === current;
                const isDone = n < current;

                return (
                    <div key={n} className="flex items-center gap-2">
                        {i > 0 && (
                            <div
                                className="h-px w-6 shrink-0 transition-colors duration-300"
                                style={{ background: isDone ? '#FF3600' : 'var(--border)' }}
                            />
                        )}
                        <div className="flex items-center gap-1.5">
                            <div
                                className="shrink-0 flex items-center justify-center rounded-full transition-all duration-300"
                                style={{
                                    width: isActive ? 28 : 20,
                                    height: 20,
                                    borderRadius: isActive ? 10 : '50%',
                                    background: isActive ? '#FF3600' : isDone ? '#FF3600' : 'var(--bg-muted)',
                                }}
                            >
                                {isDone ? (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    <span
                                        className="text-[10px] font-semibold"
                                        style={{ color: isActive ? 'white' : 'var(--fg-muted)' }}
                                    >
                                        {n}
                                    </span>
                                )}
                            </div>
                            <span
                                className="text-xs font-medium hidden sm:inline"
                                style={{ color: isActive ? '#FF3600' : isDone ? 'var(--fg-secondary)' : 'var(--fg-muted)' }}
                            >
                                {label}
                            </span>
                        </div>
                    </div>
                );
            })}
            <span className="ml-auto text-xs font-medium" style={{ color: 'var(--fg-muted)' }}>
                {step === 'success' ? 'Publicado ✓' : `Paso ${step as number} de 3`}
            </span>
        </div>
    );
}
