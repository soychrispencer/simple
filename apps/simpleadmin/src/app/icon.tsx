export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    const svg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" rx="128" fill="#111111"/>
            <rect x="136" y="128" width="104" height="160" rx="24" stroke="white" stroke-width="24" fill="none"/>
            <rect x="136" y="336" width="104" height="64" rx="24" stroke="white" stroke-width="24" fill="none"/>
            <rect x="272" y="128" width="104" height="64" rx="24" stroke="white" stroke-width="24" fill="none"/>
            <rect x="272" y="240" width="104" height="160" rx="24" stroke="white" stroke-width="24" fill="none"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
