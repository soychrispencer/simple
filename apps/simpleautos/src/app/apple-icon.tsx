import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const accentColor = '#22c55e';

const CarIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
  <circle cx="7" cy="17" r="2"/>
  <path d="M9 17h6"/>
  <circle cx="17" cy="17" r="2"/>
</svg>
`;

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: accentColor,
                    borderRadius: '45px',
                }}
            >
                <div
                    dangerouslySetInnerHTML={{ __html: CarIconSvg }}
                    style={{
                        width: '100px',
                        height: '100px',
                    }}
                />
            </div>
        ),
        size,
    );
}
