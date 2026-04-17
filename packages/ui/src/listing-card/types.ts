export type ListingMode = 'grid' | 'list';
export type ListingVariant = 'sale' | 'rent' | 'auction' | 'project';
export type ListingAccent = 'autos' | 'propiedades';

export type ListingImage = {
    src: string;
    alt?: string;
};

export type ListingSellerRef = {
    name: string;
    avatarUrl?: string;
    profileHref?: string;
    meta?: string;
};

export type ListingEngagement = {
    views?: number;
    saves?: number;
    messages?: number;
    listedSinceLabel?: string;
};

export type ListingBadgeTone = 'success' | 'warning' | 'info' | 'danger' | 'neutral';

export type ListingBadge = {
    label: string;
    tone?: ListingBadgeTone;
};

export type ListingPrice = {
    amount: number;
    original?: number;
    discountLabel?: string;
    secondary?: string;
    caption?: string;
};

export type PublicListingCardProps = {
    id: string;
    href: string;
    title: string;
    price: ListingPrice;
    variant: ListingVariant;
    mode: ListingMode;
    accent?: ListingAccent;
    images: ListingImage[];
    location: string;
    metaTags: string[];
    seller: ListingSellerRef;
    badges?: ListingBadge[];
    ctaLabel?: string;
    engagement?: ListingEngagement;
    isSaved?: boolean;
    onSave?: (id: string) => Promise<{ saved: boolean }> | void;
    onShare?: (id: string) => void;
    onClick?: (id: string) => void;
};

export type OwnerListingStatus =
    | 'draft'
    | 'active'
    | 'paused'
    | 'expired'
    | 'review_required'
    | 'sold';

export type OwnerListingAction = {
    key: string;
    label: string;
    tone?: 'neutral' | 'danger' | 'primary';
    disabled?: boolean;
    onSelect: () => void;
};

export type OwnerListingCardProps = {
    id: string;
    href: string;
    title: string;
    price: ListingPrice;
    variant: ListingVariant;
    mode: ListingMode;
    accent?: ListingAccent;
    images: ListingImage[];
    location: string;
    metaTags: string[];
    status: OwnerListingStatus;
    statusLabel?: string;
    statusHint?: string;
    engagement: ListingEngagement & { conversionsLabel?: string };
    primaryAction?: {
        label: string;
        onSelect: () => void;
        disabled?: boolean;
    };
    secondaryActions?: OwnerListingAction[];
    onClick?: (id: string) => void;
    busyActionKey?: string | null;
};
