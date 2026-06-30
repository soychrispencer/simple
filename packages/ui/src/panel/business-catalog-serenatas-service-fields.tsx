'use client';

import { PanelField } from './panel-display.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import { PanelSelect } from './panel-select.js';

const EVENT_TYPE_OPTIONS = [
    { value: '', label: 'Uso general' },
    { value: 'Cumpleaños', label: 'Cumpleaños' },
    { value: 'Aniversario', label: 'Aniversario' },
    { value: 'Boda', label: 'Boda' },
    { value: 'Serenata sorpresa', label: 'Serenata sorpresa' },
    { value: 'Día de la madre', label: 'Día de la madre' },
    { value: 'Otro', label: 'Otro' },
] as const;

export type SerenatasCatalogServiceExtraValues = {
    eventType: string;
    musiciansCount: string;
    songsIncluded: string;
};

export type BusinessCatalogSerenatasServiceFieldsProps = {
    values: SerenatasCatalogServiceExtraValues;
    onChange: <K extends keyof SerenatasCatalogServiceExtraValues>(key: K, value: SerenatasCatalogServiceExtraValues[K]) => void;
};

export function BusinessCatalogSerenatasServiceFields({
    values,
    onChange,
}: BusinessCatalogSerenatasServiceFieldsProps) {
    return (
        <>
            <PanelField label="Tipo de evento" hint="Opcional.">
                <PanelSelect value={values.eventType} onChange={(e) => onChange('eventType', e.target.value)}>
                    {EVENT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value || 'general'} value={opt.value}>{opt.label}</option>
                    ))}
                </PanelSelect>
            </PanelField>
            <PanelField label="Músicos" required>
                <input
                    type="number"
                    min={1}
                    max={20}
                    className={PANEL_INPUT_CLASS}
                    value={values.musiciansCount}
                    onChange={(e) => onChange('musiciansCount', e.target.value)}
                />
            </PanelField>
            <PanelField label="Canciones incluidas">
                <input
                    type="number"
                    min={0}
                    max={30}
                    className={PANEL_INPUT_CLASS}
                    value={values.songsIncluded}
                    onChange={(e) => onChange('songsIncluded', e.target.value)}
                />
            </PanelField>
        </>
    );
}
