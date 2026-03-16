import { SiteInfoPage } from '@/components/content/site-info-page';
import { getSitePage } from '@/lib/site-pages';

export default function PrivacidadPage() {
    return <SiteInfoPage page={getSitePage('privacidad')} />;
}
