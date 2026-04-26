export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#E11D48"/>
            <!-- IconConfettiFilled de Tabler -->
            <path d="M140 420 L420 140 L280 420 L240 300 Z" fill="white"/>
            <circle cx="340" cy="180" r="28" fill="white"/>
            <circle cx="260" cy="260" r="28" fill="white"/>
            <circle cx="380" cy="300" r="28" fill="white"/>
            <circle cx="280" cy="380" r="28" fill="white"/>
            <circle cx="200" cy="320" r="20" fill="white"/>
            <circle cx="360" cy="360" r="20" fill="white"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
