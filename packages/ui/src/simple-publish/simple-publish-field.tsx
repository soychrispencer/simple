'use client';

import type { ReactNode } from 'react';

export type SimplePublishFieldProps = {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: ReactNode;
};

export function SimplePublishRequiredMark() {
    return (
        <abbr title="requerido" className="text-(--color-error) no-underline">
            {' '}
            *
        </abbr>
    );
}

export function SimplePublishField({ label, required, error, hint, children }: SimplePublishFieldProps) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-(--fg)">
                {label}
                {required ? <SimplePublishRequiredMark /> : null}
            </label>
            {children}
            {hint ? <p className="mt-1 text-xs text-(--fg-muted)">{hint}</p> : null}
            {error?.trim() ? <p className="mt-2 text-xs text-(--color-error)">{error}</p> : null}
        </div>
    );
}
