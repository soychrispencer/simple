import { SiteInfoPage } from '@/components/content/site-info-page';
import { getSitePage } from '@/lib/site-pages';

export default function BlogPage() {
    return <SiteInfoPage page={getSitePage('blog')} />;
}
