'use client';

import type { BusinessServiceModality } from '@simple/utils';
import { PanelField } from './panel-display.js';

export type BusinessCatalogModalityFieldProps = {
    values: BusinessServiceModality;
    onChange: <K extends keyof BusinessServiceModality>(key: K, value: BusinessServiceModality[K]) => void;
    className?: string;
};

/** Toggles Online / Presencial — mismos en todas las verticales. */
export function BusinessCatalogModalityField({
    values,
    onChange,
    className,
}: BusinessCatalogModalityFieldProps) {
    return (
        <PanelField label="Modalidad" className={className}>
            <div className="flex gap-3">
                {([['isOnline', 'Online'], ['isPresential', 'Presencial']] as const).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onChange(key, !values[key])}
                        className="flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors"
                        style={{
                            borderColor: values[key] ? 'var(--accent)' : 'var(--border)',
                            background: values[key] ? 'var(--accent-soft)' : 'transparent',
                            color: values[key] ? 'var(--accent)' : 'var(--fg-secondary)',
                            fontWeight: values[key] ? 600 : 400,
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </PanelField>
    );
}
