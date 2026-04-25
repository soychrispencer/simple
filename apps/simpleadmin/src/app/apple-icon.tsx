export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="#4f46e5"/>
            <path d="M90 45 C118 45 140 67 140 95 L140 115 C140 125 132 133 122 133 L58 133 C48 133 40 125 40 115 L40 95 C40 67 62 45 90 45 Z" stroke="white" stroke-width="8" fill="none"/>
            <circle cx="90" cy="105" r="10" fill="white"/>
            <line x1="90" y1="75" x2="90" y2="95" stroke="white" stroke-width="8" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
