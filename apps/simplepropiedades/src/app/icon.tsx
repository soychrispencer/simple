export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#3b82f6"/>
            <path d="M140 428 L372 428" stroke="white" stroke-width="24" stroke-linecap="round"/>
            <path d="M172 428 L172 196 L256 128 L340 196 L340 428" stroke="white" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M244 428 L244 340 L292 340 L292 428" stroke="white" stroke-width="24" stroke-linecap="round"/>
            <path d="M220 244 L268 244" stroke="white" stroke-width="24" stroke-linecap="round"/>
            <path d="M220 292 L268 292" stroke="white" stroke-width="24" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
