export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#E11D48"/>
            <path d="M128 448 L490 85 L298 448 L256 320 Z" fill="white"/>
            <circle cx="400" cy="160" r="24" fill="white"/>
            <circle cx="320" cy="240" r="24" fill="white"/>
            <circle cx="430" cy="280" r="24" fill="white"/>
            <circle cx="350" cy="360" r="24" fill="white"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
