import { SIMPLE_BRAND_ARTWORK } from './brand-vectors.js';

type SimpleAppId = keyof typeof SIMPLE_BRAND_ARTWORK;
type IconTokens = { accent: string; glyph: string };

export function buildSimpleBrandIconSvg(appId: SimpleAppId, tokens: IconTokens, micro = false): string {
    const artwork = SIMPLE_BRAND_ARTWORK[appId];
    return '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" fill="none">'
        + '<rect width="512" height="512" rx="122.88" fill="' + tokens.accent + '"/>'
        + '<g color="' + tokens.glyph + '" transform="translate(51.2 51.2) scale(6.4)">'
        + (micro ? artwork.micro : artwork.full) + '</g></svg>';
}

export function buildSimpleBrandIconDataUri(appId: SimpleAppId, tokens: IconTokens): string {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buildSimpleBrandIconSvg(appId, tokens));
}
