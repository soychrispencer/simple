import { IconCalendar } from '@tabler/icons-react';

export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#0d9488"/>
            <rect x="140" y="128" width="232" height="232" rx="24" stroke="white" stroke-width="24" fill="none"/>
            <line x1="260" y1="80" x2="260" y2="128" stroke="white" stroke-width="24" stroke-linecap="round"/>
            <line x1="200" y1="80" x2="200" y2="128" stroke="white" stroke-width="24" stroke-linecap="round"/>
            <line x1="140" y1="200" x2="372" y2="200" stroke="white" stroke-width="24" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
