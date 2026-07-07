'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { IconUser } from '@tabler/icons-react';
import { resolveListingSellerAvatarUrl } from '@simple/utils';
import { initialsFromPublicProfileName } from '../public-profile';
import { PanelBlockHeader } from '../panel/panel-primitives';
import { PanelCard } from '../panel/panel-card';

export type PublicListingDetailSellerCardProps = {
    sellerName: string;
    sellerBadge?: string;
    profileHref?: string | null;
    profileLinkLabel?: string;
    avatarUrl?: string | null;
    title?: string;
    className?: string;
};

export default function PublicListingDetailSellerCard({
    sellerName,
    sellerBadge,
    profileHref,
    profileLinkLabel = 'Ver perfil completo',
    avatarUrl,
    title = 'Vendedor',
    className,
}: PublicListingDetailSellerCardProps) {
    const resolvedAvatar = resolveListingSellerAvatarUrl({ avatarUrl });
    const [avatarFailed, setAvatarFailed] = useState(false);
    const showInitials = !resolvedAvatar || avatarFailed;
    const initials = initialsFromPublicProfileName(sellerName);

    const avatarNode = (
        <div
            className={`public-listing-detail-seller-card__avatar ${showInitials ? 'public-listing-detail-seller-card__avatar--initials' : ''}`}
            aria-hidden
        >
            {showInitials ? (
                initials || <IconUser size={20} />
            ) : (
                <Image
                    src={resolvedAvatar}
                    alt=""
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                />
            )}
        </div>
    );

    const identityBlock = (
        <>
            {profileHref ? (
                <Link href={profileHref} className="public-listing-detail-seller-card__avatar-link" aria-label={`Ver perfil de ${sellerName}`}>
                    {avatarNode}
                </Link>
            ) : (
                avatarNode
            )}
            <div className="min-w-0">
                {profileHref ? (
                    <Link href={profileHref} className="public-listing-detail-seller-card__name public-listing-detail-seller-card__name--link">
                        {sellerName}
                    </Link>
                ) : (
                    <p className="public-listing-detail-seller-card__name">{sellerName}</p>
                )}
                {sellerBadge ? (
                    <p className="public-listing-detail-seller-card__badge">{sellerBadge}</p>
                ) : null}
            </div>
        </>
    );

    return (
        <PanelCard size="md" className={className}>
            <PanelBlockHeader title={title} className="mb-4" />
            <div className="public-listing-detail-seller-card__row">{identityBlock}</div>
            {profileHref ? (
                <Link href={profileHref} className="public-listing-detail-seller-card__link">
                    {profileLinkLabel}
                </Link>
            ) : null}
        </PanelCard>
    );
}
