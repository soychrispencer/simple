export type OfferPriceMode = '$' | '%';

export type ResolveOfferPriceInput = {
    mainPrice: string;
    offerPrice: string;
    discountPercent: string;
    offerPriceMode: OfferPriceMode;
    parseMainPrice?: (value: string) => number | null;
};

export function parseDigits(value: string): string {
    return value.replace(/\D/g, '');
}

export function formatClPriceInput(value: string): string {
    const numbers = parseDigits(value);
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function defaultParseMainPrice(value: string): number | null {
    const digits = parseDigits(value);
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Calcula el precio oferta final a partir del precio lista y modo $ o %. */
export function resolveOfferPriceValue(input: ResolveOfferPriceInput): string {
    const {
        mainPrice,
        offerPrice,
        discountPercent,
        offerPriceMode,
        parseMainPrice = defaultParseMainPrice,
    } = input;

    const main = parseMainPrice(mainPrice);
    if (main == null) return '';

    if (offerPriceMode === '%' && discountPercent.trim()) {
        const pct = Number.parseInt(parseDigits(discountPercent).slice(0, 2), 10);
        if (Number.isFinite(pct) && pct > 0 && pct < 100) {
            return String(Math.round(main * (1 - pct / 100)));
        }
        return '';
    }

    const offer = parseMainPrice(offerPrice);
    return offer != null ? String(offer) : '';
}
