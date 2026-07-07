'use client';

import type { PanelListing } from '@/lib/panel-listings';
import { listingHasShareableVideo } from '@/lib/listing-media';
import { ShareToSocialPanel } from '@/components/panel/share-to-social-panel';
import { PanelScrollSheet } from '@simple/ui/panel';

type Props = {
    listing: PanelListing;
    onClose: () => void;
};

export function ListingShareSheet({ listing, onClose }: Props) {
    const shareText = listing.title
        ? `Mira esta propiedad en SimplePropiedades: ${listing.title}`
        : undefined;

    return (
        <PanelScrollSheet
            title="Compartir y publicar"
            subtitle={listing.title}
            onClose={onClose}
        >
            <ShareToSocialPanel
                listingId={listing.id}
                listingTitle={listing.title}
                listingHref={listing.href}
                listingPrice={listing.price}
                listingDescription={listing.description}
                listingLocation={listing.location}
                hasVideo={listingHasShareableVideo(listing)}
                shareText={shareText}
            />
        </PanelScrollSheet>
    );
}
