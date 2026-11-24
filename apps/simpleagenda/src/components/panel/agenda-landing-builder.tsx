'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    IconArrowDown,
    IconArrowUp,
    IconCheck,
    IconChevronDown,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconExternalLink,
    IconLayout,
    IconLoader2,
    IconMoon,
    IconPalette,
    IconPhoto,
    IconPlus,
    IconSearch,
    IconSparkles,
    IconSun,
    IconTrash,
} from '@tabler/icons-react';
import { AvatarUpload, type AvatarUploadHandle } from '@simple/ui';
import { PanelButton, PanelCard, PanelNotice, PanelSwitch } from '@simple/ui/panel';
import {
    emptyOperatorSiteLandingConfig,
    normalizeOperatorSiteAccentHex,
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteLayout,
    OPERATOR_SITE_ACCENT_OPTIONS,
    OPERATOR_SITE_LANDING_SECTIONS,
    operatorSiteAccentCssValue,
    RAW_IMAGE_MAX_SIZE_KB,
    resolveAppMediaUrl,
    resolveOperatorSiteIndustry,
    type OperatorSiteLandingAppearance,
    type OperatorSiteLandingConfig,
    type OperatorSiteLandingContent,
    type OperatorSiteLandingGenerationTarget,
    type OperatorSiteLandingSection,
    type OperatorSiteLandingTone,
    type OperatorSiteLayout,
} from '@simple/utils';
import { AgendaPublicLinkPanel } from './agenda-public-link-panel';
import {
    fetchAgendaAvailability,
    fetchAgendaServices,
    generateAgendaLandingPage,
    publishAgendaLandingDraft,
    saveAgendaLandingDraft,
    uploadAvatar,
    type AgendaProfile,
    type AgendaService,
} from '@/lib/agenda-api';

const EMPTY_CONTENT: OperatorSiteLandingContent = {
    heroHeadline: '',
    heroSubheadline: '',
    aboutTitle: '',
    aboutText: '',
    highlightsTitle: '',
    highlights: [],
    seoTitle: '',
    seoDescription: '',
};

type StudioTab = 'design' | 'copy' | 'sections';

const TONES: Array<{ value: OperatorSiteLandingTone; label: string }> = [
    { value: 'profesional', label: 'Profesional' },
    { value: 'cercano', label: 'Cercano' },
    { value: 'sereno', label: 'Sereno' },
    { value: 'premium', label: 'Premium' },
    { value: 'dinamico', label: 'Dinámico' },
];

const GENERATION_TARGETS: Array<{ value: OperatorSiteLandingGenerationTarget; label: string }> = [
    { value: 'all', label: 'Todo el contenido' },
    { value: 'hero', label: 'Portada' },
    { value: 'about', label: 'Presentación' },
    { value: 'highlights', label: 'Puntos destacados' },
    { value: 'seo', label: 'Vista en Google' },
];

const SECTION_LABELS: Record<OperatorSiteLandingSection, string> = {
    about: 'Presentación',
    highlights: 'Puntos destacados',
    location: 'Lugares de atención',
    contact: 'Datos de contacto',
};

const LAYOUT_OPTIONS: Array<{
    id: OperatorSiteLayout;
    name: string;
    description: string;
}> = [
    {
        id: 'booking',
        name: 'Reserva directa',
        description: 'Portada con tus servicios listos para agendar al instante.',
    },
    {
        id: 'portfolio',
        name: 'Portada visual',
        description: 'Banner amplio, vitrina horizontal y enfoque editorial.',
    },
    {
        id: 'studio',
        name: 'Perfil compacto',
        description: 'Encabezado limpio y grilla moderna tipo tarjeta.',
    },
];

const fieldClassName = 'mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-fg outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]';
const actionClassName = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm font-semibold text-fg transition hover:bg-[var(--bg-subtle)] disabled:opacity-50';

function Field({ label, value, onChange, maxLength, rows, placeholder, hint }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    rows?: number;
    placeholder?: string;
    hint?: string;
}) {
    return (
        <label className="block text-sm font-medium text-fg">
            <span className="flex items-center justify-between gap-2">
                <span>{label}</span>
                <span className="text-[11px] font-normal text-fg-muted">{value.length}/{maxLength}</span>
            </span>
            {rows
                ? <textarea className={fieldClassName} value={value} maxLength={maxLength} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
                : <input className={fieldClassName} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
            {hint ? <span className="mt-1 block text-xs font-normal text-fg-muted">{hint}</span> : null}
        </label>
    );
}

function EditorDetails({ title, children }: { title: string; children: ReactNode }) {
    return (
        <details className="group rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)]/50">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 text-sm font-semibold text-fg">
                {title}
                <IconChevronDown size={16} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-4 border-t border-[var(--border)] p-3.5">{children}</div>
        </details>
    );
}

function LayoutSchematic({ layout, accent }: { layout: OperatorSiteLayout; accent: string }) {
    if (layout === 'booking') {
        return (
            <div className="grid h-20 w-full grid-cols-[1.2fr_1fr] gap-2 rounded-lg border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
                <div className="flex flex-col justify-center gap-1.5">
                    <div className="h-3 w-3 rounded-full" style={{ background: accent }} />
                    <div className="h-2 w-4/5 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="h-1.5 w-3/5 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
                <div className="flex flex-col justify-between rounded-md border border-zinc-200 p-1.5 dark:border-zinc-700">
                    <div className="h-1.5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-700" />
                    <div className="space-y-1">
                        <div className="h-2 rounded bg-zinc-100 dark:bg-zinc-800" />
                        <div className="h-2 rounded" style={{ background: accent, opacity: 0.85 }} />
                    </div>
                </div>
            </div>
        );
    }
    if (layout === 'portfolio') {
        return (
            <div className="flex h-20 w-full flex-col justify-between rounded-lg border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
                <div className="flex h-9 items-end justify-between rounded-md p-1.5" style={{ background: `${accent}22` }}>
                    <div className="space-y-1">
                        <div className="h-2 w-16 rounded bg-zinc-800/80 dark:bg-white/80" />
                        <div className="h-1 w-10 rounded bg-zinc-500/60 dark:bg-white/50" />
                    </div>
                    <div className="h-3 w-8 rounded-full" style={{ background: accent }} />
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    <div className="h-5 rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-5 rounded bg-zinc-100 dark:bg-zinc-800" />
                    <div className="h-5 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
            </div>
        );
    }
    return (
        <div className="flex h-20 w-full flex-col justify-between rounded-lg border border-black/10 bg-white p-2 dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1.5 dark:border-zinc-700">
                <div className="h-4 w-4 shrink-0 rounded-full" style={{ background: accent }} />
                <div className="flex-1 space-y-1">
                    <div className="h-1.5 w-14 rounded bg-zinc-300 dark:bg-zinc-600" />
                    <div className="h-1 w-9 rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
                <div className="h-2.5 w-7 rounded-full" style={{ background: accent }} />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
                <div className="h-6 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-6 rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
        </div>
    );
}

function LiveSiteMiniPreview({
    profile,
    content,
    appearance,
    services,
    openingPreview,
    onOpenFullPreview,
}: {
    profile: AgendaProfile;
    content: OperatorSiteLandingContent;
    appearance: OperatorSiteLandingAppearance;
    services: AgendaService[];
    openingPreview: boolean;
    onOpenFullPreview: () => void;
}) {
    const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');
    const accentHex = appearance.accentColor === 'auto'
        ? '#6D9F32'
        : operatorSiteAccentCssValue(appearance.accentColor);
    const isDark = appearance.colorMode === 'dark';
    const coverSrc = resolveAppMediaUrl(appearance.coverUrl);
    const avatarSrc = resolveAppMediaUrl(profile.avatarUrl);
    const headline = content.heroHeadline.trim() || profile.displayName?.trim() || 'Tu negocio';
    const subheadline = content.heroSubheadline.trim()
        || [profile.profession?.trim(), profile.city?.trim()].filter(Boolean).join(' · ')
        || 'Atención profesional con reserva online';
    const bioPreview = content.aboutText.trim() || profile.bio?.trim() || '';
    const highlights = content.highlights.filter((item) => item.title.trim());
    const visibleServices = services.slice(0, device === 'desktop' ? 4 : 3);
    const initials = (profile.displayName?.trim() || 'S').charAt(0).toUpperCase();
    const order = content.sectionOrder ?? OPERATOR_SITE_LANDING_SECTIONS;
    const isDesktop = device === 'desktop';
    const cardCls = isDark ? 'border-zinc-800 bg-zinc-900/70' : 'border-zinc-200 bg-zinc-50/70';
    const mutedCls = isDark ? 'text-zinc-400' : 'text-zinc-500';

    const avatarEl = (sizeClass = 'size-11') => (
        <div
            className={`flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-bold`}
            style={{ borderColor: accentHex, background: isDark ? '#18181b' : '#ffffff', color: accentHex }}
        >
            {avatarSrc ? <img src={avatarSrc} alt="" className="h-full w-full object-cover" /> : initials}
        </div>
    );

    const servicesBlock = (
        <div>
            <p className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wider ${mutedCls}`}>
                Servicios disponibles
            </p>
            {visibleServices.length > 0 ? (
                <div className={appearance.layout === 'portfolio' && isDesktop ? 'grid grid-cols-2 gap-2' : 'space-y-1.5'}>
                    {visibleServices.map((svc) => (
                        <div key={svc.id} className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 ${cardCls}`}>
                            <div className="min-w-0">
                                <p className="truncate text-[11px] font-semibold">{svc.name}</p>
                                <p className={`text-[10px] ${mutedCls}`}>{svc.durationMinutes} min</p>
                            </div>
                            <span className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold text-white" style={{ background: accentHex }}>
                                Reservar
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`rounded-xl border border-dashed px-3 py-2 text-[11px] ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'}`}>
                    Agrega un servicio para mostrarlo aquí.
                </div>
            )}
        </div>
    );

    return (
        <div className="rounded-2xl border border-(--border) bg-(--surface) p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-(--border) bg-(--bg-subtle) p-1">
                    <button
                        type="button"
                        onClick={() => setDevice('mobile')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            device === 'mobile' ? 'bg-(--surface) text-fg shadow-xs' : 'text-fg-muted hover:text-fg'
                        }`}
                    >
                        <IconDeviceMobile size={14} /> Móvil
                    </button>
                    <button
                        type="button"
                        onClick={() => setDevice('desktop')}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            device === 'desktop' ? 'bg-(--surface) text-fg shadow-xs' : 'text-fg-muted hover:text-fg'
                        }`}
                    >
                        <IconDeviceDesktop size={14} /> Web
                    </button>
                </div>
                <button
                    type="button"
                    disabled={openingPreview}
                    onClick={onOpenFullPreview}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent-ink hover:underline disabled:opacity-50"
                >
                    {openingPreview ? 'Abriendo…' : 'Pantalla completa'} <IconExternalLink size={12} />
                </button>
            </div>

            <div className="overflow-hidden">
                <div
                    className={`mx-auto overflow-hidden rounded-2xl border transition-all ${
                        device === 'mobile'
                            ? 'max-w-[295px]'
                            : 'w-full xl:w-[620px] xl:[zoom:0.528]'
                    } ${isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'}`}
                >
                    {/* Browser chrome bar */}
                    <div
                        className={`flex items-center gap-1.5 border-b px-3 py-2 text-[10px] ${
                            isDark ? 'border-zinc-800 bg-zinc-900 text-zinc-400' : 'border-zinc-100 bg-zinc-50 text-zinc-500'
                        }`}
                    >
                        <span className="size-2 rounded-full bg-red-400/70" />
                        <span className="size-2 rounded-full bg-amber-400/70" />
                        <span className="size-2 rounded-full bg-emerald-400/70" />
                        <span className="ml-2 truncate font-mono">simpleagenda.app/{profile.slug || 'tu-link'}</span>
                    </div>

                    {/* Layout 1: Portada visual — banner limpio superior + tarjeta identidad */}
                    {appearance.layout === 'portfolio' ? (
                        <div>
                            <div
                                className="relative h-28 w-full overflow-hidden"
                                style={{
                                    background: coverSrc
                                        ? undefined
                                        : `linear-gradient(135deg, ${accentHex}44 0%, ${accentHex}16 100%)`,
                                }}
                            >
                                {coverSrc ? <img src={coverSrc} alt="" className="h-full w-full object-cover" /> : null}
                            </div>
                            <div className="-mt-6 relative z-10 px-4 pb-3">
                                <div className="flex items-end justify-between gap-2">
                                    {avatarEl('size-12')}
                                    <span className="rounded-full px-3 py-1 text-[10px] font-semibold text-white shadow-xs" style={{ background: accentHex }}>
                                        Reservar cita
                                    </span>
                                </div>
                                <p className="mt-2 truncate text-xs font-bold leading-snug">{headline}</p>
                                <p className={`truncate text-[11px] ${mutedCls}`}>{subheadline}</p>
                            </div>
                        </div>
                    ) : appearance.layout === 'studio' ? (
                        /* Layout 3: Perfil compacto — banda superior sutil + tarjeta compacta */
                        <div className="p-3.5 pb-2">
                            {coverSrc ? (
                                <div className="mb-2.5 h-16 w-full overflow-hidden rounded-xl">
                                    <img src={coverSrc} alt="" className="h-full w-full object-cover" />
                                </div>
                            ) : null}
                            <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${cardCls}`}>
                                {avatarEl('size-10')}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold leading-snug">{headline}</p>
                                    <p className={`truncate text-[10px] ${mutedCls}`}>{subheadline}</p>
                                </div>
                                <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white" style={{ background: accentHex }}>
                                    Reservar
                                </span>
                            </div>
                        </div>
                    ) : (
                        /* Layout 2: Reserva directa */
                        <div
                            className="relative overflow-hidden p-4"
                            style={{
                                background: coverSrc
                                    ? undefined
                                    : `linear-gradient(135deg, ${accentHex}20 0%, ${accentHex}06 100%)`,
                            }}
                        >
                            {coverSrc ? (
                                <img src={coverSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
                            ) : null}
                            <div className={`relative z-10 grid gap-3 ${isDesktop ? 'grid-cols-[1.15fr_1fr] items-center' : ''}`}>
                                <div className="flex items-center gap-3">
                                    {avatarEl('size-11')}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-bold leading-snug">{headline}</p>
                                        <p className={`truncate text-[11px] ${mutedCls}`}>{subheadline}</p>
                                    </div>
                                </div>
                                {isDesktop ? servicesBlock : null}
                            </div>
                        </div>
                    )}

                    {/* Body */}
                    <div className="space-y-3 p-3.5 text-xs">
                        {!(appearance.layout === 'booking' && isDesktop) ? servicesBlock : null}

                        {order.map((sectionId) => {
                            if (content.sections?.[sectionId] === false) return null;
                            if (sectionId === 'about' && bioPreview) {
                                return (
                                    <div key={sectionId} className="space-y-0.5">
                                        {content.aboutTitle.trim() ? (
                                            <p className="text-[10px] font-semibold">{content.aboutTitle.trim()}</p>
                                        ) : null}
                                        <p className={`line-clamp-2 text-[11px] leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                            {bioPreview}
                                        </p>
                                    </div>
                                );
                            }
                            if (sectionId === 'highlights' && highlights.length > 0) {
                                return (
                                    <div key={sectionId} className="grid gap-1.5">
                                        {highlights.slice(0, 2).map((h, i) => (
                                            <div
                                                key={i}
                                                className={`rounded-lg border-l-2 px-2.5 py-1.5 ${isDark ? 'bg-zinc-900 text-zinc-300' : 'bg-zinc-50 text-zinc-700'}`}
                                                style={{ borderLeftColor: accentHex }}
                                            >
                                                <p className="truncate text-[11px] font-semibold">{h.title}</p>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            if (sectionId === 'location' && (profile.city || profile.region || profile.servesOnline)) {
                                return (
                                    <div key={sectionId} className={`rounded-xl border px-2.5 py-2 text-[10px] ${cardCls}`}>
                                        <p className="font-semibold">Lugares de atención</p>
                                        <p className={`truncate ${mutedCls}`}>
                                            {[profile.servesOnline ? 'Online' : null, profile.city || profile.region].filter(Boolean).join(' · ')}
                                        </p>
                                    </div>
                                );
                            }
                            if (sectionId === 'contact' && (profile.publicPhone || profile.publicEmail || profile.publicWhatsapp)) {
                                return (
                                    <div key={sectionId} className={`rounded-xl border px-2.5 py-2 text-[10px] ${cardCls}`}>
                                        <p className="font-semibold">Contacto</p>
                                        <p className={`truncate ${mutedCls}`}>
                                            {profile.publicWhatsapp || profile.publicPhone || profile.publicEmail}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function publishedAppearance(profile: AgendaProfile): OperatorSiteLandingAppearance {
    return {
        layout: normalizeOperatorSiteLayout(profile.operatorSiteLayout),
        colorMode: normalizeOperatorSiteColorMode(profile.operatorSiteColorMode),
        accentColor: profile.operatorSiteAccentColor || 'teal',
        avatarUrl: profile.avatarUrl,
        coverUrl: profile.coverUrl,
    };
}

export function AgendaLandingBuilder({ profile, onPublished }: {
    profile: AgendaProfile;
    onPublished: (changes: Partial<AgendaProfile>) => void;
}) {
    const [activeTab, setActiveTab] = useState<StudioTab>('design');
    const [config, setConfig] = useState<OperatorSiteLandingConfig>(
        () => profile.operatorSiteLandingConfig ?? emptyOperatorSiteLandingConfig(),
    );
    const [brief, setBrief] = useState(config.brief);
    const [content, setContent] = useState(config.draft ?? config.published ?? EMPTY_CONTENT);
    const [appearance, setAppearance] = useState(config.draftAppearance ?? publishedAppearance(profile));
    const [overrideBio, setOverrideBio] = useState(() => Boolean(
        (config.draft?.aboutText ?? config.published?.aboutText)?.trim(),
    ));
    const [readiness, setReadiness] = useState<{
        serviceCount: number;
        services: AgendaService[];
        hasSchedule: boolean;
    } | null>(null);
    const [readinessAttempt, setReadinessAttempt] = useState(0);
    const [readinessFailed, setReadinessFailed] = useState(false);
    const [operation, setOperation] = useState<'generate' | 'save' | 'publish' | 'upload' | null>(null);
    const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [contentNotice, setContentNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [uploadError, setUploadError] = useState('');
    const coverUploadRef = useRef<AvatarUploadHandle>(null);
    const resolvedCoverUrl = resolveAppMediaUrl(appearance.coverUrl);
    const [confirmGenerate, setConfirmGenerate] = useState(false);
    const [target, setTarget] = useState<OperatorSiteLandingGenerationTarget>('all');

    useEffect(() => {
        let active = true;
        void Promise.all([fetchAgendaServices(), fetchAgendaAvailability()]).then(([services, availability]) => {
            if (!active) return;
            const bookable = services.filter((service) => service.isActive && (!service.kind || service.kind === 'appointment'));
            setReadiness({
                serviceCount: bookable.length,
                services: bookable,
                hasSchedule: availability.alwaysOpen || availability.rules.some((rule) => rule.isActive && rule.startTime && rule.endTime),
            });
            setReadinessFailed(false);
        }).catch(() => {
            if (active) setReadinessFailed(true);
        });
        return () => { active = false; };
    }, [profile.id, readinessAttempt]);

    const baselineAppearance = config.draftAppearance ?? publishedAppearance(profile);
    const baselineContent = config.draft ?? config.published ?? EMPTY_CONTENT;
    const comparableAppearance = { ...appearance, avatarUrl: profile.avatarUrl };
    const comparableBaselineAppearance = { ...baselineAppearance, avatarUrl: profile.avatarUrl };
    const hasChanges = JSON.stringify([content, brief, comparableAppearance]) !== JSON.stringify([baselineContent, config.brief, comparableBaselineAppearance]);
    const hasIdentity = Boolean(profile.displayName?.trim() && profile.profession?.trim());
    const hasServices = (readiness?.serviceCount ?? 0) > 0;
    const canPublish = profile.isPublished || Boolean(profile.slug && hasIdentity && hasServices && readiness?.hasSchedule);
    const mutationContext = { profileId: profile.id, revision: config.draftRevision ?? null };
    const buildPreviewUrl = (revision?: string | null) => {
        const params = new URLSearchParams({ draft: '1', profile: profile.id });
        if (revision) params.set('rev', revision);
        return `/vista-previa?${params}`;
    };

    const customColor = normalizeOperatorSiteAccentHex(appearance.accentColor);
    const accentOption = OPERATOR_SITE_ACCENT_OPTIONS.find((option) => option.id === appearance.accentColor);
    const accentSelection = customColor ? 'custom' : accentOption && accentOption.id !== 'teal' ? accentOption.id : 'auto';
    const currentAccentHex = accentSelection === 'auto' ? '#6D9F32' : operatorSiteAccentCssValue(appearance.accentColor);

    const industry = resolveOperatorSiteIndustry(`${profile.operatorSubtype ?? ''} ${profile.profession ?? ''}`).id;
    const recommendedLayout: OperatorSiteLayout = industry === 'beauty' ? 'portfolio' : industry === 'fitness' || industry === 'education' ? 'studio' : 'booking';
    const hasSomeCopy = Object.values(content).some((value) => (typeof value === 'string' || Array.isArray(value)) && value.length > 0);
    const sectionOrder = content.sectionOrder ?? OPERATOR_SITE_LANDING_SECTIONS;

    function changeContent<K extends keyof OperatorSiteLandingContent>(field: K, value: OperatorSiteLandingContent[K]) {
        setContent((current) => ({ ...current, [field]: value }));
        setNotice(null);
        setContentNotice(null);
    }

    function changeAppearance<K extends keyof OperatorSiteLandingAppearance>(field: K, value: OperatorSiteLandingAppearance[K]) {
        setAppearance((current) => ({ ...current, [field]: value }));
        setNotice(null);
    }

    function moveSection(index: number, direction: -1 | 1) {
        const order = [...sectionOrder];
        const destination = index + direction;
        [order[index], order[destination]] = [order[destination], order[index]];
        changeContent('sectionOrder', order);
    }

    function applyDraftConfig(next: OperatorSiteLandingConfig) {
        setConfig(next);
        setBrief(next.brief);
        setContent(next.draft ?? next.published ?? EMPTY_CONTENT);
        if (next.draftAppearance) setAppearance(next.draftAppearance);
    }

    async function generate() {
        if (operation || !hasIdentity || !hasServices) return;
        setConfirmGenerate(false);
        setOperation('generate');
        setNotice(null);
        setContentNotice(null);
        const result = await generateAgendaLandingPage(brief, comparableAppearance, mutationContext, content, target);
        setOperation(null);
        if (!result.ok || !result.config?.draft) {
            setContentNotice({ tone: 'error', message: result.error ?? 'No se pudo generar la propuesta. Puedes escribirla manualmente.' });
            return;
        }
        applyDraftConfig(result.config);
        if (result.config.draft.aboutText?.trim()) {
            setOverrideBio(true);
        }
        setContentNotice({ tone: 'success', message: 'Propuesta generada. Revísala en la vista previa antes de publicar.' });
    }

    async function saveDraftOnly() {
        if (operation) return;
        setOperation('save');
        setNotice(null);
        const result = await saveAgendaLandingDraft(brief, content, comparableAppearance, mutationContext);
        setOperation(null);
        if (!result.ok || !result.config) {
            setNotice({ tone: 'error', message: result.error ?? 'No se pudo guardar el borrador.' });
            return;
        }
        applyDraftConfig(result.config);
        setNotice({ tone: 'success', message: 'Borrador guardado.' });
    }

    function discardChanges() {
        setContent(baselineContent);
        setBrief(config.brief);
        setAppearance(baselineAppearance);
        setOverrideBio(Boolean(baselineContent.aboutText?.trim()));
        setConfirmGenerate(false);
        setNotice(null);
        setContentNotice(null);
        setUploadError('');
    }

    async function openFullPreview() {
        if (operation) return;
        const previewTab = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;
        if (previewTab) previewTab.opener = null;
        let nextUrl = buildPreviewUrl(config.draftRevision);
        if (hasChanges || !config.draft) {
            setOperation('save');
            setNotice(null);
            const result = await saveAgendaLandingDraft(brief, content, comparableAppearance, mutationContext);
            setOperation(null);
            if (!result.ok || !result.config) {
                previewTab?.close();
                setNotice({ tone: 'error', message: result.error ?? 'No se pudo preparar la vista previa.' });
                return;
            }
            applyDraftConfig(result.config);
            nextUrl = buildPreviewUrl(result.config.draftRevision);
        }
        if (previewTab) {
            previewTab.location.href = nextUrl;
        } else if (typeof window !== 'undefined') {
            window.open(nextUrl, '_blank', 'noopener,noreferrer');
        }
    }

    async function saveAndPublish() {
        if (operation || !canPublish) return;
        setOperation('publish');
        setNotice(null);

        let latestRevision = config.draftRevision ?? null;
        if (hasChanges || !config.draft) {
            const draftResult = await saveAgendaLandingDraft(brief, content, comparableAppearance, {
                profileId: profile.id,
                revision: latestRevision,
            });
            if (!draftResult.ok || !draftResult.config) {
                setOperation(null);
                setNotice({ tone: 'error', message: draftResult.error ?? 'No pudimos guardar tus cambios antes de publicar.' });
                return;
            }
            applyDraftConfig(draftResult.config);
            latestRevision = draftResult.config.draftRevision ?? null;
        }

        const result = await publishAgendaLandingDraft({ profileId: profile.id, revision: latestRevision });
        setOperation(null);
        if (!result.ok || !result.config || !result.appearance) {
            setNotice({ tone: 'error', message: result.error ?? 'No se pudo publicar. El borrador sigue guardado.' });
            return;
        }
        applyDraftConfig(result.config);
        setAppearance({ ...result.appearance, avatarUrl: profile.avatarUrl });
        onPublished({
            isPublished: true,
            operatorSiteLandingConfig: result.config,
            operatorSiteLayout: result.appearance.layout,
            operatorSiteColorMode: result.appearance.colorMode,
            operatorSiteAccentColor: result.appearance.accentColor,
            coverUrl: result.appearance.coverUrl,
        });
        setNotice({ tone: 'success', message: 'Tu página web está publicada y actualizada.' });
    }

    async function upload(file: File, cropped: Blob, purpose: 'logo' | 'cover') {
        setOperation('upload');
        setUploadError('');
        try {
            const uploadFile = cropped === file ? file : new File([cropped], `${purpose}.webp`, { type: 'image/webp' });
            const result = await uploadAvatar(uploadFile, purpose);
            if (!result.ok || !result.url) throw new Error(result.error ?? 'No se pudo subir la imagen.');
            return { url: result.url };
        } finally {
            setOperation(null);
        }
    }

    const studioTabs: Array<{ id: StudioTab; label: string; icon: typeof IconPalette }> = [
        { id: 'design', label: 'Diseño y portada', icon: IconPalette },
        { id: 'copy', label: 'Textos e IA', icon: IconSparkles },
        { id: 'sections', label: 'Secciones y Google', icon: IconLayout },
    ];
    const previewUrl = buildPreviewUrl(config.draftRevision);

    const seoPreviewTitle = content.seoTitle.trim()
        || `${profile.displayName || 'Tu negocio'}${profile.profession ? ` — ${profile.profession}` : ''} | SimpleAgenda`;
    const seoPreviewDesc = content.seoDescription.trim()
        || content.aboutText.trim()
        || profile.bio?.trim()
        || `Reserva tu hora online con ${profile.displayName || 'este profesional'}. Disponibilidad en tiempo real.`;

    return (
        <div className="grid min-w-0 gap-6">
            {/* Link público y acceso directo */}
            <div id="agenda-public-link" className="scroll-mt-24">
                <AgendaPublicLinkPanel previewUrl={previewUrl} />
            </div>

            {readinessFailed ? (
                <PanelNotice tone="info">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span>No pudimos comprobar tus servicios y horarios para la vista previa.</span>
                        <button
                            type="button"
                            className={actionClassName}
                            onClick={() => {
                                setReadinessFailed(false);
                                setReadinessAttempt((attempt) => attempt + 1);
                            }}
                        >
                            Reintentar
                        </button>
                    </div>
                </PanelNotice>
            ) : null}

            {/* Workspace 2 columnas: Editor visual + Live Mini-Preview */}
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
                {/* Columna izquierda: Editor */}
                <div className="min-w-0 space-y-5">
                    {/* Sub-tabs de Studio */}
                    <div className="flex flex-wrap gap-1.5 rounded-2xl border border-(--border) bg-(--bg-subtle) p-1.5">
                        {studioTabs.map(({ id, label, icon: Icon }) => {
                            const active = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setActiveTab(id)}
                                    className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition ${
                                        active
                                            ? 'bg-(--surface) text-fg shadow-xs'
                                            : 'text-fg-muted hover:text-fg'
                                    }`}
                                >
                                    <Icon size={16} aria-hidden="true" />
                                    <span className="truncate">{label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab 1: Diseño y marca */}
                    {activeTab === 'design' ? (
                        <PanelCard size="lg" className="space-y-6">
                            {/* Composición visual */}
                            <div>
                                <div className="mb-3">
                                    <h2 className="text-sm font-semibold text-fg">Estilo de página</h2>
                                    <p className="text-xs text-fg-muted">Elige cómo se presenta tu portada y tus servicios.</p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    {LAYOUT_OPTIONS.map((option) => {
                                        const selected = appearance.layout === option.id;
                                        const isRecommended = recommendedLayout === option.id;
                                        return (
                                            <button
                                                key={option.id}
                                                type="button"
                                                disabled={!!operation}
                                                onClick={() => changeAppearance('layout', option.id)}
                                                className={`flex flex-col items-start gap-2.5 rounded-2xl border p-3 text-left transition ${
                                                    selected
                                                        ? 'border-(--accent) bg-(--accent-subtle)/40 ring-2 ring-(--accent-subtle)'
                                                        : 'border-(--border) bg-(--surface) hover:border-(--fg-muted)/40'
                                                }`}
                                            >
                                                <LayoutSchematic layout={option.id} accent={currentAccentHex} />
                                                <div className="w-full">
                                                    <div className="flex items-center justify-between gap-1.5">
                                                        <span className="text-xs font-semibold text-fg">{option.name}</span>
                                                        {selected ? (
                                                            <IconCheck size={14} className="shrink-0 text-accent-ink" />
                                                        ) : null}
                                                    </div>
                                                    {isRecommended ? (
                                                        <span className="mt-1 inline-block rounded-full bg-(--accent-subtle) px-2 py-0.5 text-[10px] font-semibold text-accent-ink">
                                                            Recomendado
                                                        </span>
                                                    ) : null}
                                                    <p className="mt-1 text-[11px] leading-snug text-fg-muted">{option.description}</p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Paleta de color visual */}
                            <div className="border-t border-(--border) pt-5">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h2 className="text-sm font-semibold text-fg">Color principal</h2>
                                        <p className="text-xs text-fg-muted">Personaliza botones, enlaces y acentos visuales.</p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!!operation}
                                        onClick={() => changeAppearance('accentColor', 'auto')}
                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                                            accentSelection === 'auto'
                                                ? 'border-(--accent) bg-(--accent-subtle) text-accent-ink'
                                                : 'border-(--border) text-fg-secondary hover:text-fg'
                                        }`}
                                    >
                                        <span className="size-3 rounded-full bg-[#6D9F32]" />
                                        Original SimpleAgenda
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2.5">
                                    {OPERATOR_SITE_ACCENT_OPTIONS.filter((opt) => opt.id !== 'teal').map((opt) => {
                                        const selected = accentSelection === opt.id;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                disabled={!!operation}
                                                title={opt.label}
                                                aria-label={opt.label}
                                                aria-pressed={selected}
                                                onClick={() => changeAppearance('accentColor', opt.id)}
                                                className={`relative flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110 ${
                                                    selected ? 'ring-2 ring-(--fg) ring-offset-2 ring-offset-(--surface)' : ''
                                                }`}
                                                style={{ background: opt.value }}
                                            >
                                                {selected ? <IconCheck size={14} color="#FFFFFF" stroke={2.5} /> : null}
                                            </button>
                                        );
                                    })}

                                    {/* Color personalizado */}
                                    <label
                                        className={`inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-2.5 text-xs font-medium transition ${
                                            customColor
                                                ? 'border-(--fg) bg-(--bg-subtle) text-fg'
                                                : 'border-(--border) text-fg-secondary hover:text-fg'
                                        }`}
                                    >
                                        <input
                                            aria-label="Color personalizado"
                                            type="color"
                                            disabled={!!operation}
                                            className="size-4 cursor-pointer rounded-full border-0 bg-transparent p-0"
                                            value={customColor ?? '#0F766E'}
                                            onChange={(event) => changeAppearance('accentColor', event.target.value.toUpperCase())}
                                        />
                                        <span>{customColor ?? 'Otro'}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Modo de color */}
                            <div className="border-t border-(--border) pt-5">
                                <h2 className="mb-2.5 text-sm font-semibold text-fg">Tema de la página</h2>
                                <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-(--border) bg-(--bg-subtle) p-1">
                                    {([
                                        { id: 'system', label: 'Automático', icon: IconDeviceDesktop },
                                        { id: 'light', label: 'Claro', icon: IconSun },
                                        { id: 'dark', label: 'Oscuro', icon: IconMoon },
                                    ] as const).map(({ id, label, icon: Icon }) => {
                                        const selected = appearance.colorMode === id;
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                disabled={!!operation}
                                                onClick={() => changeAppearance('colorMode', id)}
                                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                    selected ? 'bg-(--surface) text-fg shadow-xs' : 'text-fg-muted hover:text-fg'
                                                }`}
                                            >
                                                <Icon size={14} /> {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Portada de la página */}
                            <div className="border-t border-(--border) pt-5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-semibold text-fg">Imagen de portada</p>
                                        <p className="text-xs text-fg-muted">
                                            Aparece en la cabecera de tu página web (recomendado 16:9).
                                        </p>
                                    </div>
                                    <Link
                                        href="/panel/mi-negocio"
                                        className="text-xs font-medium text-accent-ink hover:underline"
                                    >
                                        Tu foto o logo se edita en Perfil →
                                    </Link>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl border border-(--border) bg-(--bg-subtle)/50 p-3.5">
                                    <button
                                        type="button"
                                        disabled={!!operation}
                                        onClick={() => coverUploadRef.current?.openPicker()}
                                        aria-label={resolvedCoverUrl ? 'Cambiar imagen de portada' : 'Subir imagen de portada'}
                                        className="relative flex aspect-video w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-(--border) bg-(--surface) text-fg-muted transition hover:border-(--accent-border) disabled:opacity-60 sm:w-44"
                                    >
                                        {resolvedCoverUrl ? (
                                            <img src={resolvedCoverUrl} alt="Portada de tu página web" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 px-2 text-center">
                                                <IconPhoto size={20} stroke={1.6} />
                                                <span className="text-[11px] font-medium">Sin portada</span>
                                            </div>
                                        )}
                                    </button>
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                                        <button
                                            type="button"
                                            disabled={!!operation}
                                            onClick={() => coverUploadRef.current?.openPicker()}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-(--border) bg-(--surface) px-3.5 text-xs font-semibold text-fg transition hover:bg-(--bg-subtle) disabled:opacity-50"
                                        >
                                            {operation === 'upload' ? (
                                                <IconLoader2 size={14} className="animate-spin" />
                                            ) : (
                                                <IconPhoto size={14} />
                                            )}
                                            {resolvedCoverUrl ? 'Cambiar portada' : 'Subir portada'}
                                        </button>
                                        {resolvedCoverUrl ? (
                                            <button
                                                type="button"
                                                disabled={!!operation}
                                                onClick={() => changeAppearance('coverUrl', null)}
                                                className="inline-flex h-9 items-center rounded-xl px-2.5 text-xs font-medium text-fg-muted transition hover:text-fg disabled:opacity-50"
                                            >
                                                Quitar
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                                <AvatarUpload
                                    ref={coverUploadRef}
                                    hideTrigger
                                    currentUrl={resolvedCoverUrl}
                                    config={{
                                        maxSize: RAW_IMAGE_MAX_SIZE_KB,
                                        maxWidth: 1600,
                                        maxHeight: 900,
                                        aspectRatio: 16 / 9,
                                        circular: false,
                                        shape: 'card',
                                        onUpload: (file, cropped) => upload(file, cropped, 'cover'),
                                    }}
                                    onSuccess={(url) => changeAppearance('coverUrl', url || null)}
                                    onError={setUploadError}
                                />
                                {uploadError ? <PanelNotice tone="error" className="mt-3">{uploadError}</PanelNotice> : null}
                            </div>
                        </PanelCard>
                    ) : null}

                    {/* Tab 2: Portada y textos IA */}
                    {activeTab === 'copy' ? (
                        <PanelCard size="lg" className="space-y-5">
                            {/* Aviso de fuente única (sin duplicar Perfil/Servicios/Horarios) */}
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border) bg-(--bg-subtle) px-4 py-3 text-xs text-fg-secondary">
                                <span>
                                    Tu nombre, presentación, servicios, horarios, sedes y contacto se sincronizan automáticamente desde <strong>Perfil</strong> y <strong>Agenda</strong>.
                                </span>
                                <Link href="/panel/mi-negocio" className="shrink-0 font-semibold text-accent-ink hover:underline">
                                    Editar datos base →
                                </Link>
                            </div>

                            {/* Asistente IA limpio */}
                            <div className="rounded-2xl border border-(--accent-border) bg-(--accent-subtle)/50 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-fg flex items-center gap-1.5">
                                            <IconSparkles size={16} className="text-accent-ink" />
                                            Redacción asistida con IA
                                        </p>
                                        <p className="mt-0.5 text-xs text-fg-muted">
                                            Genera un titular atractivo, bajada y puntos clave según tu rubro y servicios.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-(--accent) px-4 text-xs font-semibold text-(--accent-contrast) transition hover:opacity-90 disabled:opacity-50"
                                        disabled={!!operation || !hasIdentity || !hasServices}
                                        onClick={() => hasSomeCopy ? setConfirmGenerate(true) : void generate()}
                                    >
                                        {operation === 'generate' ? <IconLoader2 size={15} className="animate-spin" /> : <IconSparkles size={15} />}
                                        {operation === 'generate' ? 'Generando…' : hasSomeCopy ? 'Regenerar textos' : 'Generar textos'}
                                    </button>
                                </div>

                                {!hasIdentity || !hasServices ? (
                                    <p className="text-xs text-fg-muted">
                                        Completa tu nombre/rubro en Perfil y crea al menos un servicio para usar el asistente IA.
                                    </p>
                                ) : null}

                                {confirmGenerate ? (
                                    <div className="space-y-2 rounded-xl border border-(--border) bg-(--surface) p-3 text-xs text-fg-secondary">
                                        <p>La propuesta reemplazará {target === 'all' ? 'los textos actuales de portada y destacados' : 'la sección seleccionada'}.</p>
                                        <div className="flex flex-wrap gap-2">
                                            <button type="button" className={actionClassName} disabled={!!operation} onClick={() => void generate()}>Reemplazar con IA</button>
                                            <button type="button" className={actionClassName} onClick={() => setConfirmGenerate(false)}>Cancelar</button>
                                        </div>
                                    </div>
                                ) : null}

                                {contentNotice ? <PanelNotice tone={contentNotice.tone}>{contentNotice.message}</PanelNotice> : null}

                                <EditorDetails title="Personalizar indicaciones para la IA">
                                    <label className="block text-xs font-medium text-fg">
                                        Qué quieres generar
                                        <select className={fieldClassName} value={target} onChange={(event) => setTarget(event.target.value as OperatorSiteLandingGenerationTarget)}>
                                            {GENERATION_TARGETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                        </select>
                                    </label>
                                    <Field label="A quién atiendes" value={brief.audience} onChange={(value) => setBrief((current) => ({ ...current, audience: value }))} maxLength={500} rows={2} placeholder="Ej. Adultos jóvenes con estrés laboral o ansiedad" />
                                    <Field label="Qué distingue tu atención" value={brief.differentiators} onChange={(value) => setBrief((current) => ({ ...current, differentiators: value }))} maxLength={700} rows={2} placeholder="Ej. Enfoque cercano, sesiones puntuales, seguimiento claro" />
                                    <Field label="Formación o credenciales" value={brief.credentials} onChange={(value) => setBrief((current) => ({ ...current, credentials: value }))} maxLength={500} placeholder="Ej. Psicólogo U. de Chile · 8 años de experiencia" />
                                    <label className="block text-xs font-medium text-fg">
                                        Tono
                                        <select className={fieldClassName} value={brief.tone} onChange={(event) => setBrief((current) => ({ ...current, tone: event.target.value as OperatorSiteLandingTone }))}>
                                            {TONES.map((tone) => <option key={tone.value} value={tone.value}>{tone.label}</option>)}
                                        </select>
                                    </label>
                                </EditorDetails>
                            </div>

                            <fieldset disabled={!!operation} className="space-y-5">
                                <Field
                                    label="Titular principal de portada"
                                    value={content.heroHeadline}
                                    onChange={(value) => changeContent('heroHeadline', value)}
                                    maxLength={90}
                                    placeholder={profile.headline || profile.displayName || 'Describe tu atención en una frase clara'}
                                    hint="Si lo dejas vacío, mostraremos tu nombre y actividad."
                                />
                                <Field
                                    label="Bajada de portada"
                                    value={content.heroSubheadline}
                                    onChange={(value) => changeContent('heroSubheadline', value)}
                                    maxLength={180}
                                    rows={2}
                                    placeholder={[profile.profession, profile.city].filter(Boolean).join(' · ') || 'Sesiones online y presenciales con reserva inmediata'}
                                />

                                {/* Puntos destacados */}
                                <div className="border-t border-(--border) pt-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <h3 className="text-sm font-semibold text-fg">Puntos destacados</h3>
                                            <p className="text-xs text-fg-muted">Hasta 3 razones clave por las que elegirte.</p>
                                        </div>
                                        <button
                                            type="button"
                                            className={actionClassName}
                                            disabled={content.highlights.length >= 3}
                                            onClick={() => changeContent('highlights', [...content.highlights, { title: '', description: '' }])}
                                        >
                                            <IconPlus size={14} /> Agregar
                                        </button>
                                    </div>
                                    {content.highlights.length > 0 ? (
                                        <Field
                                            label="Título de la sección destacados"
                                            value={content.highlightsTitle}
                                            onChange={(value) => changeContent('highlightsTitle', value)}
                                            maxLength={80}
                                            placeholder="Lo que puedes esperar"
                                        />
                                    ) : null}
                                    {content.highlights.map((highlight, index) => (
                                        <div key={index} className="space-y-3 rounded-xl border border-(--border) bg-(--bg-subtle) p-3.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-fg-muted">Punto destacado {index + 1}</span>
                                                <button
                                                    type="button"
                                                    aria-label={`Quitar punto ${index + 1}`}
                                                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
                                                    onClick={() => changeContent('highlights', content.highlights.filter((_, i) => i !== index))}
                                                >
                                                    <IconTrash size={13} /> Quitar
                                                </button>
                                            </div>
                                            <Field
                                                label="Título"
                                                value={highlight.title}
                                                maxLength={48}
                                                onChange={(value) => changeContent('highlights', content.highlights.map((item, i) => i === index ? { ...item, title: value } : item))}
                                            />
                                            <Field
                                                label="Descripción breve"
                                                value={highlight.description}
                                                maxLength={150}
                                                rows={2}
                                                onChange={(value) => changeContent('highlights', content.highlights.map((item, i) => i === index ? { ...item, description: value } : item))}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Personalización opcional de Presentación (sin duplicar Bio) */}
                                <div className="border-t border-(--border) pt-4 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-fg">Presentación personalizada en web</p>
                                            <p className="text-xs text-fg-muted">
                                                Por defecto usamos la presentación de tu Perfil. Actívalo solo si quieres un texto distinto aquí.
                                            </p>
                                        </div>
                                        <PanelSwitch
                                            checked={overrideBio}
                                            onChange={(checked) => {
                                                setOverrideBio(checked);
                                                if (!checked) {
                                                    setContent((curr) => ({ ...curr, aboutTitle: '', aboutText: '' }));
                                                    setNotice(null);
                                                }
                                            }}
                                            ariaLabel="Usar presentación distinta solo para la web"
                                        />
                                    </div>
                                    {content.sections?.about === false ? (
                                        <PanelNotice tone="info">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span>La sección Presentación está oculta en Secciones y Google.</span>
                                                <button
                                                    type="button"
                                                    onClick={() => changeContent('sections', { ...content.sections, about: true })}
                                                    className="font-semibold underline underline-offset-2"
                                                >
                                                    Mostrar sección
                                                </button>
                                            </div>
                                        </PanelNotice>
                                    ) : null}
                                    {overrideBio ? (
                                        <div className="space-y-4 rounded-xl border border-(--border) p-3.5">
                                            <Field label="Título de presentación" value={content.aboutTitle} onChange={(value) => changeContent('aboutTitle', value)} maxLength={80} placeholder="Sobre mí" />
                                            <Field label="Presentación para la web" value={content.aboutText} onChange={(value) => changeContent('aboutText', value)} maxLength={900} rows={4} placeholder={profile.bio || 'Cuenta tu experiencia y enfoque'} />
                                        </div>
                                    ) : null}
                                </div>
                            </fieldset>
                        </PanelCard>
                    ) : null}

                    {/* Tab 3: Secciones y Google */}
                    {activeTab === 'sections' ? (
                        <PanelCard size="lg" className="space-y-6">
                            <div>
                                <h2 className="text-sm font-semibold text-fg">Secciones visibles y orden</h2>
                                <p className="mt-0.5 text-xs text-fg-muted">Activa o reordena los bloques que aparecen después de tus servicios.</p>
                                <ul className="mt-3 divide-y divide-(--border) rounded-xl border border-(--border)">
                                    {sectionOrder.map((id, index) => {
                                        const visible = content.sections?.[id] !== false;
                                        return (
                                            <li key={id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <PanelSwitch
                                                        checked={visible}
                                                        size="sm"
                                                        onChange={(checked) => changeContent('sections', { ...content.sections, [id]: checked })}
                                                        ariaLabel={`Mostrar ${SECTION_LABELS[id]}`}
                                                    />
                                                    <span className={`text-sm font-medium ${visible ? 'text-fg' : 'text-fg-muted line-through'}`}>
                                                        {SECTION_LABELS[id]}
                                                    </span>
                                                </div>
                                                <div className="flex shrink-0 gap-1">
                                                    <PanelButton size="sm" variant="ghost" className="px-2" ariaLabel={`Subir ${SECTION_LABELS[id]}`} disabled={index === 0} onClick={() => moveSection(index, -1)}>
                                                        <IconArrowUp size={15} aria-hidden="true" />
                                                    </PanelButton>
                                                    <PanelButton size="sm" variant="ghost" className="px-2" ariaLabel={`Bajar ${SECTION_LABELS[id]}`} disabled={index === sectionOrder.length - 1} onClick={() => moveSection(index, 1)}>
                                                        <IconArrowDown size={15} aria-hidden="true" />
                                                    </PanelButton>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                                {content.sectionOrder ? (
                                    <button type="button" className="mt-2.5 text-xs font-medium text-accent-ink hover:underline" onClick={() => changeContent('sectionOrder', undefined)}>
                                        Restaurar orden recomendado
                                    </button>
                                ) : null}
                            </div>

                            <div className="border-t border-(--border) pt-5 space-y-4">
                                <div>
                                    <h2 className="text-sm font-semibold text-fg flex items-center gap-1.5">
                                        <IconSearch size={15} className="text-accent-ink" />
                                        Vista en Google
                                    </h2>
                                    <p className="mt-0.5 text-xs text-fg-muted">Así aparecerá tu enlace cuando alguien te busque en Google o lo comparta.</p>
                                </div>

                                <div className="rounded-xl border border-(--border) bg-(--bg-subtle) p-3.5 space-y-1">
                                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                                        simpleagenda.app/{profile.slug || 'tu-link'}
                                    </p>
                                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                                        {seoPreviewTitle}
                                    </p>
                                    <p className="line-clamp-2 text-xs text-fg-secondary">
                                        {seoPreviewDesc}
                                    </p>
                                </div>

                                <fieldset disabled={!!operation} className="space-y-4">
                                    <Field label="Título en Google" value={content.seoTitle} onChange={(value) => changeContent('seoTitle', value)} maxLength={65} placeholder={seoPreviewTitle} />
                                    <Field label="Descripción en Google" value={content.seoDescription} onChange={(value) => changeContent('seoDescription', value)} maxLength={170} rows={2} placeholder={seoPreviewDesc} />
                                </fieldset>
                            </div>
                        </PanelCard>
                    ) : null}

                    {/* Barra sticky unificada de guardado y publicación */}
                    <PanelCard size="md" className="sticky bottom-3 z-20 space-y-3 shadow-md">
                        {notice ? <PanelNotice tone={notice.tone}>{notice.message}</PanelNotice> : null}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-fg-muted" role="status">
                                {hasChanges
                                    ? 'Tienes cambios sin guardar en el diseño o textos.'
                                    : profile.isPublished
                                        ? config.publishedAt
                                            ? `Publicado el ${new Date(config.publishedAt).toLocaleDateString('es-CL')}.`
                                            : 'Tu página web está activa y en línea.'
                                        : canPublish
                                            ? 'Todo listo para publicar tu página.'
                                            : 'Completa perfil, un servicio y horario para publicar.'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                {hasChanges ? (
                                    <button
                                        type="button"
                                        className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold text-fg-muted transition hover:text-fg disabled:opacity-50"
                                        disabled={!!operation}
                                        onClick={discardChanges}
                                    >
                                        Descartar cambios
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className={actionClassName}
                                    disabled={!!operation || (!hasChanges && Boolean(config.draft))}
                                    onClick={() => void saveDraftOnly()}
                                >
                                    {operation === 'save' ? 'Guardando…' : 'Guardar borrador'}
                                </button>
                                <PanelButton
                                    variant="primary"
                                    className="min-h-10"
                                    disabled={!!operation || !canPublish || (!hasChanges && Boolean(profile.isPublished) && !config.draftAppearance && JSON.stringify(config.draft ?? EMPTY_CONTENT) === JSON.stringify(config.published ?? EMPTY_CONTENT))}
                                    onClick={() => void saveAndPublish()}
                                >
                                    {operation === 'publish'
                                        ? 'Publicando…'
                                        : profile.isPublished
                                            ? 'Publicar cambios'
                                            : 'Guardar y publicar'}
                                </PanelButton>
                            </div>
                        </div>
                    </PanelCard>
                </div>

                {/* Columna derecha: Live Mini-Preview */}
                <div className="xl:sticky xl:top-24">
                    <LiveSiteMiniPreview
                        profile={profile}
                        content={content}
                        appearance={appearance}
                        services={readiness?.services ?? []}
                        openingPreview={operation === 'save'}
                        onOpenFullPreview={() => void openFullPreview()}
                    />
                </div>
            </div>
        </div>
    );
}
