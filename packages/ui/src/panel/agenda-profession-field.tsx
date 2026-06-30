'use client';

import { AGENDA_PROFESSION_GROUPS } from '@simple/utils';
import { PanelField } from './panel-display.js';

export type AgendaProfessionFieldProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
};

export function AgendaProfessionField({ value, onChange, disabled = false }: AgendaProfessionFieldProps) {
    const listId = 'agenda-profession-suggestions';

    return (
        <PanelField
            label="¿Qué es?"
            hint="Profesión o rubro. Elige una sugerencia o escribe la tuya."
        >
            <input
                type="text"
                list={listId}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="Ej: Psicóloga clínica"
                className="form-input"
                disabled={disabled}
            />
            <datalist id={listId}>
                {AGENDA_PROFESSION_GROUPS.flatMap((group) =>
                    group.options.map((option) => (
                        <option key={`${group.id}-${option.id}`} value={option.label} label={group.label} />
                    )),
                )}
            </datalist>
            <div className="mt-3 flex flex-wrap gap-2">
                {AGENDA_PROFESSION_GROUPS.flatMap((group) =>
                    group.options.slice(0, 2).map((option) => (
                        <button
                            key={`chip-${group.id}-${option.id}`}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(option.label)}
                            className="rounded-full border px-3 py-1 text-xs transition-colors hover:border-[var(--accent)] disabled:opacity-50"
                            style={{
                                borderColor: value === option.label ? 'var(--accent)' : 'var(--border)',
                                color: value === option.label ? 'var(--accent)' : 'var(--fg-muted)',
                                background: value === option.label
                                    ? 'color-mix(in oklab, var(--accent) 10%, transparent)'
                                    : 'transparent',
                            }}
                        >
                            {option.label}
                        </button>
                    )),
                )}
            </div>
        </PanelField>
    );
}
