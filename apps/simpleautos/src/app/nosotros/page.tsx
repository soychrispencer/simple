import { SiteInfoPage } from '@/components/content/site-info-page';
import { getSitePage } from '@/lib/site-pages';

export default function NosotrosPage() {
    return <SiteInfoPage page={getSitePage('nosotros')} />;
}
