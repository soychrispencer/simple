'use client';

import type { ReactNode } from 'react';

export type ErrorViewProps = {
    code?: string;
    title: string;
    description?: string;
    primaryAction: ReactNode;
    secondaryAction?: ReactNode;
    errorDigest?: string;
};

export function ErrorView({
    code,
    title,
    description,
    primaryAction,
    secondaryAction,
    errorDigest,
}: ErrorViewProps) {
    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-4 py-10 text-center"
            style={{ background: 'var(--bg)' }}
        >
            {code ? (
                <p className="text-5xl sm:text-6xl font-bold mb-3" style={{ color: 'var(--accent)' }}>
                    {code}
                </p>
            ) : null}
            <h1 className="text-xl sm:text-2xl font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                {title}
            </h1>
            {description ? (
                <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--fg-muted)' }}>
                    {description}
                </p>
            ) : <div className="mb-8" />}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                {primaryAction}
                {secondaryAction}
            </div>
            {errorDigest ? (
                <p className="mt-6 text-[10px] font-mono" style={{ color: 'var(--fg-muted)' }}>
                    ref: {errorDigest}
                </p>
            ) : null}
        </div>
    );
}
