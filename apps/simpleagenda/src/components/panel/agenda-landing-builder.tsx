'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { IconArrowDown, IconArrowUp, IconCheck, IconChevronDown, IconCircle, IconExternalLink, IconLoader2, IconSparkles } from '@tabler/icons-react';
import { PanelButton, PanelCard, PanelNotice, PanelProfileBrandImages } from '@simple/ui/panel';
import {
    emptyOperatorSiteLandingConfig,
    normalizeOperatorSiteColorMode,
    normalizeOperatorSiteLayout,
    normalizeOperatorSiteAccentHex,
    OPERATOR_SITE_ACCENT_OPTIONS,
    OPERATOR_SITE_COLOR_MODE_OPTIONS,
    OPERATOR_SITE_LANDING_SECTIONS,
    resolveOperatorSiteIndustry,
    type OperatorSiteLandingAppearance,
    type OperatorSiteLandingConfig,
    type OperatorSiteLandingContent,
    type OperatorSiteLandingGenerationTarget,
    type OperatorSiteLandingSection,
    type OperatorSiteLandingTone,
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
} from '@/lib/agenda-api';

const EMPTY_CONTENT: OperatorSiteLandingContent = {
    heroHeadline: '', heroSubheadline: '', aboutTitle: '', aboutText: '',
    highlightsTitle: '', highlights: [], seoTitle: '', seoDescription: '',
};

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
    { value: 'seo', label: 'Texto para buscadores' },
];
const SECTION_LABELS: Record<OperatorSiteLandingSection, string> = {
    about: 'Presentación',
    highlights: 'Puntos destacados',
    location: 'Lugares de atención',
    contact: 'Datos de contacto',
};

const fieldClassName = 'mt-1.5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm text-fg outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]';
const actionClassName = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-fg hover:bg-[var(--bg-subtle)] disabled:opacity-50';

function Field({ label, value, onChange, maxLength, rows, placeholder }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    maxLength: number;
    rows?: number;
    placeholder?: string;
}) {
    return (
        <label className="block text-sm font-medium text-fg">
            {label}
            {rows
                ? <textarea className={fieldClassName} value={value} maxLength={maxLength} rows={rows} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
                : <input className={fieldClassName} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}
        </label>
    );
}

function EditorDetails({ title, children }: { title: string; children: ReactNode }) {
    return (
        <details className="group rounded-xl border border-[var(--border)]">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 text-sm font-semibold text-fg">
                {title}
                <IconChevronDown size={16} aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-4 border-t border-[var(--border)] p-3.5">{children}</div>
        </details>
    );
}

function Requirement({ label, detail, href }: { label: string; detail: string | null; href: string }) {
    const Icon = detail ? IconCheck : IconCircle;
    return (
        <li className="flex items-center gap-3 border-t border-[var(--border)] py-3 first:border-t-0">
            <Icon size={18} aria-hidden="true" className={detail ? 'shrink-0 text-accent-ink' : 'shrink-0 text-fg-muted'} />
            <div className="min-w-0 grow">
                <span className="block text-sm font-semibold text-fg">{label}</span>
                {detail ? <span className="block text-xs text-fg-secondary">{detail}</span> : null}
            </div>
            <Link href={href} className="inline-flex min-h-10 shrink-0 items-center text-sm font-medium text-accent-ink underline underline-offset-4">
                {detail ? 'Editar' : 'Completar'}<span className="sr-only"> {label}</span>
            </Link>
        </li>
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
    const [config, setConfig] = useState<OperatorSiteLandingConfig>(
        () => profile.operatorSiteLandingConfig ?? emptyOperatorSiteLandingConfig(),
    );
    const [brief, setBrief] = useState(config.brief);
    const [content, setContent] = useState(config.draft ?? config.published ?? EMPTY_CONTENT);
    const [appearance, setAppearance] = useState(config.draftAppearance ?? publishedAppearance(profile));
    const [readiness, setReadiness] = useState<{ serviceCount: number; hasSchedule: boolean } | null>(null);
    const [readinessAttempt, setReadinessAttempt] = useState(0);
    const [readinessFailed, setReadinessFailed] = useState(false);
    const [operation, setOperation] = useState<'generate' | 'save' | 'publish' | 'upload' | null>(null);
    const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [contentNotice, setContentNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [uploadError, setUploadError] = useState('');
    const [confirmGenerate, setConfirmGenerate] = useState(false);
    const [target, setTarget] = useState<OperatorSiteLandingGenerationTarget>('all');

    useEffect(() => {
        let active = true;
        void Promise.all([fetchAgendaServices(), fetchAgendaAvailability()]).then(([services, availability]) => {
            if (!active) return;
            setReadiness({
                serviceCount: services.filter((service) => service.isActive && (!service.kind || service.kind === 'appointment')).length,
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
    const hasChanges = JSON.stringify([content, brief, appearance]) !== JSON.stringify([baselineContent, config.brief, baselineAppearance]);
    const hasSavedDraft = Boolean(config.draft && (
        config.draftAppearance || JSON.stringify(config.draft) !== JSON.stringify(config.published)
    ));
    const hasIdentity = Boolean(profile.displayName?.trim() && profile.profession?.trim());
    const hasServices = (readiness?.serviceCount ?? 0) > 0;
    const canPublishLink = profile.isPublished || Boolean(profile.slug && hasIdentity && hasServices && readiness?.hasSchedule);
    const mutationContext = { profileId: profile.id, revision: config.draftRevision ?? null };
    const previewParams = new URLSearchParams({ draft: '1', profile: profile.id });
    if (config.draftRevision) previewParams.set('rev', config.draftRevision);
    const previewUrl = `/vista-previa?${previewParams}`;
    const customColor = normalizeOperatorSiteAccentHex(appearance.accentColor);
    const accentOption = OPERATOR_SITE_ACCENT_OPTIONS.find((option) => option.id === appearance.accentColor);
    const accentSelection = customColor ? 'custom' : accentOption && accentOption.id !== 'teal' ? accentOption.id : 'auto';
    const industry = resolveOperatorSiteIndustry(`${profile.operatorSubtype ?? ''} ${profile.profession ?? ''}`).id;
    const recommendedLayout = industry === 'beauty' ? 'portfolio' : industry === 'fitness' || industry === 'education' ? 'studio' : 'booking';
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

    function setDraft(next: OperatorSiteLandingConfig) {
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
        const result = await generateAgendaLandingPage(brief, appearance, mutationContext, content, target);
        setOperation(null);
        if (!result.ok || !result.config?.draft) {
            setContentNotice({ tone: 'error', message: result.error ?? 'No se pudo generar el borrador. Puedes escribirlo y guardarlo.' });
            return;
        }
        setDraft(result.config);
        setContentNotice({ tone: 'success', message: 'Guardamos la propuesta como borrador. Revisa el contenido antes de publicarlo.' });
    }

    function prepareFromProfile() {
        const name = profile.displayName?.trim();
        if (!name) return;
        const activity = profile.profession?.trim() ?? '';
        const intro = [activity, profile.city?.trim()].filter(Boolean).join(' · ');
        setContent((current) => ({
            ...current,
            heroHeadline: current.heroHeadline || (profile.headline?.trim() || name).slice(0, 90),
            heroSubheadline: current.heroSubheadline || intro.slice(0, 180),
            aboutTitle: current.aboutTitle || (profile.bio ? 'Presentación' : ''),
            aboutText: current.aboutText || (profile.bio?.trim() ?? '').slice(0, 900),
            seoTitle: current.seoTitle || [name, activity].filter(Boolean).join(' · ').slice(0, 65),
            seoDescription: current.seoDescription || (profile.bio?.trim() || intro).slice(0, 170),
        }));
        setNotice(null);
        setContentNotice({ tone: 'success', message: 'Completamos los campos vacíos con los datos de tu perfil. Revisa y guarda el borrador.' });
    }

    async function save() {
        if (operation) return;
        setOperation('save');
        setNotice(null);
        const result = await saveAgendaLandingDraft(brief, content, appearance, mutationContext);
        setOperation(null);
        if (!result.ok || !result.config) {
            setNotice({ tone: 'error', message: result.error ?? 'No se pudo guardar el borrador.' });
            return;
        }
        setDraft(result.config);
        setNotice({ tone: 'success', message: 'Borrador guardado. Ya puedes revisarlo en la vista previa.' });
    }

    async function publish() {
        if (operation || hasChanges || !hasSavedDraft || !canPublishLink) return;
        setOperation('publish');
        setNotice(null);
        const result = await publishAgendaLandingDraft(mutationContext);
        setOperation(null);
        if (!result.ok || !result.config || !result.appearance) {
            setNotice({ tone: 'error', message: result.error ?? 'No se pudo publicar. El borrador sigue guardado.' });
            return;
        }
        setDraft(result.config);
        setAppearance(result.appearance);
        onPublished({
            isPublished: true,
            operatorSiteLandingConfig: result.config,
            operatorSiteLayout: result.appearance.layout,
            operatorSiteColorMode: result.appearance.colorMode,
            operatorSiteAccentColor: result.appearance.accentColor,
            avatarUrl: result.appearance.avatarUrl,
            coverUrl: result.appearance.coverUrl,
        });
        setNotice({ tone: 'success', message: 'La nueva versión ya está publicada en tu enlace.' });
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

    return (
        <div className="grid min-w-0 gap-5">
            <div id="agenda-public-link" className="scroll-mt-24 space-y-3">
                <AgendaPublicLinkPanel previewUrl={previewUrl} />
                {profile.isPublished ? (
                    <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
                        <span>{config.publishedAt ? `Última publicación: ${new Date(config.publishedAt).toLocaleDateString('es-CL')}` : 'Tu enlace admite reservas.'}</span>
                        <a href={`/${profile.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1.5 font-semibold text-accent-ink underline underline-offset-4">
                            Ver página publicada <IconExternalLink size={13} aria-hidden="true" />
                        </a>
                    </p>
                ) : null}
            </div>

            <PanelCard size="lg">
                <h2 className="text-lg font-bold tracking-tight text-fg">Datos del negocio</h2>
                <p className="mt-1 text-sm text-fg-secondary">Tu página usa los datos de Perfil, Servicios y Agenda.</p>
                {readinessFailed ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-fg-secondary">
                        No pudimos comprobar tus servicios y horarios.
                        <button type="button" className={actionClassName} onClick={() => {
                            setReadinessFailed(false);
                            setReadinessAttempt((attempt) => attempt + 1);
                        }}>Reintentar</button>
                    </div>
                ) : null}
                <ul className="mt-2">
                    <Requirement label="Nombre y actividad" detail={hasIdentity ? `${profile.displayName} · ${profile.profession}` : null} href="/panel/mi-negocio#agenda-public-profile" />
                    {readiness ? (
                        <>
                            <Requirement label="Servicios para reservar" detail={hasServices ? `${readiness.serviceCount} en tu página` : null} href="/panel/mis-servicios#agenda-first-service" />
                            <Requirement label="Horario" detail={readiness.hasSchedule ? 'Horario configurado' : null} href="/panel/mi-negocio/agenda#agenda-availability" />
                        </>
                    ) : !readinessFailed ? <li className="py-2 text-sm text-fg-muted">Revisando servicios y horarios…</li> : null}
                </ul>
            </PanelCard>

            <PanelCard size="lg" className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-fg">Contenido</h2>
                        <p className="mt-1 text-sm text-fg-secondary">Escribe tus textos o genera una propuesta con IA.</p>
                    </div>
                    <button
                        type="button"
                        className={actionClassName}
                        disabled={!!operation || !hasIdentity || !hasServices}
                        onClick={() => hasSomeCopy ? setConfirmGenerate(true) : void generate()}
                    >
                        {operation === 'generate' ? <IconLoader2 size={17} className="animate-spin" aria-hidden="true" /> : <IconSparkles size={17} aria-hidden="true" />}
                        {operation === 'generate' ? 'Generando…' : 'Generar borrador'}
                    </button>
                </div>
                {confirmGenerate ? (
                    <div className="space-y-2 rounded-xl bg-[var(--bg-subtle)] p-3 text-sm text-fg-secondary">
                        <p>La propuesta reemplazará {target === 'all' ? 'los textos de este borrador' : 'el texto de la sección elegida'}.</p>
                        <div className="flex flex-wrap gap-2">
                            <button type="button" className={actionClassName} disabled={!!operation} onClick={() => void generate()}>Generar propuesta</button>
                            <button type="button" className={actionClassName} onClick={() => setConfirmGenerate(false)}>Seguir editando</button>
                        </div>
                    </div>
                ) : null}
                {contentNotice ? <PanelNotice tone={contentNotice.tone}>{contentNotice.message}</PanelNotice> : null}
                {hasIdentity && (!hasSomeCopy || contentNotice?.tone === 'error') && (
                    <button type="button" className={actionClassName} disabled={!!operation} onClick={prepareFromProfile}>
                        Completar con los datos de mi perfil
                    </button>
                )}
                <fieldset disabled={!!operation} className="space-y-4">
                    <Field label="Titular" value={content.heroHeadline} onChange={(value) => changeContent('heroHeadline', value)} maxLength={90} placeholder={profile.headline ?? 'Describe tu forma de atender en una frase'} />
                    <Field label="Bajada" value={content.heroSubheadline} onChange={(value) => changeContent('heroSubheadline', value)} maxLength={180} rows={2} />
                    <Field label="Título de presentación" value={content.aboutTitle} onChange={(value) => changeContent('aboutTitle', value)} maxLength={80} placeholder="Sobre mí" />
                    <Field label="Presentación" value={content.aboutText} onChange={(value) => changeContent('aboutText', value)} maxLength={900} rows={4} placeholder={profile.bio || 'Cuenta qué ofreces y qué encontrará el cliente al reservar'} />
                    <EditorDetails title="Instrucciones para la IA">
                        <label className="block text-sm font-medium text-fg">Qué quieres generar
                            <select className={fieldClassName} value={target} onChange={(event) => setTarget(event.target.value as OperatorSiteLandingGenerationTarget)}>
                                {GENERATION_TARGETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </label>
                        <Field label="A quién atiendes" value={brief.audience} onChange={(value) => setBrief((current) => ({ ...current, audience: value }))} maxLength={500} rows={2} />
                        <Field label="Qué distingue tu atención" value={brief.differentiators} onChange={(value) => setBrief((current) => ({ ...current, differentiators: value }))} maxLength={700} rows={2} />
                        <Field label="Formación o credenciales" value={brief.credentials} onChange={(value) => setBrief((current) => ({ ...current, credentials: value }))} maxLength={500} />
                        <label className="block text-sm font-medium text-fg">Tono
                            <select className={fieldClassName} value={brief.tone} onChange={(event) => setBrief((current) => ({ ...current, tone: event.target.value as OperatorSiteLandingTone }))}>
                                {TONES.map((tone) => <option key={tone.value} value={tone.value}>{tone.label}</option>)}
                            </select>
                        </label>
                    </EditorDetails>
                    <EditorDetails title="Puntos destacados">
                        {content.highlights.length ? <Field label="Título de la sección" value={content.highlightsTitle} onChange={(value) => changeContent('highlightsTitle', value)} maxLength={80} /> : null}
                        {content.highlights.map((highlight, index) => (
                            <div key={index} className="space-y-3 rounded-xl bg-[var(--bg-subtle)] p-3">
                                <Field label={`Título ${index + 1}`} value={highlight.title} maxLength={48} onChange={(value) => changeContent('highlights', content.highlights.map((item, i) => i === index ? { ...item, title: value } : item))} />
                                <Field label={`Descripción ${index + 1}`} value={highlight.description} maxLength={150} rows={2} onChange={(value) => changeContent('highlights', content.highlights.map((item, i) => i === index ? { ...item, description: value } : item))} />
                                <button type="button" aria-label={`Quitar punto ${index + 1}`} className={actionClassName} onClick={() => changeContent('highlights', content.highlights.filter((_, i) => i !== index))}>Quitar punto</button>
                            </div>
                        ))}
                        <button type="button" className={actionClassName} disabled={content.highlights.length >= 3} onClick={() => changeContent('highlights', [...content.highlights, { title: '', description: '' }])}>Agregar punto</button>
                    </EditorDetails>
                    <EditorDetails title="Título y descripción para buscadores">
                        <Field label="Título SEO" value={content.seoTitle} onChange={(value) => changeContent('seoTitle', value)} maxLength={65} />
                        <Field label="Descripción SEO" value={content.seoDescription} onChange={(value) => changeContent('seoDescription', value)} maxLength={170} rows={2} />
                    </EditorDetails>
                    <EditorDetails title="Secciones de la página">
                        <p className="text-sm text-fg-secondary">Al cambiar el orden, estas secciones se muestran después de tus servicios.</p>
                        <ul className="space-y-1">
                            {sectionOrder.map((id, index) => (
                                <li key={id} className="flex items-center justify-between gap-2">
                                    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-fg">
                                        <input
                                            type="checkbox"
                                            className="size-4 accent-[var(--accent)]"
                                            checked={content.sections?.[id] !== false}
                                            onChange={(event) => changeContent('sections', { ...content.sections, [id]: event.target.checked })}
                                        />
                                        {SECTION_LABELS[id]}
                                    </label>
                                    <div className="flex shrink-0 gap-1">
                                        <PanelButton size="sm" variant="ghost" className="px-2" ariaLabel={`Subir ${SECTION_LABELS[id]}`} disabled={index === 0} onClick={() => moveSection(index, -1)}><IconArrowUp size={16} aria-hidden="true" /></PanelButton>
                                        <PanelButton size="sm" variant="ghost" className="px-2" ariaLabel={`Bajar ${SECTION_LABELS[id]}`} disabled={index === sectionOrder.length - 1} onClick={() => moveSection(index, 1)}><IconArrowDown size={16} aria-hidden="true" /></PanelButton>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {content.sectionOrder ? (
                            <button type="button" className={actionClassName} onClick={() => changeContent('sectionOrder', undefined)}>Usar el orden de la composición</button>
                        ) : null}
                    </EditorDetails>
                </fieldset>
            </PanelCard>

            <PanelCard size="lg" className="space-y-4">
                <h2 className="text-lg font-bold tracking-tight text-fg">Diseño y marca</h2>
                <fieldset className="space-y-4" disabled={!!operation}>
                    <label className="block text-sm font-medium text-fg">Composición
                        <select className={fieldClassName} value={appearance.layout} onChange={(event) => changeAppearance('layout', normalizeOperatorSiteLayout(event.target.value))}>
                            <option value="booking">Reserva directa{recommendedLayout === 'booking' ? ' · Recomendada' : ''}</option>
                            <option value="portfolio">Portada visual{recommendedLayout === 'portfolio' ? ' · Recomendada' : ''}</option>
                            <option value="studio">Perfil compacto{recommendedLayout === 'studio' ? ' · Recomendado' : ''}</option>
                        </select>
                    </label>
                    <label className="block text-sm font-medium text-fg">Paleta
                        <select className={fieldClassName} value={accentSelection} onChange={(event) => changeAppearance('accentColor', event.target.value === 'custom' ? accentOption?.value ?? '#002E32' : event.target.value)}>
                            <option value="auto">Colores de SimpleAgenda</option>
                            {OPERATOR_SITE_ACCENT_OPTIONS.filter((option) => option.id !== 'teal').map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                            <option value="custom">Color personalizado</option>
                        </select>
                    </label>
                    {customColor ? (
                        <label className="flex items-center gap-3 text-sm font-medium text-fg">
                            <input aria-label="Color principal" type="color" className="h-11 w-14 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1" value={customColor} onChange={(event) => changeAppearance('accentColor', event.target.value.toUpperCase())} />
                            {customColor.toUpperCase()}
                        </label>
                    ) : null}
                    <label className="block text-sm font-medium text-fg">Modo de color
                        <select className={fieldClassName} value={appearance.colorMode} onChange={(event) => changeAppearance('colorMode', normalizeOperatorSiteColorMode(event.target.value))}>
                            {OPERATOR_SITE_COLOR_MODE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        </select>
                    </label>
                </fieldset>
                <PanelProfileBrandImages
                    compactControls
                    displayName={profile.displayName ?? ''}
                    logoUrl={appearance.avatarUrl}
                    coverUrl={appearance.coverUrl}
                    disabled={!!operation}
                    onLogoChange={(url) => changeAppearance('avatarUrl', url || null)}
                    onCoverChange={(url) => changeAppearance('coverUrl', url || null)}
                    onUploadLogo={(file, cropped) => upload(file, cropped, 'logo')}
                    onUploadCover={(file, cropped) => upload(file, cropped, 'cover')}
                    onError={setUploadError}
                />
                {uploadError ? <PanelNotice tone="error">{uploadError}</PanelNotice> : null}
            </PanelCard>

            <PanelCard size="lg" className="space-y-3">
                <h2 className="text-lg font-bold tracking-tight text-fg">Publicación</h2>
                <p className="text-sm text-fg-secondary" role="status">
                    {hasChanges
                        ? 'Guarda tus cambios para actualizarlos en la vista previa.'
                        : hasSavedDraft
                            ? canPublishLink ? 'Revisa tu borrador en la vista previa y publícalo cuando esté listo.' : 'Completa el enlace, los datos, un servicio y un horario para publicar.'
                            : profile.isPublished ? 'Estás viendo el contenido de la versión publicada.' : 'Guarda un borrador para preparar la publicación.'}
                </p>
                {notice ? <PanelNotice tone={notice.tone}>{notice.message}</PanelNotice> : null}
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button type="button" className={actionClassName} disabled={!!operation || (!hasChanges && Boolean(config.draft))} onClick={() => void save()}>
                        {operation === 'save' ? 'Guardando…' : 'Guardar borrador'}
                    </button>
                    <PanelButton variant="primary" className="min-h-11" disabled={!!operation || !hasSavedDraft || hasChanges || !canPublishLink} onClick={() => void publish()}>
                        {operation === 'publish' ? 'Publicando…' : profile.isPublished ? 'Publicar cambios' : 'Publicar mi página'}
                    </PanelButton>
                </div>
                {config.previous ? (
                    <EditorDetails title="Versión anterior">
                        <p className="text-sm text-fg-secondary">Carga su texto y diseño en el editor y revísalos antes de publicar.</p>
                        {hasChanges ? <p className="text-xs text-fg-muted">Guarda tus cambios antes de cargar la versión anterior.</p> : null}
                        <button type="button" className={actionClassName} disabled={!!operation || hasChanges} onClick={() => {
                            if (!config.previous) return;
                            setContent(config.previous.content ?? EMPTY_CONTENT);
                            setAppearance(config.previous.appearance);
                            setNotice({ tone: 'success', message: 'Versión anterior cargada en el editor. Guarda el borrador para revisarla.' });
                        }}>Recuperar versión anterior</button>
                    </EditorDetails>
                ) : null}
            </PanelCard>
        </div>
    );
}
