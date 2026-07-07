'use client';

import type { ReactNode } from 'react';
import { SimplePublishOfferPriceFields, type SimplePublishOfferPriceFieldsProps } from './simple-publish-offer-price-fields';
import { formatClPriceInput } from './offer-price-utils';

export type SimplePublishPriceBlockProps = {
    variant?: 'single' | 'range';
    mainPrice: string;
    onMainPriceChange: (value: string) => void;
    mainPriceLabel?: string;
    mainPriceRequired?: boolean;
    mainPriceError?: string;
    mainPriceInvalid?: boolean;
    mainPricePlaceholder?: string;
    formatThousands?: boolean;
    mainPriceInputMode?: 'text' | 'number';
    currencySlot?: ReactNode;
    priceTo?: string;
    onPriceToChange?: (value: string) => void;
    priceToLabel?: string;
    priceToPlaceholder?: string;
    showOffer?: boolean;
    offer?: Omit<SimplePublishOfferPriceFieldsProps, 'mainPrice'>;
};

export function SimplePublishPriceBlock(props: SimplePublishPriceBlockProps) {
    const {
        variant = 'single',
        mainPrice,
        onMainPriceChange,
        mainPriceLabel = variant === 'range' ? 'Precio desde' : 'Precio normal',
        mainPriceRequired = false,
        mainPriceError,
        mainPriceInvalid = false,
        mainPricePlaceholder,
        formatThousands = false,
        mainPriceInputMode = 'text',
        currencySlot,
        priceTo = '',
        onPriceToChange,
        priceToLabel = 'Precio hasta',
        priceToPlaceholder,
        showOffer = variant === 'single',
        offer,
    } = props;

    const formatPriceValue = (raw: string) => (formatThousands ? formatClPriceInput(raw) : raw);

    const handleMainChange = (raw: string) => {
        onMainPriceChange(formatPriceValue(raw));
    };

    const handlePriceToChange = (raw: string) => {
        onPriceToChange?.(formatPriceValue(raw));
    };

    return (
        <div className="panel-publish-price-block">
            <div className="panel-publish-price-row">
                <label className="panel-publish-price-label">
                    {mainPriceLabel}
                    {mainPriceRequired ? <span className="text-(--color-error)"> *</span> : null}
                </label>
                <div className={currencySlot ? 'grid grid-cols-[minmax(0,1fr)_140px] gap-3' : undefined}>
                    <input
                        type={mainPriceInputMode}
                        inputMode={mainPriceInputMode === 'number' ? 'numeric' : undefined}
                        min={mainPriceInputMode === 'number' ? 0 : undefined}
                        placeholder={mainPricePlaceholder}
                        value={mainPrice}
                        onChange={(event) => handleMainChange(event.target.value)}
                        className={`form-input${mainPriceError?.trim() || mainPriceInvalid ? ' form-input-error' : ''}`}
                    />
                    {currencySlot}
                </div>
                {mainPriceError?.trim() ? <p className="mt-1.5 text-xs text-(--danger)">{mainPriceError}</p> : null}
            </div>

            {variant === 'range' ? (
                <div className="panel-publish-price-row">
                    <label className="panel-publish-price-label panel-publish-price-label--secondary">
                        {priceToLabel}
                    </label>
                    <input
                        type={mainPriceInputMode}
                        inputMode={mainPriceInputMode === 'number' ? 'numeric' : undefined}
                        min={mainPriceInputMode === 'number' ? 0 : undefined}
                        placeholder={priceToPlaceholder}
                        value={priceTo}
                        onChange={(event) => handlePriceToChange(event.target.value)}
                        className="form-input"
                    />
                </div>
            ) : null}

            {showOffer && offer ? (
                <div className="panel-publish-price-row panel-publish-price-row--offer">
                    <SimplePublishOfferPriceFields mainPrice={mainPrice} {...offer} />
                </div>
            ) : null}
        </div>
    );
}
