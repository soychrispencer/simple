import { getSimpleBrandIconSvg } from '@simple/config';

export const size = { width: 512, height: 512 };
export const contentType = 'image/svg+xml';

export default function Icon() {
    return new Response(getSimpleBrandIconSvg('simpleagenda'), {
        headers: {
            'Content-Type': 'image/svg+xml',
        },
    });
}
