import type { Metadata } from 'next';
import { ComunaMariachisLanding } from '@/components/marketing/ComunaMariachisLanding';
import { MARIACHIS_BY_PATH, buildComunaPageMetadata, buildLocalBusinessJsonLd } from '@/lib/mariachis-comunas';

const cfg = MARIACHIS_BY_PATH.get('la-florida')!;

export const metadata: Metadata = buildComunaPageMetadata(cfg);

export default function MariachisLaFloridaPage() {
    const jsonLd = buildLocalBusinessJsonLd(cfg);
    return (
        <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <ComunaMariachisLanding config={cfg} />
        </>
    );
}
