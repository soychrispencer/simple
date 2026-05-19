import { getSimpleBrandIconTokens } from '@simple/config';

export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    const tokens = getSimpleBrandIconTokens('simpleautos');
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="${tokens.accent}"/>
            <circle cx="90" cy="90" r="34" stroke="${tokens.glyph}" stroke-width="8" fill="none"/>
            <circle cx="90" cy="90" r="8" fill="${tokens.glyph}"/>
            <line x1="90" y1="45" x2="90" y2="56" stroke="${tokens.glyph}" stroke-width="8" stroke-linecap="round"/>
            <line x1="90" y1="124" x2="90" y2="135" stroke="${tokens.glyph}" stroke-width="8" stroke-linecap="round"/>
            <line x1="45" y1="90" x2="56" y2="90" stroke="${tokens.glyph}" stroke-width="8" stroke-linecap="round"/>
            <line x1="124" y1="90" x2="135" y2="90" stroke="${tokens.glyph}" stroke-width="8" stroke-linecap="round"/>
            <line x1="57" y1="57" x2="65" y2="65" stroke="${tokens.glyph}" stroke-width="8" stroke-linecap="round"/>
            <line x1="115" y1="115" x2="123" y2="123" stroke="${tokens.glyph}" stroke-width="8" stroke-linecap="round"/>
            <line x1="57" y1="123" x2="65" y2="115" stroke="${tokens.glyph}" stroke-width="8" stroke-linecap="round"/>
            <line x1="115" y1="65" x2="123" y2="57" stroke="${tokens.glyph}" stroke-width="8" stroke-linecap="round"/>
        </svg>`;

    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
