export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#ff3600"/>
            <!-- IconSteeringWheel de Tabler -->
            <circle cx="256" cy="256" r="140" stroke="white" stroke-width="32" fill="none"/>
            <circle cx="256" cy="256" r="90" stroke="white" stroke-width="24" fill="none"/>
            <circle cx="256" cy="256" r="35" fill="white"/>
            <path d="M256 116 L256 181" stroke="white" stroke-width="24" stroke-linecap="round"/>
            <path d="M256 331 L256 396" stroke="white" stroke-width="24" stroke-linecap="round"/>
            <path d="M116 256 L181 256" stroke="white" stroke-width="24" stroke-linecap="round"/>
            <path d="M331 256 L396 256" stroke="white" stroke-width="24" stroke-linecap="round"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
