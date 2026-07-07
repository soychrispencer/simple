'use client';

import { IconX } from '@tabler/icons-react';
import type { PanelListing } from '@/lib/panel-listings';
import { ListingDistributionSection } from '@/components/panel/listing-distribution-section';

type Props = {
    listing: PanelListing;
    brandLabel: string;
    vertical: 'autos' | 'propiedades';
    onClose: () => void;
};

export function ListingDistributionDialogHost({ listing, brandLabel, vertical, onClose }: Props) {
    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center">
            <button
                type="button"
                aria-label="Cerrar"
                className="absolute inset-0"
                onClick={onClose}
            />
            <div className="relative z-[1] w-full max-w-lg rounded-[1.5rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-[var(--fg)]">Dónde está publicado</h2>
                        <p className="mt-0.5 truncate text-xs text-[var(--fg-muted)]">{listing.title}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
                    >
                        <IconX size={18} />
                    </button>
                </div>
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
            </div>
        </div>
    );
}
