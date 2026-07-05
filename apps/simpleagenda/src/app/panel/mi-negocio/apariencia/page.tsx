'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import {
    AGENDA_BUSINESS_APARIENCIA_PAGE,
    OperatorSiteAppearanceEditor,
    PanelCard,
    PanelProfileBrandImages,
    PanelBlockHeader,
    PanelNotice,
    PanelSectionSaveFooter,
    type OperatorSiteAppearanceValue,
    agendaBusinessSubsectionShellProps,
    BUSINESS_BRAND_IMAGES_SECTION,
    businessBrandImageSavedMessage,
} from '@simple/ui/panel';
import {
    DEFAULT_OPERATOR_SITE_ACCENT,
    DEFAULT_OPERATOR_SITE_COLOR_MODE,
    DEFAULT_OPERATOR_SITE_LAYOUT,
    normalizeOperatorSiteAccent,
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteLayout,
} from '@simple/utils';
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import { AgendaPublicLinkPanel } from '@/components/panel/agenda-public-link-panel';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import { fetchAgendaProfile, saveAgendaProfile, uploadAvatar } from '@/lib/agenda-api';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app').replace(/\/$/, '');

export default function AparienciaPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [brandSaving, setBrandSaving] = useState(false);
    const [imageFeedback, setImageFeedback] = useState('');
    const [value, setValue] = useState<OperatorSiteAppearanceValue>({
        layout: DEFAULT_OPERATOR_SITE_LAYOUT,
        colorMode: DEFAULT_OPERATOR_SITE_COLOR_MODE,
        accentColor: DEFAULT_OPERATOR_SITE_ACCENT,
    });
    const [baseline, setBaseline] = useState<OperatorSiteAppearanceValue>({
        layout: DEFAULT_OPERATOR_SITE_LAYOUT,
        colorMode: DEFAULT_OPERATOR_SITE_COLOR_MODE,
        accentColor: DEFAULT_OPERATOR_SITE_ACCENT,
    });
    const [saved, setSaved] = useState(false);
    const [slug, setSlug] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [saveError, setSaveError] = useState('');
    const avatarRef = useRef(avatarUrl);
    const coverRef = useRef(coverUrl);
    avatarRef.current = avatarUrl;
    coverRef.current = coverUrl;

    useEffect(() => {
        void (async () => {
            const profile = await fetchAgendaProfile();
            if (profile) {
                const appearance = {
                    layout: normalizeOperatorSiteLayout(profile.operatorSiteLayout),
                    colorMode: normalizeOperatorSiteColorMode(profile.operatorSiteColorMode),
                    accentColor: normalizeOperatorSiteAccent(profile.operatorSiteAccentColor),
                };
                setValue(appearance);
                setBaseline(appearance);
                setSlug(profile.slug ?? null);
                setDisplayName(profile.displayName ?? '');
                setAvatarUrl(profile.avatarUrl ?? '');
                setCoverUrl(profile.coverUrl ?? '');
            }
            setLoading(false);
        })();
    }, []);

    const persistAppearance = useCallback(async (next: OperatorSiteAppearanceValue): Promise<OperatorSiteAppearanceValue> => {
        setSaveError('');
        const result = await saveAgendaProfile({
            operatorSiteLayout: next.layout,
            operatorSiteColorMode: next.colorMode,
            operatorSiteAccentColor: next.accentColor,
        });
        if (!result.ok) {
            const message = result.error ?? 'No se pudo guardar la apariencia.';
            setSaveError(message);
            throw new Error(message);
        }
        const saved = result.profile
            ? {
                layout: normalizeOperatorSiteLayout(result.profile.operatorSiteLayout),
                colorMode: normalizeOperatorSiteColorMode(result.profile.operatorSiteColorMode),
                accentColor: normalizeOperatorSiteAccent(result.profile.operatorSiteAccentColor),
            }
            : next;
        setValue(saved);
        return saved;
    }, []);

    const persistBrandImages = useCallback(async (
        newAvatarUrl: string | null,
        newCoverUrl: string | null,
        kind: 'logo' | 'cover',
    ) => {
        setBrandSaving(true);
        setSaveError('');
        const result = await saveAgendaProfile({
            avatarUrl: newAvatarUrl ?? '',
            coverUrl: newCoverUrl ?? '',
        });
        setBrandSaving(false);
        if (!result.ok) {
            setSaveError(result.error ?? 'No pudimos guardar la imagen.');
            return;
        }
        setImageFeedback(businessBrandImageSavedMessage(kind));
        window.setTimeout(() => setImageFeedback(''), 3000);
    }, []);

    const hasChanges = useMemo(
        () => JSON.stringify(value) !== JSON.stringify(baseline),
        [value, baseline],
    );

    const handleChange = (next: OperatorSiteAppearanceValue) => {
        setValue(next);
        setSaved(false);
        setSaveError('');
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError('');
        setSaved(false);
        try {
            const saved = await persistAppearance(value);
            setBaseline(saved);
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2500);
        } catch {
            // persistAppearance already sets saveError
        } finally {
            setSaving(false);
        }
    };

    const publicPreviewHref = slug ? `${APP_URL}/${slug}` : null;

    return (
        <AgendaMiNegocioShell
            {...agendaBusinessSubsectionShellProps('apariencia')}
            tabs={businessSectionTabs}
            title={AGENDA_BUSINESS_APARIENCIA_PAGE.title}
            description={AGENDA_BUSINESS_APARIENCIA_PAGE.description}
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
                        <PanelProfileBrandImages
                            previewVariant="profile-page"
                            displayName={displayName}
                            logoUrl={avatarUrl || null}
                            coverUrl={coverUrl || null}
                            previewHref={publicPreviewHref}
                            disabled={brandSaving}
                            onLogoChange={(url) => {
                                setAvatarUrl(url);
                                void persistBrandImages(url, coverRef.current || null, 'logo');
                            }}
                            onCoverChange={(url) => {
                                setCoverUrl(url);
                                void persistBrandImages(avatarRef.current || null, url, 'cover');
                            }}
                            onUploadLogo={async (_file, croppedBlob) => {
                                const uploadFile = new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
                                const result = await uploadAvatar(uploadFile);
                                if (!result.ok || !result.url) {
                                    throw new Error(result.error ?? 'Error al subir el logo.');
                                }
                                return { url: result.url };
                            }}
                            onUploadCover={async (_file, croppedBlob) => {
                                const uploadFile = new File([croppedBlob], 'cover.webp', { type: 'image/webp' });
                                const result = await uploadAvatar(uploadFile);
                                if (!result.ok || !result.url) {
                                    throw new Error(result.error ?? 'Error al subir la imagen.');
                                }
                                return { url: result.url };
                            }}
                            onError={(message) => setSaveError(message)}
                        />
                    </PanelCard>

                    <AgendaPublicLinkPanel />

                    <OperatorSiteAppearanceEditor
                        value={value}
                        publicPreviewUrl={publicPreviewHref}
                        saving={saving}
                        onChange={handleChange}
                        onSave={handleSave}
                        hideSaveButton
                    />

                    {imageFeedback ? (
                        <PanelNotice tone="success">
                            <span className="flex items-center gap-2"><IconCheck size={15} /> {imageFeedback}</span>
                        </PanelNotice>
                    ) : null}

                    <PanelSectionSaveFooter
                        saving={saving}
                        saved={saved}
                        saveError={saveError || null}
                        disabled={!hasChanges || brandSaving}
                        onSave={handleSave}
                    />
                </div>
            )}
        </AgendaMiNegocioShell>
    );
}
