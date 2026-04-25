export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#4f46e5"/>
            <path d="M256 140 C321 140 374 193 374 258 L374 316 C374 342 353 363 327 363 L185 363 C159 363 138 342 138 316 L138 258 C138 193 191 140 256 140 Z" stroke="white" stroke-width="16" fill="none"/>
            <circle cx="256" cy="276" r="24" fill="white"/>
            <line x1="256" y1="200" x2="256" y2="252" stroke="white" stroke-width="16" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
