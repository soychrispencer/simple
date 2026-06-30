import { SiteInfoPage } from '@/components/content/site-info-page';
import { getSitePage } from '@/lib/site-pages';

export default function ContactoPage() {
    return <SiteInfoPage page={getSitePage('contacto')} />;
}
