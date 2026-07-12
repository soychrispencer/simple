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

/** Mensaje si el precio oferta no es menor al precio normal (o % inválido). */
export function getOfferPriceValidationError(input: ResolveOfferPriceInput): string | null {
    const {
        mainPrice,
        offerPrice,
        discountPercent,
        offerPriceMode,
        parseMainPrice = defaultParseMainPrice,
    } = input;

    const main = parseMainPrice(mainPrice);
    if (main == null) return null;

    if (offerPriceMode === '%') {
        const raw = parseDigits(discountPercent).slice(0, 2);
        if (!raw) return null;
        const pct = Number.parseInt(raw, 10);
        if (!Number.isFinite(pct) || pct < 1 || pct > 99) {
            return 'El descuento debe ser entre 1% y 99%.';
        }
        return null;
    }

    const offer = parseMainPrice(offerPrice);
    if (offer == null) return null;
    if (offer >= main) {
        return 'El precio oferta debe ser menor al precio normal.';
    }
    return null;
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

    if (getOfferPriceValidationError(input)) return '';

    if (offerPriceMode === '%' && discountPercent.trim()) {
        const pct = Number.parseInt(parseDigits(discountPercent).slice(0, 2), 10);
        if (Number.isFinite(pct) && pct > 0 && pct < 100) {
            return String(Math.round(main * (1 - pct / 100)));
        }
        return '';
    }

    const offer = parseMainPrice(offerPrice);
    if (offer == null || offer >= main) return '';
    return String(offer);
}
