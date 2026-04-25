export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="#0d9488"/>
            <rect x="50" y="45" width="80" height="80" rx="8" stroke="white" stroke-width="8" fill="none"/>
            <line x1="95" y1="25" x2="95" y2="45" stroke="white" stroke-width="8" stroke-linecap="round"/>
            <line x1="65" y1="25" x2="65" y2="45" stroke="white" stroke-width="8" stroke-linecap="round"/>
            <line x1="50" y1="65" x2="130" y2="65" stroke="white" stroke-width="8" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
