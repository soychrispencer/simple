import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const accentColor = '#22c55e';

const SteeringWheelIconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"/>
  <circle cx="12" cy="12" r="2"/>
  <path d="M12 12v-9"/>
  <path d="M12 12l4.5 4.5"/>
  <path d="M12 12l-4.5 4.5"/>
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
                    dangerouslySetInnerHTML={{ __html: SteeringWheelIconSvg }}
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
