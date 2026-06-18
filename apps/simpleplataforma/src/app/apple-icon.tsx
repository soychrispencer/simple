import { getSimpleBrandIconSvg } from '@simple/config';

export const size = { width: 180, height: 180 };
export const contentType = 'image/svg+xml';

export default function AppleIcon() {
    return new Response(getSimpleBrandIconSvg('simpleplataforma'), {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
