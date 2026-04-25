export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    const svg = `<svg width="180" height="180" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="180" height="180" rx="45" fill="#E11D48"/>
            <path d="M50 155 L172 35 L95 155 L75 130 Z" fill="white"/>
            <circle cx="140" cy="55" r="10" fill="white"/>
            <circle cx="110" cy="85" r="10" fill="white"/>
            <circle cx="150" cy="100" r="10" fill="white"/>
            <circle cx="120" cy="125" r="10" fill="white"/>
        </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
