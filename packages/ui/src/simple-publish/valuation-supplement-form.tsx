'use client';

import { ModernSelect } from '../forms';
import { SimplePublishField } from './simple-publish-field';

export type ValuationSupplementField = {
    id: string;
    label: string;
    required: boolean;
    kind: 'number' | 'text' | 'select';
    placeholder?: string;
    hint?: string;
    options?: Array<{ value: string; label: string }>;
};

export type ValuationSupplementFormProps = {
    fields: ValuationSupplementField[];
    values: Record<string, string>;
    onChange: (id: string, value: string) => void;
};

const inputClassName = 'w-full rounded-xl border border-(--border) bg-(--surface) px-3 py-2.5 text-sm text-(--fg) outline-none transition focus:border-(--color-primary)';

export function ValuationSupplementForm({ fields, values, onChange }: ValuationSupplementFormProps) {
    if (fields.length === 0) return null;

    return (
        <div className="space-y-4">
            {fields.map((field) => (
                <SimplePublishField
                    key={field.id}
                    label={field.label}
                    required={field.required}
                    hint={field.hint}
                >
                    {field.kind === 'select' ? (
                        <ModernSelect
                            value={values[field.id] ?? ''}
                            onChange={(value) => onChange(field.id, value)}
                            options={field.options ?? []}
                            placeholder={field.placeholder ?? 'Seleccionar'}
                            ariaLabel={field.label}
                        />
                    ) : (
                        <input
                            type={field.kind === 'number' ? 'number' : 'text'}
                            inputMode={field.kind === 'number' ? 'decimal' : 'text'}
                            value={values[field.id] ?? ''}
                            onChange={(event) => onChange(field.id, event.target.value)}
                            placeholder={field.placeholder}
                            className={inputClassName}
                        />
                    )}
                </SimplePublishField>
            ))}
        </div>
    );
}
