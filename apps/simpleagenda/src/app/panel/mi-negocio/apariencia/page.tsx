'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { IconArrowRight, IconCheck, IconLoader2, IconLock } from '@tabler/icons-react';
import {
    OperatorSiteAppearanceEditor,
    PanelCard,
    PanelProfileBrandImages,
    PanelBlockHeader,
    PanelNotice,
    PanelSectionSaveFooter,
    type OperatorSiteAppearanceValue,
    businessBrandImageSavedMessage,
} from '@simple/ui/panel';
import {
    DEFAULT_OPERATOR_SITE_COLOR_MODE,
    DEFAULT_OPERATOR_SITE_LAYOUT,
    defaultOperatorSiteAccentEditorValue,
    parseOperatorSiteAccent,
    serializeOperatorSiteAccent,
    normalizeOperatorSiteLayout,
    normalizeOperatorSiteColorMode,
    resolveOperatorSiteIndustry,
} from '@simple/utils';
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import { AgendaPublicLinkPanel } from '@/components/panel/agenda-public-link-panel';
import { AgendaLandingBuilder } from '@/components/panel/agenda-landing-builder';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import { fetchAgendaProfile, hasAgendaFullAccess, saveAgendaProfile, uploadAvatar, type AgendaProfile } from '@/lib/agenda-api';
import { AGENDA_OPERATOR_SUBTYPES } from '@simple/utils';

function profileRubricLabel(profile: AgendaProfile): string | null {
    const custom = profile.profession?.trim();
    if (custom) return custom;
    if (!profile.operatorSubtype) return null;
    const option = Object.values(AGENDA_OPERATOR_SUBTYPES)
        .flat()
        .find((item) => item.id === profile.operatorSubtype);
    return option?.label ?? null;
}

function profileArchetype(profile: AgendaProfile): 'health' | 'beauty' | 'learning' | 'general' {
    const industry = resolveOperatorSiteIndustry(`${profile.operatorSubtype ?? ''} ${profile.profession ?? ''}`).id;
    if (industry === 'health') return 'health';
    if (industry === 'beauty') return 'beauty';
    if (industry === 'fitness' || industry === 'education') return 'learning';
    return 'general';
}

export default function AparienciaPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [brandSaving, setBrandSaving] = useState(false);
    const [imageFeedback, setImageFeedback] = useState('');
    const [value, setValue] = useState<OperatorSiteAppearanceValue>({
        layout: DEFAULT_OPERATOR_SITE_LAYOUT,
        colorMode: DEFAULT_OPERATOR_SITE_COLOR_MODE,
        accent: defaultOperatorSiteAccentEditorValue(),
    });
    const [baseline, setBaseline] = useState<OperatorSiteAppearanceValue>({
        layout: DEFAULT_OPERATOR_SITE_LAYOUT,
        colorMode: DEFAULT_OPERATOR_SITE_COLOR_MODE,
        accent: defaultOperatorSiteAccentEditorValue(),
    });
    const [saved, setSaved] = useState(false);
    const [canCustomizePage, setCanCustomizePage] = useState(false);
    const [agendaProfile, setAgendaProfile] = useState<AgendaProfile | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [rubricLabel, setRubricLabel] = useState<string | null>(null);
    const [layoutArchetype, setLayoutArchetype] = useState<'health' | 'beauty' | 'learning' | 'general'>('general');
    const [previewAppearance, setPreviewAppearance] = useState(value);
    const [previewRevision, setPreviewRevision] = useState(0);
    const [saveError, setSaveError] = useState('');
    const avatarRef = useRef(avatarUrl);
    const coverRef = useRef(coverUrl);
    avatarRef.current = avatarUrl;
    coverRef.current = coverUrl;

    useEffect(() => {
        void (async () => {
            const profile = await fetchAgendaProfile();
            if (profile) {
                setAgendaProfile(profile);
                const appearance = {
                    layout: normalizeOperatorSiteLayout(profile.operatorSiteLayout),
                    colorMode: normalizeOperatorSiteColorMode(profile.operatorSiteColorMode),
                    accent: parseOperatorSiteAccent(profile.operatorSiteAccentColor),
                };
                setValue(appearance);
                setBaseline(appearance);
                setCanCustomizePage(hasAgendaFullAccess(profile));
                setDisplayName(profile.displayName ?? '');
                setAvatarUrl(profile.avatarUrl ?? '');
                setCoverUrl(profile.coverUrl ?? '');
                setRubricLabel(profileRubricLabel(profile));
                setLayoutArchetype(profileArchetype(profile));
            }
            setLoading(false);
        })();
    }, []);

    useEffect(() => {
        const timeout = window.setTimeout(() => setPreviewAppearance(value), 250);
        return () => window.clearTimeout(timeout);
    }, [value]);

    const buildPreviewUrl = useCallback((appearance: OperatorSiteAppearanceValue, revision?: number, draft = false) => {
        const params = new URLSearchParams({
            layout: appearance.layout,
            colorMode: appearance.colorMode,
            accent: serializeOperatorSiteAccent(appearance.accent),
        });
        if (revision !== undefined) params.set('rev', String(revision));
        if (draft) params.set('draft', '1');
        return `/vista-previa?${params.toString()}`;
    }, []);

    const previewUrl = useMemo(
        () => buildPreviewUrl(previewAppearance, previewRevision, true),
        [buildPreviewUrl, previewAppearance, previewRevision],
    );

    const persistAppearance = useCallback(async (next: OperatorSiteAppearanceValue): Promise<OperatorSiteAppearanceValue> => {
        setSaveError('');
        const result = await saveAgendaProfile({
            operatorSiteLayout: next.layout,
            operatorSiteColorMode: next.colorMode,
            operatorSiteAccentColor: serializeOperatorSiteAccent(next.accent),
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
                accent: parseOperatorSiteAccent(result.profile.operatorSiteAccentColor),
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
        setPreviewRevision((revision) => revision + 1);
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

    return (
        <AgendaMiNegocioShell
            activeKey="pagina"
            tabs={businessSectionTabs}
            title="Página pública"
            description={canCustomizePage
                ? 'Administra tu enlace, contenido y diseño desde un solo lugar.'
                : 'Administra tu link público para que tus clientes puedan reservar. La personalización visual está disponible con Pro.'}
        >
            {loading ? (
                <div className="flex items-center gap-2 text-sm text-fg-muted">
                    <IconLoader2 size={14} className="animate-spin" /> Cargando...
                </div>
            ) : (
                <div className="grid min-w-0 gap-7">
                    <section id="agenda-public-link" className="scroll-mt-24 space-y-3">
                        <AgendaPublicLinkPanel previewUrl={canCustomizePage ? previewUrl : undefined} />
                        <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-fg">
                                Dominio propio · Pro+
                                <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-medium text-fg-muted">Próximamente</span>
                            </summary>
                            <p className="mt-3 border-t border-[var(--border)] pt-3 text-xs leading-5 text-fg-muted">
                                La conexión de dominios y la verificación DNS aún no están habilitadas. Tu enlace de SimpleAgenda seguirá funcionando.
                            </p>
                        </details>
                    </section>

                    {canCustomizePage ? (
                        <>
                            <section id="agenda-page-content" className="scroll-mt-24 space-y-4 border-t border-[var(--border)] pt-6">
                                <PanelBlockHeader
                                    title="Contenido de tu página"
                                    description="Genera la propuesta y revisa los textos que verán tus clientes."
                                    className="mb-0"
                                />
                                {agendaProfile ? (
                                    <AgendaLandingBuilder
                                        profile={agendaProfile}
                                        onPreviewUpdate={() => setPreviewRevision((revision) => revision + 1)}
                                    />
                                ) : null}
                            </section>

                            <section id="agenda-page-design" className="scroll-mt-24 space-y-4 border-t border-[var(--border)] pt-6">
                                <PanelBlockHeader
                                    title="Diseño y marca"
                                    description="Elige la estructura, los colores y las imágenes de tu página."
                                    className="mb-0"
                                />
                                <OperatorSiteAppearanceEditor
                                    value={value}
                                    rubricLabel={rubricLabel}
                                    archetype={layoutArchetype}
                                    simpleMode
                                    brandImages={(
                                        <>
                                            <PanelBlockHeader
                                                title="Logo y portada"
                                                description="Sube las imágenes que identifican tu negocio."
                                                className="mb-0"
                                            />
                                            <PanelProfileBrandImages
                                                compactControls
                                                displayName={displayName}
                                                logoUrl={avatarUrl || null}
                                                coverUrl={coverUrl || null}
                                                disabled={brandSaving}
                                                onLogoChange={(url) => {
                                                    setAvatarUrl(url);
                                                    void persistBrandImages(url, coverRef.current || null, 'logo');
                                                }}
                                                onCoverChange={(url) => {
                                                    setCoverUrl(url);
                                                    void persistBrandImages(avatarRef.current || null, url, 'cover');
                                                }}
                                                onUploadLogo={async (file, croppedBlob) => {
                                                    const uploadFile = croppedBlob === file
                                                        ? file
                                                        : new File([croppedBlob], 'logo.webp', { type: 'image/webp' });
                                                    const result = await uploadAvatar(uploadFile, 'logo');
                                                    if (!result.ok || !result.url) {
                                                        throw new Error(result.error ?? 'Error al subir el logo.');
                                                    }
                                                    return { url: result.url };
                                                }}
                                                onUploadCover={async (file, croppedBlob) => {
                                                    const uploadFile = croppedBlob === file
                                                        ? file
                                                        : new File([croppedBlob], 'cover.webp', { type: 'image/webp' });
                                                    const result = await uploadAvatar(uploadFile, 'cover');
                                                    if (!result.ok || !result.url) {
                                                        throw new Error(result.error ?? 'Error al subir la imagen.');
                                                    }
                                                    return { url: result.url };
                                                }}
                                                onError={(message) => setSaveError(message)}
                                            />
                                        </>
                                    )}
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
                            </section>
                        </>
                    ) : (
                        <PanelCard size="lg" className="border border-[var(--border)] bg-[var(--bg-subtle)]">
                            <div className="flex items-start gap-4">
                                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-[var(--accent)]">
                                    <IconLock size={19} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <PanelBlockHeader
                                        title="Diseña una página más completa con Pro"
                                        description="Tu link de reservas sigue disponible en Gratis. Con Pro puedes crear una página de negocio con IA y personalizar su contenido, imágenes, estructura y colores."
                                        className="mb-0"
                                    />
                                    <Link
                                        href="/panel/mi-cuenta/suscripcion"
                                        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90"
                                    >
                                        Conocer Pro
                                        <IconArrowRight size={16} aria-hidden="true" />
                                    </Link>
                                </div>
                            </div>
                        </PanelCard>
                    )}
                </div>
            )}
        </AgendaMiNegocioShell>
    );
}
