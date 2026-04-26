import { IconCalendar } from '@tabler/icons-react';

export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#0d9488"/>
            <!-- IconCalendar de Tabler -->
            <rect x="116" y="140" width="280" height="256" rx="32" stroke="white" stroke-width="28" fill="none"/>
            <path d="M196 116 L196 180" stroke="white" stroke-width="28" stroke-linecap="round"/>
            <path d="M316 116 L316 180" stroke="white" stroke-width="28" stroke-linecap="round"/>
            <path d="M116 228 L396 228" stroke="white" stroke-width="28" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
