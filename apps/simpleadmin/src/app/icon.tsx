import { ImageResponse } from 'next/og';
import { getSimpleBrandIconTokens } from '@simple/config';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
    const icon = getSimpleBrandIconTokens('simpleadmin');

    return new ImageResponse(
        (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: icon.canvas }}>
                <div
                    style={{
                        width: 400,
                        height: 400,
                        borderRadius: 96,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        background: icon.tile,
                        boxShadow: `inset 0 0 0 8px ${icon.ring}`,
                    }}
                >
                    <div style={{ fontSize: 220, fontWeight: 700, lineHeight: 1, color: icon.glyph, transform: 'translateY(-12px)' }}>S</div>
                    <div style={{ position: 'absolute', bottom: 54, width: 176, height: 22, borderRadius: 999, background: icon.accent }} />
                </div>
            </div>
        ),
        size,
    );
}
