import {
    IconBrandFacebook,
    IconBrandInstagram,
    IconBrandLinkedin,
    IconBrandTiktok,
    IconBrandX,
    IconBrandYoutube,
} from '@tabler/icons-react';
import type { OperatorSiteSocialLink } from './types.js';

const SOCIAL_ICON_MAP: Record<OperatorSiteSocialLink['kind'], typeof IconBrandInstagram> = {
    instagram: IconBrandInstagram,
    facebook: IconBrandFacebook,
    linkedin: IconBrandLinkedin,
    tiktok: IconBrandTiktok,
    youtube: IconBrandYoutube,
    x: IconBrandX,
};

export function socialIcon(kind: OperatorSiteSocialLink['kind'], size = 18) {
    const Icon = SOCIAL_ICON_MAP[kind];
    return Icon ? <Icon size={size} /> : null;
}
