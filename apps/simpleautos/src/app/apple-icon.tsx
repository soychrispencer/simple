import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default async function AppleIcon() {
    const logo = await readFile(fileURLToPath(new URL('../../public/logo.png', import.meta.url)));
    const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;
    const logoSize = '108%';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    overflow: 'hidden',
                }}
            >
                <img
                    src={logoSrc}
                    alt="SimpleAutos"
                    style={{
                        width: logoSize,
                        height: logoSize,
                        objectFit: 'contain',
                    }}
                />
            </div>
        ),
        size,
    );
}
