export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="#475569"/>
            <!-- IconBuilding de Tabler -->
            <path d="M50 140 L130 140" stroke="white" stroke-width="8" stroke-linecap="round"/>
            <path d="M62 140 L62 85 L90 60 L118 85 L118 140" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M86 140 L86 115 L104 115 L104 140" stroke="white" stroke-width="8" stroke-linecap="round"/>
            <path d="M78 90 L96 90" stroke="white" stroke-width="8" stroke-linecap="round"/>
            <path d="M78 108 L96 108" stroke="white" stroke-width="8" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
