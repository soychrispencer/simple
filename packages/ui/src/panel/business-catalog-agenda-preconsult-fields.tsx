'use client';

import { IconArrowDown, IconArrowUp, IconPlus, IconX } from '@tabler/icons-react';
import {
    AGENDA_PRECONSULT_FIELD_TYPE_LABELS,
    AGENDA_PRECONSULT_FIELD_TYPES,
    createAgendaPreconsultField,
    type AgendaPreconsultField,
    type AgendaPreconsultFieldType,
} from '@simple/utils';
import { PanelField } from './panel-display.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import { PanelSelect } from './panel-select.js';

export type BusinessCatalogAgendaPreconsultFieldsProps = {
    fields: AgendaPreconsultField[];
    onChange: (fields: AgendaPreconsultField[]) => void;
    className?: string;
};

export function BusinessCatalogAgendaPreconsultFields({
    fields,
    onChange,
    className = 'md:col-span-2',
}: BusinessCatalogAgendaPreconsultFieldsProps) {
    const updateField = (id: string, patch: Partial<AgendaPreconsultField>) => {
        onChange(fields.map((field) => (field.id === id ? { ...field, ...patch } : field)));
    };

    const moveField = (index: number, direction: -1 | 1) => {
        const next = [...fields];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
    };

    const removeField = (id: string) => {
        onChange(fields.filter((field) => field.id !== id));
    };

    const addField = () => {
        onChange([...fields, createAgendaPreconsultField()]);
    };

    return (
        <PanelField label="Preguntas pre-consulta" className={className}>
            <div className="flex flex-col gap-2">
                <p className="text-xs text-fg-muted">
                    El cliente las responde al reservar. Las verás en la ficha de la cita.
                </p>
                {fields.map((field, index) => (
                    <div key={field.id} className="flex flex-col gap-2 rounded-xl border border-border bg-bg-subtle p-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={field.label}
                                onChange={(event) => updateField(field.id, { label: event.target.value })}
                                placeholder="Ej: ¿Motivo de consulta?"
                                className={`${PANEL_INPUT_CLASS} flex-1`}
                            />
                            <button
                                type="button"
                                aria-label="Subir"
                                onClick={() => moveField(index, -1)}
                                disabled={index === 0}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-30"
                            >
                                <IconArrowUp size={14} />
                            </button>
                            <button
                                type="button"
                                aria-label="Bajar"
                                onClick={() => moveField(index, 1)}
                                disabled={index === fields.length - 1}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-30"
                            >
                                <IconArrowDown size={14} />
                            </button>
                            <button
                                type="button"
                                aria-label="Eliminar"
                                onClick={() => removeField(field.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-red-600"
                            >
                                <IconX size={14} />
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <PanelSelect
                                value={field.type}
                                onChange={(event) => {
                                    const type = event.target.value as AgendaPreconsultFieldType;
                                    updateField(field.id, {
                                        type,
                                        options: type === 'select' ? (field.options ?? []) : undefined,
                                    });
                                }}
                                className="min-w-[150px]"
                            >
                                {AGENDA_PRECONSULT_FIELD_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {AGENDA_PRECONSULT_FIELD_TYPE_LABELS[type]}
                                    </option>
                                ))}
                            </PanelSelect>
                            <label className="flex cursor-pointer items-center gap-2 text-xs text-fg-secondary">
                                <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(event) => updateField(field.id, { required: event.target.checked })}
                                />
                                Obligatoria
                            </label>
                        </div>
                        {field.type === 'select' ? (
                            <input
                                type="text"
                                value={(field.options ?? []).join(', ')}
                                onChange={(event) => updateField(field.id, {
                                    options: event.target.value.split(',').map((part) => part.trim()).filter(Boolean),
                                })}
                                placeholder="Opciones separadas por coma"
                                className={PANEL_INPUT_CLASS}
                            />
                        ) : null}
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addField}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-medium text-fg-secondary hover:bg-bg-subtle"
                >
                    <IconPlus size={13} /> Agregar pregunta
                </button>
            </div>
        </PanelField>
    );
}
