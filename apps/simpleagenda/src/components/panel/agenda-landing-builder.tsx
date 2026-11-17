'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    IconCheck,
    IconChevronDown,
    IconCircleCheck,
    IconInfoCircle,
    IconLoader2,
    IconSparkles,
    IconWorld,
} from '@tabler/icons-react';
import {
    DEFAULT_OPERATOR_SITE_LANDING_BRIEF,
    type OperatorSiteLandingBrief,
    type OperatorSiteLandingConfig,
    type OperatorSiteLandingContent,
    type OperatorSiteLandingTone,
} from '@simple/utils';
import { PanelCard, PanelNotice } from '@simple/ui/panel';
import {
    fetchAgendaServices,
    generateAgendaLandingPage,
    publishAgendaLandingDraft,
    saveAgendaLandingDraft,
    type AgendaProfile,
    type AgendaService,
} from '@/lib/agenda-api';

type AgendaLandingBuilderProps = {
    profile: AgendaProfile;
    onPreviewUpdate: () => void;
};

const TONES: Array<{ value: OperatorSiteLandingTone; label: string }> = [
    { value: 'cercano', label: 'Cercano' },
    { value: 'profesional', label: 'Profesional' },
    { value: 'sereno', label: 'Sereno' },
    { value: 'premium', label: 'Premium' },
    { value: 'dinamico', label: 'Dinámico' },
];

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

function savedConfig(profile: AgendaProfile): OperatorSiteLandingConfig | null {
    return profile.operatorSiteLandingConfig ?? null;
}

function Field({
    label,
    value,
    onChange,
    hint,
    maxLength,
    multiline = false,
    rows = 3,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
    maxLength: number;
    multiline?: boolean;
    rows?: number;
    placeholder?: string;
}) {
    const common = 'mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm text-fg outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]';
    return (
        <label className="block min-w-0">
            <span className="text-sm font-semibold text-fg">{label}</span>
            {multiline ? (
                <textarea
                    className={`${common} resize-y leading-6`}
                    value={value}
                    onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
                    rows={rows}
                    maxLength={maxLength}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    className={common}
                    value={value}
                    onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
                    maxLength={maxLength}
                    placeholder={placeholder}
                />
            )}
            <span className="mt-1 flex items-start justify-between gap-3 text-xs text-fg-muted">
                <span>{hint}</span>
                <span className="shrink-0">{value.length}/{maxLength}</span>
            </span>
        </label>
    );
}

function RequirementRow({
    label,
    detail,
    complete,
    href,
    actionLabel,
}: {
    label: string;
    detail: string;
    complete: boolean;
    href: string;
    actionLabel: string;
}) {
    return (
        <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <div className="flex min-w-0 items-start gap-2.5">
                {complete
                    ? <IconCircleCheck size={17} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden />
                    : <span className="mt-0.5 size-[17px] shrink-0 rounded-full border border-[var(--border-strong)]" aria-hidden />}
                <span className="min-w-0">
                    <span className="block text-xs font-semibold text-fg">{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-fg-muted">{detail}</span>
                </span>
            </div>
            {complete ? (
                <span className="shrink-0 text-[11px] font-semibold text-[var(--accent-ink)]">Listo</span>
            ) : (
                <Link href={href} className="shrink-0 text-xs font-semibold text-[var(--accent-ink)] underline underline-offset-2">
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}

export function AgendaLandingBuilder({ profile, onPreviewUpdate }: AgendaLandingBuilderProps) {
    const initialConfig = savedConfig(profile);
    const [brief, setBrief] = useState<OperatorSiteLandingBrief>(initialConfig?.brief ?? DEFAULT_OPERATOR_SITE_LANDING_BRIEF);
    const [savedBrief, setSavedBrief] = useState<OperatorSiteLandingBrief>(initialConfig?.brief ?? DEFAULT_OPERATOR_SITE_LANDING_BRIEF);
    const [content, setContent] = useState<OperatorSiteLandingContent>(initialConfig?.draft ?? initialConfig?.published ?? EMPTY_CONTENT);
    const [savedContent, setSavedContent] = useState<OperatorSiteLandingContent | null>(initialConfig?.draft ?? initialConfig?.published ?? null);
    const [services, setServices] = useState<AgendaService[]>([]);
    const [loadingContext, setLoadingContext] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [notice, setNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
    const [showSeo, setShowSeo] = useState(false);

    useEffect(() => {
        let active = true;
        void fetchAgendaServices().then((nextServices) => {
            if (!active) return;
            setServices(nextServices);
        }).catch(() => {
            if (!active) return;
            setServices([]);
        }).finally(() => {
            if (active) setLoadingContext(false);
        });
        return () => { active = false; };
    }, []);

    const activeServices = useMemo(() => services.filter((service) => service.isActive), [services]);
    const contentReady = Boolean(content.heroHeadline.trim() && content.heroSubheadline.trim() && content.aboutText.trim());
    const hasBusinessIdentity = Boolean(profile.displayName?.trim() && profile.profession?.trim());
    const hasServices = activeServices.length > 0;
    const hasMinimumData = hasBusinessIdentity && hasServices;

    const setBriefField = <K extends keyof OperatorSiteLandingBrief>(key: K, value: OperatorSiteLandingBrief[K]) => {
        setBrief((current) => ({ ...current, [key]: value }));
        setNotice(null);
    };
    const setContentField = <K extends keyof OperatorSiteLandingContent>(key: K, value: OperatorSiteLandingContent[K]) => {
        setContent((current) => ({ ...current, [key]: value }));
        setNotice(null);
    };
    const updateHighlight = (index: number, key: 'title' | 'description', value: string) => {
        setContent((current) => ({
            ...current,
            highlights: current.highlights.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
        }));
        setNotice(null);
    };

    const handleGenerate = async () => {
        if (!hasMinimumData) return;
        setGenerating(true);
        setNotice(null);
        const result = await generateAgendaLandingPage(brief);
        setGenerating(false);
        if (!result.ok || !result.config?.draft) {
            setNotice({ tone: 'error', message: result.error ?? 'No pudimos generar la página.' });
            return;
        }
        setContent(result.config.draft);
        setSavedBrief(result.config.brief);
        setSavedContent(result.config.draft);
        setNotice({ tone: 'success', message: 'Borrador generado y guardado. Revísalo y ajústalo antes de publicarlo.' });
        onPreviewUpdate();
    };

    const handleSave = async () => {
        if (!contentReady) {
            setNotice({ tone: 'error', message: 'Completa el titular, la bajada y la presentación antes de guardar.' });
            return false;
        }
        setSaving(true);
        setNotice(null);
        const result = await saveAgendaLandingDraft(brief, content);
        setSaving(false);
        if (!result.ok) {
            setNotice({ tone: 'error', message: result.error ?? 'No pudimos guardar el borrador.' });
            return false;
        }
        setSavedContent(content);
        setSavedBrief(brief);
        setNotice({ tone: 'success', message: 'Borrador guardado. La vista previa ya muestra estos cambios.' });
        onPreviewUpdate();
        return true;
    };

    const handlePublish = async () => {
        const saved = await handleSave();
        if (!saved) return;
        if (!profile.isPublished) {
            setNotice({ tone: 'error', message: 'Tu link todavía no está publicado. Guarda este borrador y publica primero tu link desde la sección de datos del negocio.' });
            return;
        }
        setPublishing(true);
        const result = await publishAgendaLandingDraft();
        setPublishing(false);
        if (!result.ok) {
            setNotice({ tone: 'error', message: result.error ?? 'No pudimos aplicar el contenido a tu página pública.' });
            return;
        }
        setNotice({ tone: 'success', message: 'La nueva versión ya está publicada en tu link.' });
        onPreviewUpdate();
    };

    const pendingChanges = Boolean(contentReady && (
        JSON.stringify(content) !== JSON.stringify(savedContent)
        || JSON.stringify(brief) !== JSON.stringify(savedBrief)
    ));

    return (
        <PanelCard size="lg" className="overflow-hidden p-0">
            <div className="border-b border-[var(--border)] bg-[linear-gradient(120deg,var(--accent-subtle),transparent_70%)] px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent)] text-[var(--accent-contrast)] shadow-sm">
                        <IconSparkles size={21} aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent-ink)]">Paso 1 de 2 · Contenido</p>
                        <h2 className="mt-1 text-xl font-bold tracking-tight text-fg sm:text-2xl">Genera el contenido</h2>
                        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-fg-secondary">
                            Revisa los datos que usaremos y genera una propuesta. Después puedes ajustar el diseño y la marca por separado.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
                <section className="space-y-3.5" aria-labelledby="landing-data-title">
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                            <h3 id="landing-data-title" className="text-sm font-bold text-fg">Antes de generar</h3>
                            <p className="mt-1 text-xs leading-5 text-fg-muted">
                                Confirma que el perfil del negocio esté correcto y que haya servicios activos para reservar.
                            </p>
                        </div>
                        {loadingContext ? <IconLoader2 size={15} className="mt-1 animate-spin text-fg-muted" aria-label="Revisando" /> : null}
                    </div>
                    <div className="grid gap-2">
                        <RequirementRow
                            label="Perfil del negocio"
                            detail={hasBusinessIdentity ? `${profile.displayName} · ${profile.profession}` : 'Falta el nombre o la actividad.'}
                            complete={hasBusinessIdentity}
                            href="/panel/mi-negocio"
                            actionLabel="Completar"
                        />
                        <RequirementRow
                            label="Servicios para reservar"
                            detail={hasServices ? `${activeServices.length} servicio${activeServices.length === 1 ? '' : 's'} activo${activeServices.length === 1 ? '' : 's'}` : 'Agrega al menos un servicio activo.'}
                            complete={hasServices}
                            href="/panel/mis-servicios"
                            actionLabel="Agregar"
                        />
                    </div>
                    <p className="text-xs leading-5 text-fg-muted">
                        La actividad, horarios, ubicación y contacto se toman de tu perfil. No necesitas volver a escribirlos.
                    </p>
                    <button
                        type="button"
                        onClick={() => void handleGenerate()}
                        disabled={generating || loadingContext || !hasMinimumData}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-contrast)] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
                    >
                        {generating ? <IconLoader2 size={17} className="animate-spin" /> : <IconSparkles size={17} />}
                        {generating ? 'Creando tu propuesta…' : contentReady ? 'Volver a generar mi página' : 'Generar mi página'}
                    </button>
                </section>

                <section aria-labelledby="landing-brief-title">
                    <details className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                            <span className="min-w-0">
                                <span id="landing-brief-title" className="block text-sm font-semibold text-fg">Ajustar el texto <span className="font-normal text-fg-muted">· opcional</span></span>
                                <span className="mt-1 block text-xs leading-5 text-fg-muted">Puedes generar la página sin completar estas respuestas.</span>
                            </span>
                            <IconChevronDown size={17} className="shrink-0 text-fg-muted transition-transform group-open:rotate-180" aria-hidden />
                        </summary>
                        <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                            <div className="grid gap-4">
                                <Field
                                    label="¿A quién quieres atender?"
                                    value={brief.audience}
                                    onChange={(value) => setBriefField('audience', value)}
                                    maxLength={500}
                                    multiline
                                    rows={3}
                                    placeholder="Ej.: personas que buscan apoyo para manejar el estrés laboral"
                                    hint="Opcional."
                                />
                                <Field
                                    label="¿Qué valoran de tu forma de trabajar?"
                                    value={brief.differentiators}
                                    onChange={(value) => setBriefField('differentiators', value)}
                                    maxLength={700}
                                    multiline
                                    rows={3}
                                    placeholder="Ej.: atención individual, seguimiento entre sesiones y horarios vespertinos"
                                    hint="Solo se usan los detalles que escribas y los datos confirmados."
                                />
                            </div>
                            <div className="grid gap-4">
                                <Field
                                    label="Formación o credenciales"
                                    value={brief.credentials}
                                    onChange={(value) => setBriefField('credentials', value)}
                                    maxLength={500}
                                    placeholder="Ej.: título, certificación o años de experiencia"
                                    hint="Opcional. Solo se incluirá lo que indiques."
                                />
                                <label className="block">
                                    <span className="text-sm font-semibold text-fg">Tono de comunicación</span>
                                    <select
                                        className="mt-1.5 min-h-12 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 text-sm text-fg outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                                        value={brief.tone}
                                        onChange={(event) => setBriefField('tone', event.target.value as OperatorSiteLandingTone)}
                                    >
                                        {TONES.map((tone) => <option key={tone.value} value={tone.value}>{tone.label}</option>)}
                                    </select>
                                    <span className="mt-1 block text-xs text-fg-muted">Puedes cambiarlo y volver a generar cuando quieras.</span>
                                </label>
                            </div>
                        </div>
                    </details>
                </section>

                {contentReady ? (
                    <section className="space-y-4 border-t border-[var(--border)] pt-5" aria-labelledby="landing-edit-title">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h3 id="landing-edit-title" className="text-sm font-bold text-fg">Revisa y edita tu página</h3>
                                <p className="mt-1 text-xs leading-5 text-fg-muted">La vista previa de la derecha muestra el borrador. Los servicios, precios, horarios y datos de contacto vienen de tu agenda.</p>
                            </div>
                            <span className="rounded-full border border-[var(--accent-border)] bg-[var(--accent-subtle)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-ink)]">Borrador editable</span>
                        </div>
                        <div className="grid gap-4">
                            <Field label="Titular" value={content.heroHeadline} onChange={(value) => setContentField('heroHeadline', value)} maxLength={90} hint="Aparece en la portada, junto al nombre del negocio." />
                            <Field label="Bajada" value={content.heroSubheadline} onChange={(value) => setContentField('heroSubheadline', value)} maxLength={180} multiline rows={2} hint="Explica en una frase qué puede hacer la persona." />
                            <Field label="Título de presentación" value={content.aboutTitle} onChange={(value) => setContentField('aboutTitle', value)} maxLength={80} />
                            <Field label="Presentación" value={content.aboutText} onChange={(value) => setContentField('aboutText', value)} maxLength={900} multiline rows={5} hint="Verifica que refleje exactamente tu experiencia y forma de atender." />
                        </div>
                        {content.highlights.length ? (
                            <div className="space-y-3">
                                <div>
                                    <h4 className="text-sm font-semibold text-fg">Puntos clave</h4>
                                    <p className="mt-1 text-xs text-fg-muted">Se muestran como bloques breves bajo la presentación.</p>
                                </div>
                                <Field label="Título de la sección" value={content.highlightsTitle} onChange={(value) => setContentField('highlightsTitle', value)} maxLength={80} />
                                {content.highlights.map((item, index) => (
                                    <div key={index} className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
                                        <Field label={`Título ${index + 1}`} value={item.title} onChange={(value) => updateHighlight(index, 'title', value)} maxLength={48} />
                                        <Field label="Descripción" value={item.description} onChange={(value) => updateHighlight(index, 'description', value)} maxLength={150} multiline rows={2} />
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <div className="rounded-xl border border-[var(--border)]">
                            <button type="button" onClick={() => setShowSeo((value) => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 text-left text-sm font-semibold text-fg" aria-expanded={showSeo}>
                                <span>Vista en Google (SEO)</span><IconChevronDown size={16} className={`transition-transform ${showSeo ? 'rotate-180' : ''}`} />
                            </button>
                            {showSeo ? (
                                <div className="grid gap-4 border-t border-[var(--border)] p-3.5">
                                    <Field label="Título para buscadores" value={content.seoTitle} onChange={(value) => setContentField('seoTitle', value)} maxLength={65} />
                                    <Field label="Descripción para buscadores" value={content.seoDescription} onChange={(value) => setContentField('seoDescription', value)} maxLength={170} multiline rows={2} />
                                </div>
                            ) : null}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <button type="button" onClick={() => void handleSave()} disabled={saving || publishing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-fg transition hover:bg-[var(--bg-subtle)] disabled:opacity-60">
                                {saving ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
                                Guardar borrador
                            </button>
                            <button type="button" onClick={() => void handlePublish()} disabled={publishing || saving || !contentReady} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-[var(--accent-contrast)] transition hover:brightness-95 disabled:opacity-60">
                                {publishing ? <IconLoader2 size={16} className="animate-spin" /> : <IconWorld size={16} />}
                                {profile.isPublished ? 'Publicar cambios en mi link' : 'Guardar y revisar antes de publicar'}
                            </button>
                        </div>
                        {pendingChanges ? <p className="text-xs text-fg-muted">Tienes cambios sin guardar. Guarda el borrador para verlos en la vista previa.</p> : null}
                    </section>
                ) : null}

                {notice ? (
                    <PanelNotice tone={notice.tone}>
                        <span className="flex items-start gap-2"><IconInfoCircle size={16} className="mt-0.5 shrink-0" />{notice.message}</span>
                    </PanelNotice>
                ) : null}

            </div>
        </PanelCard>
    );
}
