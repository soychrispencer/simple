'use client';

import { ModernSelect } from '../forms';
import type { OfferPriceMode } from './offer-price-utils';
import { formatClPriceInput, parseDigits } from './offer-price-utils';

export type SimplePublishOfferPriceFieldsProps = {
    mainPrice: string;
    offerPrice: string;
    discountPercent: string;
    offerPriceMode: OfferPriceMode;
    onOfferPriceChange: (value: string) => void;
    onDiscountPercentChange: (value: string) => void;
    onOfferPriceModeChange: (mode: OfferPriceMode) => void;
    /** Sufijo cuando el modo es monto fijo (ej. $, UF, USD). */
    amountSuffix?: string;
    /** Si true, formatea miles con puntos (autos CLP). */
    formatThousands?: boolean;
    parseMainPrice?: (value: string) => number | null;
};

function defaultParseMainPrice(value: string): number | null {
    const digits = parseDigits(value);
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function SimplePublishOfferPriceFields(props: SimplePublishOfferPriceFieldsProps) {
    const {
        mainPrice,
        offerPrice,
        discountPercent,
        offerPriceMode,
        onOfferPriceChange,
        onDiscountPercentChange,
        onOfferPriceModeChange,
        amountSuffix = '$',
        formatThousands = false,
        parseMainPrice = defaultParseMainPrice,
    } = props;

    const formatInput = (value: string) => (formatThousands ? formatClPriceInput(value) : parseDigits(value));

    const handleOfferInput = (raw: string) => {
        if (offerPriceMode === '%') {
            const pct = parseDigits(raw).slice(0, 2);
            onDiscountPercentChange(pct);
            const main = parseMainPrice(mainPrice);
            if (main != null && pct) {
                const offer = Math.round(main * (1 - Number.parseInt(pct, 10) / 100));
                onOfferPriceChange(formatThousands ? offer.toLocaleString('es-CL') : String(offer));
            }
            return;
        }

        const next = formatInput(raw);
        onOfferPriceChange(next);
        const main = parseMainPrice(mainPrice);
        const offer = parseMainPrice(next);
        if (main != null && offer != null && offer < main) {
            const pct = Math.round((1 - offer / main) * 100);
            if (pct > 0) onDiscountPercentChange(String(pct));
        }
    };

    const displayOffer = offerPriceMode === '%' ? discountPercent : offerPrice;
    const resolvedSuffix = offerPriceMode === '%' ? '%' : amountSuffix;

    return (
        <div>
            <label className="panel-publish-price-label panel-publish-price-label--secondary">
                Precio oferta (opcional)
            </label>
            <div className="flex gap-2">
                <div className="form-input flex flex-1 items-center gap-2 !px-0 overflow-hidden">
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder={offerPriceMode === '%' ? '10' : (formatThousands ? '16.990.000' : '5000')}
                        value={displayOffer}
                        onChange={(event) => handleOfferInput(event.target.value)}
                        className="min-w-0 flex-1 border-none bg-transparent px-3 text-sm font-medium outline-none"
                    />
                    <span className="shrink-0 pr-3 text-sm font-semibold text-(--fg-muted)">
                        {resolvedSuffix}
                    </span>
                </div>
                <div className="w-20 shrink-0">
                    <ModernSelect
                        value={offerPriceMode}
                        onChange={(value) => {
                            onOfferPriceModeChange(value as OfferPriceMode);
                            onOfferPriceChange('');
                            onDiscountPercentChange('');
                        }}
                        options={[
                            { value: '$', label: amountSuffix.length > 2 ? amountSuffix.slice(0, 3) : amountSuffix },
                            { value: '%', label: '%' },
                        ]}
                    />
                </div>
            </div>
            {offerPrice ? (
                <div className="panel-publish-price-preview">
                    <span className="text-xs text-(--fg-muted)">Precio final en tarjeta</span>
                    <div className="flex items-center gap-2">
                        {offerPriceMode === '%' && discountPercent ? (
                            <span className="panel-publish-price-preview-badge">-{discountPercent}%</span>
                        ) : null}
                        <span className="text-sm font-semibold text-(--fg)">
                            {formatThousands ? `$${offerPrice}` : `${amountSuffix}${offerPrice}`}
                        </span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
