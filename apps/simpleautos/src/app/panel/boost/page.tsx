import { redirect } from 'next/navigation';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BoostRedirectPage({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const nextParams = new URLSearchParams();
    nextParams.set('tab', 'boost');

    if (typeof params.listingId === 'string' && params.listingId.trim()) {
        nextParams.set('listingId', params.listingId);
    }

    if (typeof params.section === 'string' && params.section.trim()) {
        nextParams.set('section', params.section);
    }

    redirect(`/panel/publicidad?${nextParams.toString()}`);
}
