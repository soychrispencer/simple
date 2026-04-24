import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const accentColor = '#22c55e';

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
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100"
                    height="100"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <circle cx="12" cy="12" r="9" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M12 12v-9" />
                    <path d="M12 12l4.5 4.5" />
                    <path d="M12 12l-4.5 4.5" />
                </svg>
            </div>
        ),
        size,
    );
}
