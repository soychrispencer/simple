import { ImageResponse } from 'next/og';
import { getSimpleBrandIconTokens } from '@simple/config';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
    const tokens = getSimpleBrandIconTokens('simpleserenatas');
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: tokens.canvas,
                }}
            >
                <div
                    style={{
                        width: 360,
                        height: 360,
                        borderRadius: 96,
                        background: tokens.tile,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: tokens.glyph,
                        fontSize: 168,
                        fontWeight: 800,
                        border: `18px solid ${tokens.accent}`,
                    }}
                >
                    S
                </div>
            </div>
        ),
        size
    );
}
