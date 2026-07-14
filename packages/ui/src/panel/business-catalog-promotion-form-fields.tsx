'use client';

import { BusinessCatalogAppliesToField } from './business-catalog-applies-to-field.js';
import { PanelField } from './panel-display.js';
import { PanelSelect } from './panel-select.js';
import { PanelSwitch } from './panel-primitives.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import type { CatalogPromotionFormValues, CatalogServiceOption } from './business-catalog-form-types.js';

export type BusinessCatalogPromotionFormFeatures = {
    couponCode?: boolean;
    minAmount?: boolean;
    maxUses?: boolean;
    dateInput?: 'date' | 'datetime-local';
};

export type BusinessCatalogPromotionFormFieldsProps = {
    values: CatalogPromotionFormValues;
    onChange: <K extends keyof CatalogPromotionFormValues>(key: K, value: CatalogPromotionFormValues[K]) => void;
    services?: CatalogServiceOption[];
    features?: BusinessCatalogPromotionFormFeatures;
    labelPlaceholder?: string;
};

const DEFAULT_FEATURES: BusinessCatalogPromotionFormFeatures = {
    couponCode: false,
    minAmount: false,
    maxUses: false,
    dateInput: 'date',
};

export function BusinessCatalogPromotionFormFields({
    values,
    onChange,
    services = [],
    features = DEFAULT_FEATURES,
    labelPlaceholder = 'Descuento de verano',
}: BusinessCatalogPromotionFormFieldsProps) {
    const resolved = { ...DEFAULT_FEATURES, ...features };
    const dateInputType = resolved.dateInput ?? 'date';

    return (
        <>
            <PanelField label="Nombre promoción" required className="md:col-span-2">
                <input
                    type="text"
                    value={values.label}
                    onChange={(event) => onChange('label', event.target.value)}
                    placeholder={labelPlaceholder}
                    className={PANEL_INPUT_CLASS}
                />
            </PanelField>
            {resolved.couponCode ? (
                <PanelField label="Código cupón" hint="Opcional. El cliente lo ingresa al reservar.">
                    <input
                        type="text"
                        value={values.code}
                        onChange={(event) => onChange('code', event.target.value.toUpperCase())}
                        placeholder="VERANO10"
                        className={PANEL_INPUT_CLASS}
                    />
                </PanelField>
            ) : null}
            <PanelField label="Tipo de descuento">
                <PanelSelect
                    value={values.discountType}
                    onChange={(event) => onChange('discountType', event.target.value as 'percent' | 'fixed')}
                >
                    <option value="percent">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo (CLP)</option>
                </PanelSelect>
            </PanelField>
            <PanelField
                label={values.discountType === 'percent' ? 'Descuento (%)' : 'Descuento (CLP)'}
                required
            >
                <input
                    type="number"
                    min={1}
                    max={values.discountType === 'percent' ? 100 : undefined}
                    value={values.discountValue}
                    onChange={(event) => onChange('discountValue', event.target.value)}
                    className={PANEL_INPUT_CLASS}
                />
            </PanelField>
            <PanelField label="Inicio" hint="Opcional.">
                <input
                    type={dateInputType}
                    value={values.startsAt}
                    onChange={(event) => onChange('startsAt', event.target.value)}
                    className={PANEL_INPUT_CLASS}
                />
            </PanelField>
            <PanelField label="Término" hint="Opcional.">
                <input
                    type={dateInputType}
                    value={values.endsAt}
                    onChange={(event) => onChange('endsAt', event.target.value)}
                    className={PANEL_INPUT_CLASS}
                />
            </PanelField>
            {resolved.minAmount ? (
                <PanelField label="Monto mínimo (CLP)" hint="Opcional.">
                    <input
                        type="number"
                        min={0}
                        value={values.minAmount}
                        onChange={(event) => onChange('minAmount', event.target.value)}
                        className={PANEL_INPUT_CLASS}
                    />
                </PanelField>
            ) : null}
            {resolved.maxUses ? (
                <PanelField label="Usos máximos" hint="Opcional.">
                    <input
                        type="number"
                        min={1}
                        value={values.maxUses}
                        onChange={(event) => onChange('maxUses', event.target.value)}
                        className={PANEL_INPUT_CLASS}
                    />
                </PanelField>
            ) : null}
            <PanelField label="Descripción" className="md:col-span-2">
                <textarea
                    value={values.description}
                    onChange={(event) => onChange('description', event.target.value)}
                    rows={3}
                    className={`${PANEL_INPUT_CLASS} min-h-20`}
                />
            </PanelField>
            <BusinessCatalogAppliesToField
                appliesTo={values.appliesTo}
                serviceIds={values.serviceIds}
                services={services}
                onAppliesToChange={(appliesTo) => onChange('appliesTo', appliesTo)}
                onServiceIdsChange={(serviceIds) => onChange('serviceIds', serviceIds)}
            />
            <PanelField label="Visible en perfil" className="md:col-span-2">
                <PanelSwitch
                    checked={values.isActive}
                    onChange={(checked) => onChange('isActive', checked)}
                    ariaLabel="Promoción activa"
                    size="sm"
                />
            </PanelField>
        </>
    );
}
