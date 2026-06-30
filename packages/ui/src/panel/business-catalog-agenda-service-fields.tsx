'use client';

import type { AgendaPreconsultField } from '@simple/utils';
import { AGENDA_SERVICE_KIND_LABELS, type AgendaServiceKind } from '@simple/utils';
import { PanelField } from './panel-display.js';
import { PanelSelect } from './panel-select.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import { BusinessCatalogModalityField } from './business-catalog-modality-field.js';
import { BusinessCatalogAgendaPreconsultFields } from './business-catalog-agenda-preconsult-fields.js';

export type AgendaCatalogServiceExtraValues = {
    kind: AgendaServiceKind;
    startsAt: string;
    capacity: string;
    location: string;
    meetingUrl: string;
    isOnline: boolean;
    isPresential: boolean;
};

export type BusinessCatalogAgendaServiceFieldsProps = {
    values: AgendaCatalogServiceExtraValues;
    onChange: <K extends keyof AgendaCatalogServiceExtraValues>(key: K, value: AgendaCatalogServiceExtraValues[K]) => void;
    preconsultFields?: AgendaPreconsultField[];
    onPreconsultFieldsChange?: (fields: AgendaPreconsultField[]) => void;
};

export function BusinessCatalogAgendaServiceFields({
    values,
    onChange,
    preconsultFields,
    onPreconsultFieldsChange,
}: BusinessCatalogAgendaServiceFieldsProps) {
    const isGroup = values.kind === 'group_event';

    return (
        <>
            <PanelField label="Tipo de servicio" className="md:col-span-2">
                <PanelSelect
                    value={values.kind}
                    onChange={(e) => onChange('kind', e.target.value as AgendaServiceKind)}
                >
                    {(Object.entries(AGENDA_SERVICE_KIND_LABELS) as Array<[AgendaServiceKind, string]>).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                    ))}
                </PanelSelect>
            </PanelField>

            {isGroup ? (
                <>
                    <PanelField label="Fecha y hora" required className="md:col-span-2">
                        <input
                            type="datetime-local"
                            className={PANEL_INPUT_CLASS}
                            value={values.startsAt}
                            onChange={(e) => onChange('startsAt', e.target.value)}
                        />
                    </PanelField>
                    <PanelField label="Cupo máximo" required>
                        <input
                            type="number"
                            min={1}
                            className={PANEL_INPUT_CLASS}
                            value={values.capacity}
                            onChange={(e) => onChange('capacity', e.target.value)}
                        />
                    </PanelField>
                </>
            ) : null}

            <BusinessCatalogModalityField
                values={values}
                onChange={onChange}
                className={isGroup ? undefined : 'md:col-span-2'}
            />

            {isGroup && values.isPresential ? (
                <PanelField label="Dirección" required className="md:col-span-2">
                    <input
                        type="text"
                        className={PANEL_INPUT_CLASS}
                        value={values.location}
                        onChange={(e) => onChange('location', e.target.value)}
                        placeholder="Av. Providencia 123, Of. 301"
                    />
                </PanelField>
            ) : null}

            {isGroup && values.isOnline ? (
                <PanelField label="Link de reunión" hint="Opcional." className="md:col-span-2">
                    <input
                        type="url"
                        className={PANEL_INPUT_CLASS}
                        value={values.meetingUrl}
                        onChange={(e) => onChange('meetingUrl', e.target.value)}
                        placeholder="https://meet.google.com/..."
                    />
                </PanelField>
            ) : null}

            {!isGroup && preconsultFields && onPreconsultFieldsChange ? (
                <BusinessCatalogAgendaPreconsultFields
                    fields={preconsultFields}
                    onChange={onPreconsultFieldsChange}
                />
            ) : null}
        </>
    );
}
