import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { normalizeOperatorSiteLayout } from '@simple/utils';
import { getIndustrySiteDemo } from '@/lib/industry-site-demos';
import { IndustrySitePreview } from './industry-site-preview';

export const metadata: Metadata = {
    title: 'Ejemplo de página por rubro | SimpleAgenda',
    robots: { index: false, follow: false },
};

export default async function IndustryPreviewPage({
    params,
    searchParams,
}: {
    params: Promise<{ industry: string }>;
    searchParams: Promise<{ layout?: string }>;
}) {
    const [{ industry }, query] = await Promise.all([params, searchParams]);
    const demo = getIndustrySiteDemo(industry);
    if (!demo) return notFound();

    const previewDemo = query.layout
        ? { ...demo, appearance: { ...demo.appearance, layout: normalizeOperatorSiteLayout(query.layout) } }
        : demo;

    return <IndustrySitePreview demo={previewDemo} />;
}
