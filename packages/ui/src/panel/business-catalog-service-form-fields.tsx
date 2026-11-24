'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
    /** Campos que van al principio (p. ej. selector visual de tipo de servicio). */
    topFields?: ReactNode;
    /** Botones rápidos junto al input de duración (p. ej. [30, 45, 50, 60, 90]). */
    durationPresets?: number[];
    /** Campos propios de la vertical (músicos, modalidad, etc.) */
    extraFields?: ReactNode;
    extraFieldsClassName?: string;
    /** Agrupa color, imagen y campos avanzados en un bloque colapsable. */
    collapseOptionalVisuals?: boolean;
    advancedSummary?: string;
    advancedSummaryHint?: string;
    defaultAdvancedOpen?: boolean;
    advancedExtraFields?: ReactNode;
    /** Modalidad online / presencial (marketplace, serenatas) */
    showModality?: boolean;
    isOnline?: boolean;
    isPresential?: boolean;
    onModalityChange?: (key: 'isOnline' | 'isPresential', value: boolean) => void;
    /** Agenda y otras verticales sin precio oferta */
    showPromoPrice?: boolean;
    /** En el primer servicio de Agenda la imagen no debe bloquear el alta ni ocupar el primer lugar. */
    imageOptional?: boolean;
    /** Aclara cuando una vertical permite guardar el servicio sin precio. */
    priceOptional?: boolean;
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
    topFields,
    durationPresets,
    extraFields,
    extraFieldsClassName = 'md:col-span-2 space-y-4',
    collapseOptionalVisuals = false,
    advancedSummary = 'Opciones adicionales',
    advancedSummaryHint,
    defaultAdvancedOpen = false,
    advancedExtraFields,
    showPromoPrice = true,
    imageOptional = false,
    priceOptional = false,
    showModality = false,
    isOnline = true,
    isPresential = false,
    onModalityChange,
}: BusinessCatalogServiceFormFieldsProps) {
    const showPriceFields = !onPricingModeChange || pricingMode === 'fixed';
    const showPromo = showPromoPrice && showPriceFields;
    const [imageDetailsOpen, setImageDetailsOpen] = useState(Boolean(values.imageUrl));
    const [advancedOpen, setAdvancedOpen] = useState(Boolean(values.imageUrl) || defaultAdvancedOpen);

    useEffect(() => {
        if (values.imageUrl) {
            setImageDetailsOpen(true);
            setAdvancedOpen(true);
        }
    }, [values.imageUrl]);

    useEffect(() => {
        if (defaultAdvancedOpen) setAdvancedOpen(true);
    }, [defaultAdvancedOpen]);

    const imageField = (
        <BusinessCatalogImageField
            imageUrl={values.imageUrl}
            onChange={(url) => onChange('imageUrl', url ?? '')}
            onError={onImageError}
        />
    );

    const parsedDuration = Number(values.durationMinutes);

    return (
        <>
            {topFields}

            {!imageOptional && !collapseOptionalVisuals ? imageField : null}

            <PanelField label="Nombre" required className="md:col-span-2">
                <input
                    className={PANEL_INPUT_CLASS}
                    value={values.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder={namePlaceholder}
                />
            </PanelField>

            <PanelField label="Duración (min)" hint="Tiempo estimado del servicio.">
                <div className="space-y-2">
                    {durationPresets && durationPresets.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {durationPresets.map((mins) => {
                                const selected = parsedDuration === mins;
                                return (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => onChange('durationMinutes', String(mins))}
                                        className={[
                                            'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                                            selected
                                                ? 'border-(--signal,var(--accent)) bg-(--accent-soft)/50 text-accent-ink'
                                                : 'border-border bg-bg-subtle text-fg-secondary hover:text-fg',
                                        ].join(' ')}
                                    >
                                        {mins} min
                                    </button>
                                );
                            })}
                        </div>
                    ) : null}
                    <input
                        className={PANEL_INPUT_CLASS}
                        type="number"
                        min={15}
                        step={5}
                        value={values.durationMinutes}
                        onChange={(e) => onChange('durationMinutes', e.target.value)}
                        placeholder="60"
                    />
                </div>
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
                <PanelField label={`Precio (CLP)${priceOptional ? ' (opcional)' : ''}`}>
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

            <PanelField label="Descripción" className="md:col-span-2">
                <textarea
                    className={`${PANEL_INPUT_CLASS} min-h-20`}
                    value={values.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    placeholder={descriptionPlaceholder}
                />
            </PanelField>

            {imageOptional && !collapseOptionalVisuals ? (
                <details
                    open={imageDetailsOpen}
                    onToggle={(event) => setImageDetailsOpen(event.currentTarget.open)}
                    className="md:col-span-2 rounded-xl border px-3 py-2"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <summary className="cursor-pointer text-sm font-medium text-(--fg)">
                        Imagen del servicio (opcional)
                        <span className="ml-2 text-xs font-normal text-fg-muted">Puedes agregarla después.</span>
                    </summary>
                    <div className="mt-3">{imageField}</div>
                </details>
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

            {!collapseOptionalVisuals ? (
                <BusinessCatalogCalendarColorField
                    value={values.color}
                    onChange={(color) => onChange('color', color)}
                />
            ) : null}

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

            {collapseOptionalVisuals ? (
                <details
                    open={advancedOpen}
                    onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
                    className="md:col-span-2 rounded-xl border px-3.5 py-3"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-medium text-(--fg)">
                        <span>{advancedSummary}</span>
                        {advancedSummaryHint ? (
                            <span className="text-xs font-normal text-fg-muted">{advancedSummaryHint}</span>
                        ) : null}
                    </summary>
                    <div className="mt-4 space-y-4 border-t border-(--border) pt-4">
                        <BusinessCatalogCalendarColorField
                            value={values.color}
                            onChange={(color) => onChange('color', color)}
                        />
                        <div>{imageField}</div>
                        {advancedExtraFields}
                    </div>
                </details>
            ) : null}
        </>
    );
}
