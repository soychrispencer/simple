import { ImageResponse } from 'next/og';
import { getSimpleBrandIconTokens } from '@simple/config';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
    const icon = getSimpleBrandIconTokens('simpleplataforma');

    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: icon.canvas }}>
                <div
                    style={{
                        width: 144,
                        height: 144,
                        borderRadius: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        background: icon.tile,
                    }}
                >
                    <div style={{ fontSize: 82, fontWeight: 700, lineHeight: 1, color: icon.glyph, transform: 'translateY(-4px)' }}>S</div>
                    <div style={{ position: 'absolute', bottom: 22, width: 60, height: 9, borderRadius: 999, background: icon.accent }} />
                </div>
            </div>
        ),
        size,
    );
}
