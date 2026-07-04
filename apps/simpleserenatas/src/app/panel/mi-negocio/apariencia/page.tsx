'use client';

import { useCallback, useEffect, useState } from 'react';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import {
    PanelMiNegocioShell,
    SERENATAS_BUSINESS_TABS,
    OperatorSiteAppearanceEditor,
    PanelCard,
    PanelBlockHeader,
    PanelNotice,
    type OperatorSiteAppearanceValue,
    BUSINESS_BRAND_IMAGES_SECTION,
    businessBrandImageSavedMessage,
} from '@simple/ui/panel';
import {
    DEFAULT_OPERATOR_SITE_ACCENT,
    DEFAULT_OPERATOR_SITE_COLOR_MODE,
    DEFAULT_OPERATOR_SITE_LAYOUT,
} from '@simple/utils';
import { useProviderGroupScope } from '@/hooks/use-provider-group-scope';
import { MiNegocioPublishToggle } from '@/components/panel/mi-negocio-publish-toggle';
import { resolveSerenatasBusinessPageCopy } from '@simple/ui/panel';
import { ProviderGroupBrandImages } from '@/components/panel/provider-group-brand-images';
import { SerenatasPublicLinkPanel } from '@/components/panel/serenatas-public-link-panel';
import { serenatasApi } from '@/lib/serenatas-api';

export default function AparienciaPage() {
    const { group, loading, refresh } = useProviderGroupScope();
    const page = resolveSerenatasBusinessPageCopy('apariencia');
    const [value, setValue] = useState<OperatorSiteAppearanceValue>({
        layout: DEFAULT_OPERATOR_SITE_LAYOUT,
        colorMode: DEFAULT_OPERATOR_SITE_COLOR_MODE,
        accentColor: DEFAULT_OPERATOR_SITE_ACCENT,
    });
    const [saving, setSaving] = useState(false);
    const [imageFeedback, setImageFeedback] = useState('');

    const [logoUrl, setLogoUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');

    useEffect(() => {
        if (group) {
            setLogoUrl(group.logoUrl ?? '');
            setCoverUrl(group.coverUrl ?? '');
        }
    }, [group?.id, group?.updatedAt]);

    const handleChange = (next: OperatorSiteAppearanceValue) => {
        setValue(next);
    };

    const handleSave = async () => {
        setSaving(true);
        // TODO: Persist appearance settings via serenatasApi when backend support is added
        await new Promise((r) => setTimeout(r, 500));
        setSaving(false);
    };

    const publicPreviewHref = group?.slug
        ? `${(process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')}/${group.slug}`
        : null;

    const saveBrandImages = useCallback(async (
        nextLogoUrl: string | null,
        nextCoverUrl: string | null,
        kind: 'logo' | 'cover',
    ) => {
        if (!group) return;
        const response = await serenatasApi.updateProviderGroup(group.id, {
            name: group.name,
            logoUrl: nextLogoUrl,
            coverUrl: nextCoverUrl,
        });
        if (!response.ok) {
            setImageFeedback('');
            return;
        }
        await refresh();
        setImageFeedback(businessBrandImageSavedMessage(kind));
        window.setTimeout(() => setImageFeedback(''), 3000);
    }, [group, refresh]);

    return (
        <PanelMiNegocioShell
            activeKey="apariencia"
            tabs={SERENATAS_BUSINESS_TABS}
            title={page.title}
            description={page.description}
            publishToggle={<MiNegocioPublishToggle refresh={refresh} />}
        >
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                    <IconLoader2 size={14} className="animate-spin" /> Cargando...
                </div>
            ) : (
                <div className="grid min-w-0 gap-5">
                    <PanelCard size="lg" className="space-y-4">
                        <PanelBlockHeader
                            title={BUSINESS_BRAND_IMAGES_SECTION.title}
                            description={BUSINESS_BRAND_IMAGES_SECTION.description}
                            className="mb-0"
                        />
                        <ProviderGroupBrandImages
                            name={group?.name ?? ''}
                            logoUrl={logoUrl}
                            coverUrl={coverUrl}
                            profession="Mariachi"
                            location={null}
                            previewHref={publicPreviewHref}
                            onLogoChange={setLogoUrl}
                            onCoverChange={setCoverUrl}
                            onSave={group ? saveBrandImages : undefined}
                            onError={(message) => {
                                setImageFeedback('');
                            }}
                        />
                    </PanelCard>

                    <SerenatasPublicLinkPanel refresh={refresh} />

                    <OperatorSiteAppearanceEditor
                        value={value}
                        publicPreviewUrl={publicPreviewHref}
                        saving={saving}
                        onChange={handleChange}
                        onSave={handleSave}
                    />

                    {imageFeedback ? (
                        <PanelNotice tone="success">
                            <span className="flex items-center gap-2"><IconCheck size={15} /> {imageFeedback}</span>
                        </PanelNotice>
                    ) : null}
                </div>
            )}
        </PanelMiNegocioShell>
    );
}
