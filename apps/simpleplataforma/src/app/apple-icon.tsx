export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="#111111"/>
            <rect x="48" y="45" width="36" height="56" rx="9" stroke="white" stroke-width="8" fill="none"/>
            <rect x="48" y="121" width="36" height="24" rx="9" stroke="white" stroke-width="8" fill="none"/>
            <rect x="96" y="45" width="36" height="24" rx="9" stroke="white" stroke-width="8" fill="none"/>
            <rect x="96" y="89" width="36" height="56" rx="9" stroke="white" stroke-width="8" fill="none"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
