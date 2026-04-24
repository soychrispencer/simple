import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const accentColor = '#3b82f6';

const HomeIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</svg>
`;

export default function Icon() {
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
                    borderRadius: '128px',
                }}
            >
                <div
                    dangerouslySetInnerHTML={{ __html: HomeIconSvg }}
                    style={{
                        width: '280px',
                        height: '280px',
                    }}
                />
            </div>
        ),
        size,
    );
}
