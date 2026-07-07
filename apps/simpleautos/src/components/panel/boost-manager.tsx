'use client';

import { useSearchParams } from 'next/navigation';
import { MarketplaceBoostManager } from '@simple/ui/panel';
import { confirmCheckout, startBoostCheckout } from '@/lib/payments';

export default function BoostManager() {
    const searchParams = useSearchParams();
    const initialListingId = searchParams.get('listingId');

    return (
        <MarketplaceBoostManager
            vertical="autos"
            initialListingId={initialListingId}
            startBoostCheckout={startBoostCheckout}
            confirmCheckout={confirmCheckout}
        />
    );
}
