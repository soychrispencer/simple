import type { Metadata } from 'next';
import { ProfessionalsLandingPage } from '@/components/marketing/ProfessionalsLandingPage';
import { getSerenatasSiteOrigin } from '@/lib/site-origin';

const TITLE = 'SimpleSerenatas para músicos y coordinadores | Agenda y operación';
const DESCRIPTION =
  'Panel para músicos de mariachi y coordinadores: agenda, cuadrillas, solicitudes y rutas. Regístrate gratis y organiza tus serenatas con SimpleSerenatas en Chile.';

export const metadata: Metadata = {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: '/profesionales' },
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        url: getSerenatasSiteOrigin() + '/profesionales',
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

export default function ProfesionalesMarketingPage() {
    return <ProfessionalsLandingPage />;
}
