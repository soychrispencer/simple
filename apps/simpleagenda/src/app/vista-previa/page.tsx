import { AgendaSitePreview, AgendaSitePreviewFrame } from '@/components/panel/agenda-site-preview';

export const metadata = {
    title: 'Vista previa de tu página | SimpleAgenda',
    robots: { index: false, follow: false },
};

export default async function AgendaAppearancePreviewPage({
    searchParams,
}: {
    searchParams: Promise<{
        layout?: string;
        colorMode?: string;
        accent?: string;
        rev?: string;
        draft?: string;
        profile?: string;
        embed?: string;
    }>;
}) {
    const query = await searchParams;
    if (query.embed !== '1') {
        const params = new URLSearchParams({ embed: '1' });
        for (const key of ['layout', 'colorMode', 'accent', 'rev', 'draft', 'profile'] as const) {
            const value = query[key];
            if (typeof value === 'string') params.set(key, value);
        }
        return <AgendaSitePreviewFrame url={`/vista-previa?${params}`} />;
    }

    return (
        <AgendaSitePreview
            layout={query.layout}
            colorMode={query.colorMode}
            accent={query.accent}
            revision={query.rev ?? ''}
            draft={query.draft === '1'}
            profileId={query.profile}
        />
    );
}
