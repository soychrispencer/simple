import { getSimpleBrandIconSvg } from '@simple/config';

export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    return new Response(getSimpleBrandIconSvg('simplepropiedades'), {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
