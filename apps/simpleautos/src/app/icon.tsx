import { getSimpleBrandIconTokens } from '@simple/config';

export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const tokens = getSimpleBrandIconTokens('simpleautos');
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="${tokens.accent}"/>
            <circle cx="256" cy="256" r="96" stroke="${tokens.glyph}" stroke-width="24" fill="none"/>
            <circle cx="256" cy="256" r="21" fill="${tokens.glyph}"/>
            <line x1="256" y1="128" x2="256" y2="160" stroke="${tokens.glyph}" stroke-width="24" stroke-linecap="round"/>
            <line x1="256" y1="352" x2="256" y2="384" stroke="${tokens.glyph}" stroke-width="24" stroke-linecap="round"/>
            <line x1="128" y1="256" x2="160" y2="256" stroke="${tokens.glyph}" stroke-width="24" stroke-linecap="round"/>
            <line x1="352" y1="256" x2="384" y2="256" stroke="${tokens.glyph}" stroke-width="24" stroke-linecap="round"/>
            <line x1="162" y1="162" x2="186" y2="186" stroke="${tokens.glyph}" stroke-width="24" stroke-linecap="round"/>
            <line x1="326" y1="326" x2="350" y2="350" stroke="${tokens.glyph}" stroke-width="24" stroke-linecap="round"/>
            <line x1="162" y1="350" x2="186" y2="326" stroke="${tokens.glyph}" stroke-width="24" stroke-linecap="round"/>
            <line x1="326" y1="186" x2="350" y2="162" stroke="${tokens.glyph}" stroke-width="24" stroke-linecap="round"/>
        </svg>`;

    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
