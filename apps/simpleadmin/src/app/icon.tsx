export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#4f46e5"/>
            <!-- IconShieldLock de Tabler -->
            <path d="M256 64 C350 64 420 110 420 110 L420 244 C420 350 340 448 256 448 C172 448 92 350 92 244 L92 110 C92 110 162 64 256 64 Z" stroke="white" stroke-width="28" fill="none"/>
            <circle cx="256" cy="260" r="40" fill="white"/>
            <path d="M256 180 L256 220" stroke="white" stroke-width="28" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
