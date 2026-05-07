import type { Metadata } from 'next';
import { ClientHomeLanding } from '@/components/marketing/ClientHomeLanding';
import { getSerenatasSiteOrigin } from '@/lib/site-origin';

const TITLE = 'Mariachis a domicilio en Santiago | Serenatas desde $50.000 — SimpleSerenatas';
const DESCRIPTION =
  'Contrata mariachis a domicilio en Santiago. Serenatas desde $50.000, coordinación clara y solicitud online. Cumpleaños, aniversarios y sorpresas en la RM.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/' },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: getSerenatasSiteOrigin() + '/',
        siteName: 'SimpleSerenatas',
        locale: 'es_CL',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: TITLE,
        description: DESCRIPTION,
    },
};

export default function HomePage() {
    return <ClientHomeLanding />;
}
