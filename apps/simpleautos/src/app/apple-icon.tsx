import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';
export const runtime = 'nodejs';

const accentColor = '#ff3600';

export default function AppleIcon() {
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="#ff3600"/>
            <!-- IconSteeringWheel de Tabler -->
            <circle cx="90" cy="90" r="48" stroke="white" stroke-width="10" fill="none"/>
            <circle cx="90" cy="90" r="32" stroke="white" stroke-width="8" fill="none"/>
            <circle cx="90" cy="90" r="12" fill="white"/>
            <path d="M90 42 L90 56" stroke="white" stroke-width="8" stroke-linecap="round"/>
            <path d="M90 124 L90 138" stroke="white" stroke-width="8" stroke-linecap="round"/>
            <path d="M42 90 L56 90" stroke="white" stroke-width="8" stroke-linecap="round"/>
            <path d="M124 90 L138 90" stroke="white" stroke-width="8" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
