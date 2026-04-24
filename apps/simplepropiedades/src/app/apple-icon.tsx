import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const accentColor = '#3b82f6';

const BuildingIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 21h18"/>
  <path d="M5 21V7l8-4 8 4v14"/>
  <path d="M9 21v-6h6v6"/>
  <path d="M10 9h4"/>
  <path d="M10 13h4"/>
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
                    dangerouslySetInnerHTML={{ __html: BuildingIconSvg }}
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
