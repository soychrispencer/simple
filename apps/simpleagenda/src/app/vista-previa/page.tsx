import {
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteLayout,
    parseOperatorSiteAccent,
    serializeOperatorSiteAccent,
} from '@simple/utils';
import { AgendaSitePreview } from '@/components/panel/agenda-site-preview';

export const metadata = {
    title: 'Vista previa de tu página | SimpleAgenda',
    robots: { index: false, follow: false },
};

export default async function AgendaAppearancePreviewPage({
    searchParams,
}: {
    searchParams: Promise<{ layout?: string; colorMode?: string; accent?: string; rev?: string; draft?: string }>;
}) {
    const query = await searchParams;
    return (
        <AgendaSitePreview
            layout={normalizeOperatorSiteLayout(query.layout)}
            colorMode={normalizeOperatorSiteColorMode(query.colorMode)}
            accent={serializeOperatorSiteAccent(parseOperatorSiteAccent(query.accent))}
            revision={query.rev ?? ''}
            draft={query.draft === '1'}
        />
    );
}
