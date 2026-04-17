import { IconUser } from '@tabler/icons-react';
import type { ListingSellerRef } from '../types';

type Props = {
    seller: ListingSellerRef;
    size?: 'sm' | 'md';
    onProfileClick?: (e: React.MouseEvent) => void;
};

export default function ListingSellerStrip({ seller, size = 'sm', onProfileClick }: Props) {
    const dim = size === 'md' ? 32 : 28;
    const clickable = Boolean(seller.profileHref && onProfileClick);

    const content = seller.avatarUrl ? (
        <span
            className="inline-flex items-center justify-center overflow-hidden border shrink-0"
            style={{ width: dim, height: dim, borderRadius: 10, borderColor: 'var(--border)' }}
        >
            <img
                src={seller.avatarUrl}
                alt={seller.name}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
            />
        </span>
    ) : (
        <span
            className="inline-flex items-center justify-center border shrink-0"
            style={{
                width: dim,
                height: dim,
                borderRadius: 10,
                borderColor: 'var(--border)',
                color: 'var(--fg-muted)',
                background: 'transparent',
            }}
            aria-label={seller.name}
        >
            <IconUser size={14} />
        </span>
    );

    if (clickable) {
        return (
            <button
                type="button"
                onClick={onProfileClick}
                className="inline-flex items-center rounded-md transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                aria-label={`Perfil de ${seller.name}`}
            >
                {content}
            </button>
        );
    }
    return content;
}
