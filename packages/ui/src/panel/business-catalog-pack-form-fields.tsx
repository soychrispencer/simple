'use client';

import { BusinessCatalogAppliesToField } from './business-catalog-applies-to-field.js';
import { BusinessCatalogImageField } from './business-catalog-image-field.js';
import { PanelField } from './panel-display.js';
import { PanelSwitch } from './panel-primitives.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';
import type { CatalogPackFormValues, CatalogServiceOption } from './business-catalog-form-types.js';

export type BusinessCatalogPackFormFieldsProps = {
    values: CatalogPackFormValues;
    onChange: <K extends keyof CatalogPackFormValues>(key: K, value: CatalogPackFormValues[K]) => void;
    services?: CatalogServiceOption[];
    sessionsLabel?: string;
    showImage?: boolean;
    showPromoPrice?: boolean;
    onImageError?: (message: string) => void;
    namePlaceholder?: string;
};

export function BusinessCatalogPackFormFields({
    values,
    onChange,
    services = [],
    sessionsLabel = 'Sesiones incluidas',
    showImage = true,
    showPromoPrice = true,
    onImageError,
    namePlaceholder = 'Pack 3 sesiones',
}: BusinessCatalogPackFormFieldsProps) {
    return (
        <>
            {showImage ? (
                <BusinessCatalogImageField
                    imageUrl={values.imageUrl}
                    onChange={(url) => onChange('imageUrl', url ?? '')}
                    onError={onImageError}
                />
            ) : null}
            <PanelField label="Nombre" required className="md:col-span-2">
                <input
                    type="text"
                    value={values.name}
                    onChange={(event) => onChange('name', event.target.value)}
                    placeholder={namePlaceholder}
                    className={PANEL_INPUT_CLASS}
                />
            </PanelField>
            <PanelField label="Descripción" className="md:col-span-2">
                <textarea
                    value={values.description}
                    onChange={(event) => onChange('description', event.target.value)}
                    rows={3}
                    className={`${PANEL_INPUT_CLASS} min-h-20`}
                />
            </PanelField>
            <PanelField label={sessionsLabel} required>
                <input
                    type="number"
                    min={1}
                    value={values.sessionsCount}
                    onChange={(event) => onChange('sessionsCount', event.target.value)}
                    className={PANEL_INPUT_CLASS}
                />
            </PanelField>
            <PanelField label="Validez (días)" hint="Opcional.">
                <input
                    type="number"
                    min={1}
                    value={values.validityDays}
                    onChange={(event) => onChange('validityDays', event.target.value)}
                    placeholder="90"
                    className={PANEL_INPUT_CLASS}
                />
            </PanelField>
            <PanelField label="Precio (CLP)" required>
                <input
                    type="number"
                    min={0}
                    step={showPromoPrice ? 1000 : 1}
                    value={values.price}
                    onChange={(event) => onChange('price', event.target.value)}
                    className={PANEL_INPUT_CLASS}
                />
            </PanelField>
            {showPromoPrice ? (
                <PanelField label="Precio oferta (CLP)" hint="Opcional.">
                    <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={values.promoPrice}
                        onChange={(event) => onChange('promoPrice', event.target.value)}
                        className={PANEL_INPUT_CLASS}
                    />
                </PanelField>
            ) : null}
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
                    ariaLabel="Pack activo"
                    size="sm"
                />
            </PanelField>
        </>
    );
}
