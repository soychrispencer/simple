'use client';

import type { PanelListing } from '@/lib/panel-listings';
import { ListingDistributionSection } from '@/components/panel/listing-distribution-section';
import { PanelScrollSheet } from '@simple/ui/panel';

type Props = {
    listing: PanelListing;
    brandLabel: string;
    vertical: 'autos' | 'propiedades';
    onClose: () => void;
};

export function ListingDistributionDialogHost({ listing, brandLabel, vertical, onClose }: Props) {
    return (
        <PanelScrollSheet
            title="Dónde está publicado"
            subtitle={listing.title}
            onClose={onClose}
        >
            <ListingDistributionSection
                listingId={listing.id}
                vertical={vertical}
                brandLabel={brandLabel}
                listingTitle={listing.title}
                listingHref={listing.href}
                listingPrice={listing.price}
                listingDescription={listing.description}
                listingLocation={listing.location}
            />
        </PanelScrollSheet>
    );
}
