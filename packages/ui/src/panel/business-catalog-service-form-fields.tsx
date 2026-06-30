'use client';

import type { ReactNode } from 'react';
import type { OperatorServicePricingMode } from '@simple/utils';
import { BusinessCatalogCalendarColorField } from './business-catalog-calendar-color-field.js';
import { BusinessCatalogImageField } from './business-catalog-image-field.js';
import { BusinessCatalogModalityField } from './business-catalog-modality-field.js';
import { PanelField } from './panel-display.js';
import { PanelSelect } from './panel-select.js';
import { PANEL_INPUT_CLASS } from './panel-form-classes.js';

export type BusinessCatalogServiceFormValues = {
    imageUrl: string;
    name: string;
    description: string;
    durationMinutes: string;
    price: string;
    promoPrice: string;
    color: string;
};

export type BusinessCatalogServiceFormFieldsProps = {
    values: BusinessCatalogServiceFormValues;
    onChange: <K extends keyof BusinessCatalogServiceFormValues>(key: K, value: BusinessCatalogServiceFormValues[K]) => void;
    onImageError?: (message: string) => void;
    namePlaceholder?: string;
    descriptionPlaceholder?: string;
    /** Marketplace: categoría y modo de precio */
    category?: string;
    categories?: Array<{ id: string; label: string }>;
    onCategoryChange?: (category: string) => void;
    pricingMode?: OperatorServicePricingMode;
    onPricingModeChange?: (mode: OperatorServicePricingMode) => void;
    /** Campos propios de la vertical (músicos, pre-consulta, etc.) */
    extraFields?: ReactNode;
    extraFieldsClassName?: string;
    /** Modalidad online / presencial (marketplace, serenatas) */
    showModality?: boolean;
    isOnline?: boolean;
    isPresential?: boolean;
    onModalityChange?: (key: 'isOnline' | 'isPresential', value: boolean) => void;
    /** Agenda y otras verticales sin precio oferta */
    showPromoPrice?: boolean;
};

/**
 * Campos base del catálogo de servicios — mismo orden y diseño en todas las verticales:
 * imagen → nombre → descripción → duración/precio → promo → categoría (opc.) → color calendario → extras.
 */
export function BusinessCatalogServiceFormFields({
    values,
    onChange,
    onImageError,
    namePlaceholder = 'Ej: Consulta individual',
    descriptionPlaceholder = 'Breve descripción del servicio (opcional)',
    category,
    categories,
    onCategoryChange,
    pricingMode = 'fixed',
    onPricingModeChange,
    extraFields,
    extraFieldsClassName = 'md:col-span-2 space-y-4',
    showPromoPrice = true,
    showModality = false,
    isOnline = true,
    isPresential = false,
    onModalityChange,
}: BusinessCatalogServiceFormFieldsProps) {
    const showPriceFields = !onPricingModeChange || pricingMode === 'fixed';
    const showPromo = showPromoPrice && showPriceFields;

    return (
        <>
            <BusinessCatalogImageField
                imageUrl={values.imageUrl}
                onChange={(url) => onChange('imageUrl', url ?? '')}
                onError={onImageError}
            />

            <PanelField label="Nombre" required className="md:col-span-2">
                <input
                    className={PANEL_INPUT_CLASS}
                    value={values.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder={namePlaceholder}
                />
            </PanelField>

            <PanelField label="Descripción" className="md:col-span-2">
                <textarea
                    className={`${PANEL_INPUT_CLASS} min-h-24`}
                    value={values.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    placeholder={descriptionPlaceholder}
                />
            </PanelField>

            <PanelField label="Duración (min)" hint="Tiempo estimado del servicio.">
                <input
                    className={PANEL_INPUT_CLASS}
                    type="number"
                    min={15}
                    step={5}
                    value={values.durationMinutes}
                    onChange={(e) => onChange('durationMinutes', e.target.value)}
                    placeholder="60"
                />
            </PanelField>

            {onPricingModeChange ? (
                <PanelField label="Precio">
                    <PanelSelect
                        value={pricingMode}
                        onChange={(e) => onPricingModeChange(e.target.value as OperatorServicePricingMode)}
                    >
                        <option value="fixed">Precio fijo</option>
                        <option value="quote">Cotizar</option>
                    </PanelSelect>
                </PanelField>
            ) : (
                <PanelField label="Precio (CLP)">
                    <input
                        className={PANEL_INPUT_CLASS}
                        type="number"
                        min={0}
                        step={1000}
                        value={values.price}
                        onChange={(e) => onChange('price', e.target.value)}
                        placeholder="50000"
                    />
                </PanelField>
            )}

            {showPriceFields && onPricingModeChange ? (
                <>
                    <PanelField label="Precio (CLP)">
                        <input
                            className={PANEL_INPUT_CLASS}
                            type="number"
                            min={0}
                            step={1000}
                            value={values.price}
                            onChange={(e) => onChange('price', e.target.value)}
                            placeholder="15000"
                        />
                    </PanelField>
                    <PanelField label="Precio oferta (CLP)" hint="Opcional. Debe ser menor al precio normal.">
                        <input
                            className={PANEL_INPUT_CLASS}
                            type="number"
                            min={0}
                            step={1000}
                            value={values.promoPrice}
                            onChange={(e) => onChange('promoPrice', e.target.value)}
                            placeholder="Opcional"
                        />
                    </PanelField>
                </>
            ) : showPromo && !onPricingModeChange ? (
                <PanelField label="Precio oferta (CLP)" hint="Opcional. Debe ser menor al precio normal.">
                    <input
                        className={PANEL_INPUT_CLASS}
                        type="number"
                        min={0}
                        step={1000}
                        value={values.promoPrice}
                        onChange={(e) => onChange('promoPrice', e.target.value)}
                        placeholder="Opcional"
                    />
                </PanelField>
            ) : null}

            {categories && onCategoryChange ? (
                <PanelField label="Categoría" className={showPriceFields && onPricingModeChange ? undefined : 'md:col-span-2'}>
                    <PanelSelect value={category ?? 'other'} onChange={(e) => onCategoryChange(e.target.value)}>
                        {categories.map((item) => (
                            <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                    </PanelSelect>
                </PanelField>
            ) : null}

            <BusinessCatalogCalendarColorField
                value={values.color}
                onChange={(color) => onChange('color', color)}
            />

            {showModality && onModalityChange ? (
                <BusinessCatalogModalityField
                    values={{ isOnline, isPresential }}
                    onChange={onModalityChange}
                    className="md:col-span-2"
                />
            ) : null}

            {extraFields ? (
                <div className={extraFieldsClassName}>{extraFields}</div>
            ) : null}
        </>
    );
}
