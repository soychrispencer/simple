export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="#E11D48"/>
            <!-- IconConfettiFilled de Tabler -->
            <path d="M50 148 L148 50 L98 148 L82 114 Z" fill="white"/>
            <circle cx="120" cy="68" r="10" fill="white"/>
            <circle cx="92" cy="92" r="10" fill="white"/>
            <circle cx="134" cy="106" r="10" fill="white"/>
            <circle cx="98" cy="134" r="10" fill="white"/>
            <circle cx="70" cy="114" r="7" fill="white"/>
            <circle cx="126" cy="126" r="7" fill="white"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
