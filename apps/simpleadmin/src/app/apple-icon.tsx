export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="#4f46e5"/>
            <!-- IconShieldLock de Tabler -->
            <path d="M90 24 C135 24 165 44 165 44 L165 86 C165 122 130 156 90 156 C50 156 15 122 15 86 L15 44 C15 44 45 24 90 24 Z" stroke="white" stroke-width="10" fill="none"/>
            <circle cx="90" cy="90" r="14" fill="white"/>
            <path d="M90 62 L90 76" stroke="white" stroke-width="10" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
