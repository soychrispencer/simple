'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
    getOperatorSubtypes,
    getOperatorTierOptions,
    isOperatorSubtypeOther,
    normalizeOperatorSubtype,
    type PostRegistrationWizardAnswers,
    type WorkspaceVertical,
    type OperatorTier,
} from '@simple/utils';
import { BrandLogo } from '../brand/index.js';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelChoiceCard, PanelNotice } from './panel-primitives.js';
import { PanelField } from './panel-display.js';

export type SerenatasInitialRole = 'client' | 'musician' | 'owner';

type SaveResult = { ok: boolean; error?: string };

type Props = {
    vertical: WorkspaceVertical;
    initialStep?: number;
    initialAnswers?: Record<string, unknown>;
    initialAccountKind?: OperatorTier | null;
    initialSubtype?: string | null;
    initialSubtypeCustom?: string | null;
    initialAccountName?: string;
    isPersonalAccount?: boolean | null;
    existingBusinessWorkspaceNames?: string[];
    onProgress: (step: number, answers: PostRegistrationWizardAnswers) => Promise<SaveResult>;
    onComplete: (answers: PostRegistrationWizardAnswers) => Promise<SaveResult>;
    onDefer: (step: number, answers: PostRegistrationWizardAnswers) => Promise<SaveResult>;
};

type Choice = { id: string; label: string; description: string };

const PRODUCT_LABEL: Record<WorkspaceVertical, string> = {
    propiedades: 'SimplePropiedades',
    autos: 'SimpleAutos',
    agenda: 'SimpleAgenda',
    serenatas: 'SimpleSerenatas',
};

const ROLE_PROMPT: Record<Exclude<WorkspaceVertical, 'serenatas'>, string> = {
    propiedades: '¿Cómo trabajas con propiedades?',
    autos: '¿Cómo trabajas con vehículos?',
    agenda: '¿Cómo organizas tu agenda?',
};

const SERENATAS_ROLES: Choice[] = [
    { id: 'client', label: 'Quiero contratar', description: 'Buscar una serenata y organizar una celebración.' },
    { id: 'musician', label: 'Quiero trabajar como músico', description: 'Mostrar mi perfil y recibir oportunidades.' },
    { id: 'owner', label: 'Administro un mariachi o servicio', description: 'Organizar mi grupo y sus solicitudes.' },
];

function getFirstTasks(vertical: WorkspaceVertical, answers: PostRegistrationWizardAnswers): Choice[] {
    if (vertical === 'serenatas') {
        if (answers.serenataRole === 'musician') {
            return [{ id: 'complete_musician_profile', label: 'Completar mi perfil de músico', description: 'Actívalo desde el selector de trabajo y agrega tus instrumentos y zonas.' }];
        }
        if (answers.serenataRole === 'owner') {
            return [{ id: 'prepare_provider_profile', label: 'Preparar mi negocio', description: 'Completa los datos de tu grupo o servicio.' }];
        }
        return [{ id: 'request_serenata', label: 'Encontrar una serenata', description: 'Explora opciones para tu celebración.' }];
    }

    if (vertical === 'propiedades') {
        if (answers.accountKind === 'company' && answers.operatorSubtype === 'developer') {
            return [
                { id: 'publish_project', label: 'Presentar un proyecto', description: 'Organiza el proyecto y sus unidades.' },
                { id: 'organize_contacts', label: 'Ordenar mis contactos', description: 'Empieza por tu cartera y seguimiento.' },
            ];
        }
        if (answers.accountKind === 'individual') {
            return [
                { id: 'publish_property', label: 'Publicar una propiedad', description: 'Crea un aviso con los datos y fotos del inmueble.' },
                { id: 'organize_contacts', label: 'Ordenar mis contactos', description: 'Guarda interesados y próximos pasos.' },
            ];
        }
        return [
            { id: 'load_portfolio', label: 'Cargar mi cartera', description: 'Reúne publicaciones propias o administradas.' },
            { id: 'organize_contacts', label: 'Ordenar mis contactos', description: 'Centraliza consultas y seguimiento.' },
        ];
    }

    if (vertical === 'autos') {
        if (answers.accountKind === 'individual') {
            return [
                { id: 'publish_vehicle', label: 'Publicar un vehículo', description: 'Crea un aviso con fotos y características.' },
                { id: 'organize_contacts', label: 'Ordenar mis contactos', description: 'Guarda consultas y próximos pasos.' },
            ];
        }
        return [
            { id: 'load_inventory', label: 'Cargar mi inventario', description: 'Reúne vehículos propios o en consignación.' },
            { id: 'organize_contacts', label: 'Ordenar mis contactos', description: 'Centraliza consultas y seguimiento.' },
        ];
    }

    if (answers.accountKind === 'company') {
        return [
            { id: 'configure_team_services', label: 'Configurar servicios y equipo', description: 'Prepara la agenda para tu centro o negocio.' },
            { id: 'set_availability', label: 'Definir disponibilidad', description: 'Organiza cuándo atiende cada profesional.' },
            { id: 'share_booking_link', label: 'Compartir mi agenda', description: 'Facilita que tus clientes reserven.' },
        ];
    }
    return [
        { id: 'configure_services', label: 'Configurar mis servicios', description: 'Define qué ofreces y cuánto dura cada atención.' },
        { id: 'set_availability', label: 'Definir mi disponibilidad', description: 'Organiza los horarios que quieres ofrecer.' },
        { id: 'share_booking_link', label: 'Compartir mi agenda', description: 'Facilita que tus clientes reserven.' },
    ];
}

function handleRadioGroupKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const nextKey = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const previousKey = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    if (!nextKey && !previousKey) return;

    const radios = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
        .filter((radio) => !radio.disabled);
    if (radios.length < 2) return;

    event.preventDefault();
    const activeIndex = radios.indexOf(document.activeElement as HTMLButtonElement);
    const selectedIndex = radios.findIndex((radio) => radio.getAttribute('aria-checked') === 'true');
    const currentIndex = activeIndex >= 0 ? activeIndex : Math.max(0, selectedIndex);
    const nextIndex = (currentIndex + (nextKey ? 1 : -1) + radios.length) % radios.length;
    radios[nextIndex]?.focus();
    radios[nextIndex]?.click();
}

export function PostRegistrationRoleWizard({
    vertical,
    initialStep = 0,
    initialAnswers,
    initialAccountKind = null,
    initialSubtype,
    initialSubtypeCustom,
    initialAccountName,
    isPersonalAccount,
    existingBusinessWorkspaceNames = [],
    onProgress,
    onComplete,
    onDefer,
}: Props) {
    const [step, setStep] = useState(Math.max(0, Math.min(initialStep, vertical === 'serenatas' ? 1 : 2)));
    const [accountKind, setAccountKind] = useState<OperatorTier | null>(
        isPersonalAccount === false ? 'company' : (initialAnswers?.accountKind as OperatorTier | undefined) ?? initialAccountKind,
    );
    const [subtype, setSubtype] = useState<string | null>(
        typeof initialAnswers?.operatorSubtype === 'string' ? initialAnswers.operatorSubtype : initialSubtype ?? null,
    );
    const [subtypeCustom, setSubtypeCustom] = useState(
        typeof initialAnswers?.operatorSubtypeCustom === 'string' ? initialAnswers.operatorSubtypeCustom : initialSubtypeCustom ?? '',
    );
    const [companyName, setCompanyName] = useState(() => {
        const existingBusinessName = isPersonalAccount === true && existingBusinessWorkspaceNames.length === 1
            ? existingBusinessWorkspaceNames[0]
            : null;
        if (existingBusinessName) return existingBusinessName;
        if (typeof initialAnswers?.companyName === 'string') return initialAnswers.companyName;
        return isPersonalAccount === false ? initialAccountName ?? '' : '';
    });
    const [serenataRole, setSerenataRole] = useState<SerenatasInitialRole | null>(
        initialAnswers?.serenataRole === 'client' || initialAnswers?.serenataRole === 'musician' || initialAnswers?.serenataRole === 'owner'
            ? initialAnswers.serenataRole
            : null,
    );
    const [firstTask, setFirstTask] = useState(typeof initialAnswers?.firstTask === 'string' ? initialAnswers.firstTask : '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const stepContentRef = useRef<HTMLDivElement>(null);
    const stepHeadingRef = useRef<HTMLHeadingElement>(null);
    const dialogRef = useRef<HTMLElement>(null);

    const tiers = vertical === 'serenatas' ? [] : getOperatorTierOptions(vertical);
    const isSharedBusiness = vertical !== 'serenatas' && isPersonalAccount === false;
    const existingBusinessWorkspaceName = isPersonalAccount === true && existingBusinessWorkspaceNames.length === 1
        ? existingBusinessWorkspaceNames[0]
        : null;
    const resolvedCompanyName = isSharedBusiness
        ? initialAccountName || companyName
        : existingBusinessWorkspaceName || companyName;
    const subtypeOptions = useMemo(
        () => vertical === 'serenatas' || !accountKind ? [] : getOperatorSubtypes(vertical, accountKind),
        [accountKind, vertical],
    );
    const savedAccountKindSuggestion = vertical !== 'serenatas'
        && isPersonalAccount === true
        && typeof initialAccountKind === 'string'
        && typeof initialAnswers?.accountKind !== 'string'
        ? tiers.find((option) => option.tier === initialAccountKind)?.label ?? null
        : null;
    const savedSubtypeSuggestion = vertical !== 'serenatas'
        && typeof initialSubtype === 'string'
        && typeof initialAnswers?.operatorSubtype !== 'string'
        ? subtypeOptions.find((option) => option.id === initialSubtype)?.label ?? null
        : null;
    const savedAccountKindAnswer = vertical !== 'serenatas'
        && !isSharedBusiness
        && typeof initialAnswers?.accountKind === 'string'
        ? tiers.find((option) => option.tier === initialAnswers.accountKind)?.label ?? null
        : null;
    const savedSubtypeAnswer = vertical !== 'serenatas'
        && typeof initialAnswers?.operatorSubtype === 'string'
        ? subtypeOptions.find((option) => option.id === initialAnswers.operatorSubtype)?.label ?? null
        : null;
    const savedSerenataRoleAnswer = vertical === 'serenatas'
        && (initialAnswers?.serenataRole === 'client' || initialAnswers?.serenataRole === 'musician' || initialAnswers?.serenataRole === 'owner')
        ? SERENATAS_ROLES.find((option) => option.id === initialAnswers.serenataRole)?.label ?? null
        : null;
    const selectedCustomSubtype = isOperatorSubtypeOther(subtype);
    const tasks = useMemo(
        () => getFirstTasks(vertical, { accountKind: accountKind ?? 'individual', operatorSubtype: subtype ?? undefined, serenataRole: serenataRole ?? undefined }),
        [accountKind, serenataRole, subtype, vertical],
    );
    const hasValidFirstTask = tasks.some((task) => task.id === firstTask);
    const savedFirstTaskAnswer = tasks.find((task) => task.id === firstTask)?.label ?? null;
    const finalStep = vertical === 'serenatas' ? 1 : 2;
    const totalSteps = finalStep + 1;
    const activeStepLabel = step === 0 ? 'Tu forma de trabajar' : step === 1 && vertical !== 'serenatas' ? 'Tu actividad' : 'Tu primer paso';
    const hasActivity = vertical === 'serenatas'
        ? Boolean(serenataRole)
        : Boolean(accountKind && subtype) && (!selectedCustomSubtype || Boolean(subtypeCustom.trim())) && (accountKind !== 'company' || Boolean(resolvedCompanyName.trim()));
    const canContinue = step === 0
        ? (vertical === 'serenatas'
            ? Boolean(serenataRole)
            : Boolean(accountKind) && !(accountKind === 'company' && isPersonalAccount === true && existingBusinessWorkspaceNames.length > 1))
        : step === 1 && vertical !== 'serenatas'
            ? hasActivity
            : hasValidFirstTask;

    useEffect(() => {
        const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        return () => {
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        };
    }, []);

    useEffect(() => {
        stepHeadingRef.current?.focus({ preventScroll: true });
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const animation = stepContentRef.current?.animate(
            [
                { opacity: 0, transform: 'translateY(8px)' },
                { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 220, easing: 'ease-out' },
        );
        return () => animation?.cancel();
    }, [step]);

    function getAnswers(): PostRegistrationWizardAnswers {
        if (vertical === 'serenatas') {
            return { serenataRole: serenataRole ?? undefined, firstTask: hasValidFirstTask ? firstTask : undefined };
        }
        return {
            accountKind: accountKind ?? undefined,
            operatorSubtype: subtype ?? undefined,
            operatorSubtypeCustom: selectedCustomSubtype ? subtypeCustom.trim() : '',
            companyName: accountKind === 'company' ? resolvedCompanyName.trim() : undefined,
            firstTask: hasValidFirstTask ? firstTask : undefined,
        };
    }

    async function advance() {
        if (!canContinue || saving) return;
        setSaving(true);
        setError(null);
        const answers = getAnswers();
        try {
            if (step === finalStep) {
                const result = await onComplete(answers);
                if (!result.ok) setError(result.error ?? 'No pudimos guardar tus preferencias. Inténtalo nuevamente.');
                return;
            }
            const nextStep = step + 1;
            const result = await onProgress(nextStep, answers);
            if (!result.ok) {
                setError(result.error ?? 'No pudimos guardar tu avance. Inténtalo nuevamente.');
                return;
            }
            setStep(nextStep);
        } catch {
            setError('No pudimos guardar tus preferencias. Inténtalo nuevamente.');
        } finally {
            setSaving(false);
        }
    }

    async function goBack() {
        if (step <= 0 || saving) return;
        const previousStep = step - 1;
        setSaving(true);
        setError(null);
        try {
            const result = await onProgress(previousStep, getAnswers());
            if (!result.ok) {
                setError(result.error ?? 'No pudimos guardar tu avance. Inténtalo nuevamente.');
                return;
            }
            setStep(previousStep);
        } catch {
            setError('No pudimos guardar tu avance. Inténtalo nuevamente.');
        } finally {
            setSaving(false);
        }
    }

    async function defer() {
        if (saving) return;
        setSaving(true);
        setError(null);
        try {
            const result = await onDefer(step, getAnswers());
            if (!result.ok) setError(result.error ?? 'No pudimos guardar el avance.');
        } catch {
            setError('No pudimos guardar el avance. Inténtalo nuevamente.');
        } finally {
            setSaving(false);
        }
    }

    function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
        if (event.key === 'Escape') {
            event.preventDefault();
            void defer();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? []).filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
        if (!focusable.length) {
            event.preventDefault();
            dialogRef.current?.focus({ preventScroll: true });
            return;
        }

        const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
        if (event.shiftKey && activeIndex <= 0) {
            event.preventDefault();
            focusable[focusable.length - 1]?.focus();
        } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === focusable.length - 1)) {
            event.preventDefault();
            focusable[0]?.focus();
        }
    }

    return (
        <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-onboarding-step-title"
            aria-describedby="role-onboarding-step-description"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="role-onboarding-gate fixed inset-0 z-[80] overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
            style={{ background: 'var(--bg)' }}
        >
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center">
                <div className="mb-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <BrandLogo appId={`simple${vertical}` as 'simplepropiedades' | 'simpleautos' | 'simpleagenda' | 'simpleserenatas'} size="sm" />
                        <div className="hidden sm:block">
                            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Tu cuenta Simple</p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{PRODUCT_LABEL[vertical]}</p>
                        </div>
                    </div>
                    <PanelButton type="button" variant="ghost" onClick={() => void defer()} disabled={saving}>
                        Ahora no
                    </PanelButton>
                </div>

                <PanelCard size="lg" className="overflow-hidden p-0 lg:h-[min(46rem,calc(100dvh-3rem))]">
                    <div className="grid lg:h-full lg:min-h-0 lg:grid-cols-[0.9fr_1.1fr] lg:grid-rows-[minmax(0,1fr)]">
                        <div className="hidden flex-col justify-between gap-7 p-6 sm:p-8 lg:flex lg:p-10" style={{ background: 'color-mix(in srgb, var(--accent) 7%, var(--surface))' }}>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                                    Empecemos por lo que necesitas
                                </p>
                                <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: 'var(--fg)' }}>
                                    Dejemos tu espacio a tu medida
                                </h1>
                                <p className="mt-3 max-w-md text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                                    Responde unas preguntas cortas y te mostraremos primero las herramientas que te sirven. Puedes cambiar tu actividad más adelante.
                                </p>
                            </div>
                            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Tu forma de trabajar puede cambiar</p>
                                <p className="mt-1 text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>
                                    Esta orientación organiza tu punto de partida. No cambia permisos ya asignados ni activa un plan o cobro.
                                </p>
                            </div>
                        </div>

                        <div className="p-6 pb-28 sm:p-8 sm:pb-28 lg:flex lg:min-h-0 lg:flex-col lg:p-10 lg:pb-0">
                            <div className="mb-5 lg:hidden">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                                    Empecemos por lo que necesitas
                                </p>
                                <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                                    Dejemos tu espacio a tu medida
                                </p>
                            </div>
                            <div className="mb-7 lg:shrink-0">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>Paso {step + 1} de {totalSteps}</p>
                                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{activeStepLabel}</p>
                                </div>
                                <div
                                    className="flex gap-2"
                                    role="progressbar"
                                    aria-label="Progreso de configuración"
                                    aria-valuemin={1}
                                    aria-valuemax={totalSteps}
                                    aria-valuenow={step + 1}
                                    aria-valuetext={`Paso ${step + 1} de ${totalSteps}: ${activeStepLabel}`}
                                >
                                    {Array.from({ length: totalSteps }, (_, index) => (
                                        <span aria-hidden="true" key={index} className="h-1.5 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none" style={{ background: index <= step ? 'var(--accent)' : 'var(--border)' }} />
                                    ))}
                                </div>
                            </div>

                            <div key={step} ref={stepContentRef} className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-4">
                                {step === 0 ? (
                                    <>
                                        <h2 id="role-onboarding-step-title" ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight focus:outline-none" style={{ color: 'var(--fg)' }}>
                                            {vertical === 'serenatas'
                                                ? '¿Qué quieres hacer en SimpleSerenatas?'
                                                : isSharedBusiness
                                                    ? 'Estás configurando un espacio de empresa'
                                                    : ROLE_PROMPT[vertical]}
                                        </h2>
                                        <p id="role-onboarding-step-description" className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                                            {vertical === 'serenatas'
                                                ? 'Puedes sumar otros perfiles más adelante con la misma cuenta.'
                                                : isSharedBusiness
                                                    ? 'El tipo de este espacio ya está definido. Ahora elegiremos la actividad que mejor describe al equipo.'
                                                    : 'Elige la opción que más se parece a tu trabajo de hoy.'}
                                        </p>
                                        {savedSerenataRoleAnswer ? (
                                            <p className="mt-2 text-sm leading-5" style={{ color: 'var(--accent)' }}>
                                                Tu respuesta guardada: {savedSerenataRoleAnswer}. Puedes confirmarla o elegir otra.
                                            </p>
                                        ) : null}
                                        {savedAccountKindAnswer ? (
                                            <p className="mt-2 text-sm leading-5" style={{ color: 'var(--accent)' }}>
                                                Tu respuesta guardada: {savedAccountKindAnswer}. Puedes confirmarla o cambiarla.
                                            </p>
                                        ) : savedAccountKindSuggestion ? (
                                            <p className="mt-2 text-sm leading-5" style={{ color: 'var(--accent)' }}>
                                                Por la información guardada en tu espacio, te sugerimos {savedAccountKindSuggestion}. Puedes confirmarlo o elegir otra opción.
                                            </p>
                                        ) : null}
                                        <p className="mt-1 text-xs leading-4 lg:hidden" style={{ color: 'var(--fg-muted)' }}>
                                            No cambia permisos ya asignados ni activa un plan o cobro.
                                        </p>
                                        <div className="mt-5 grid gap-3" role="radiogroup" aria-labelledby="role-onboarding-step-title" onKeyDown={handleRadioGroupKeyDown}>
                                            {vertical === 'serenatas' ? SERENATAS_ROLES.map((option) => {
                                                return (
                                                    <PanelChoiceCard
                                                        key={option.id}
                                                        selected={serenataRole === option.id}
                                                        selectionMode="radio"
                                                        tabIndex={serenataRole === option.id || (!serenataRole && option.id === SERENATAS_ROLES[0]?.id) ? 0 : -1}
                                                        disabled={saving}
                                                        onClick={() => {
                                                            setSerenataRole(option.id as SerenatasInitialRole);
                                                            setFirstTask('');
                                                        }}
                                                        className="w-full"
                                                    >
                                                        <span className="block font-semibold" style={{ color: 'var(--fg)' }}>{option.label}</span>
                                                        <span className="mt-1 block text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>{option.description}</span>
                                                    </PanelChoiceCard>
                                                );
                                            }) : isSharedBusiness ? (
                                                <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                                    <p className="font-semibold" style={{ color: 'var(--fg)' }}>{companyName || 'Empresa'}</p>
                                                    <p className="mt-1 text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>
                                                        El equipo y los permisos asignados se mantienen tal como están.
                                                    </p>
                                                </div>
                                            ) : tiers.map((option) => (
                                                <PanelChoiceCard
                                                    key={option.tier}
                                                    selected={accountKind === option.tier}
                                                    selectionMode="radio"
                                                    tabIndex={accountKind === option.tier || (!accountKind && option.tier === tiers[0]?.tier) ? 0 : -1}
                                                    disabled={saving}
                                                    onClick={() => {
                                                        setAccountKind(option.tier);
                                                        setSubtype(null);
                                                        setSubtypeCustom('');
                                                        setFirstTask('');
                                                    }}
                                                    className="w-full"
                                                >
                                                    <span className="block font-semibold" style={{ color: 'var(--fg)' }}>{option.label}</span>
                                                    <span className="mt-1 block text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>{option.description}</span>
                                                </PanelChoiceCard>
                                            ))}
                                        </div>
                                        {!isSharedBusiness && accountKind === 'company' && isPersonalAccount === true ? (
                                            <div className="mt-4 rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                                {existingBusinessWorkspaceNames.length === 1 ? (
                                                    <>
                                                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>Usaremos {existingBusinessWorkspaceName}</p>
                                                        <p className="mt-1 text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>Tu espacio personal seguirá disponible para cambiar cuando quieras.</p>
                                                    </>
                                                ) : existingBusinessWorkspaceNames.length > 1 ? (
                                                    <>
                                                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>Elige primero el espacio de empresa</p>
                                                        <p className="mt-1 text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>Pulsa “Ahora no”, cambia al espacio que quieres configurar y vuelve a continuar.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="font-semibold" style={{ color: 'var(--fg)' }}>Tu cuenta personal se mantiene</p>
                                                        <p className="mt-1 text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>Al terminar, abriremos un espacio de empresa separado. Podrás volver al personal desde el selector.</p>
                                                        <p className="mt-2 text-xs leading-4" style={{ color: 'var(--fg-muted)' }}>Es un espacio de trabajo en Simple; no constituye ni registra legalmente una empresa.</p>
                                                    </>
                                                )}
                                            </div>
                                        ) : null}
                                    </>
                                ) : step === 1 && vertical !== 'serenatas' ? (
                                    <>
                                        <h2 id="role-onboarding-step-title" ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight focus:outline-none" style={{ color: 'var(--fg)' }}>
                                            ¿Qué describe mejor tu actividad?
                                        </h2>
                                        <p id="role-onboarding-step-description" className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                                            Con esto ordenamos las herramientas que verás primero. No es un permiso ni define quién puede administrar el espacio.
                                        </p>
                                        {savedSubtypeAnswer ? (
                                            <p className="mt-2 text-sm leading-5" style={{ color: 'var(--accent)' }}>
                                                Tu respuesta guardada: {savedSubtypeAnswer}. Puedes confirmarla o cambiarla.
                                            </p>
                                        ) : savedSubtypeSuggestion ? (
                                            <p className="mt-2 text-sm leading-5" style={{ color: 'var(--accent)' }}>
                                                Según la actividad guardada, te sugerimos {savedSubtypeSuggestion}. Puedes mantenerla o elegir otra.
                                            </p>
                                        ) : null}
                                        <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="role-onboarding-step-title" onKeyDown={handleRadioGroupKeyDown}>
                                            {subtypeOptions.map((option) => (
                                                <PanelChoiceCard
                                                    key={option.id}
                                                    selected={subtype === option.id}
                                                    selectionMode="radio"
                                                    tabIndex={subtype === option.id || (!subtype && option.id === subtypeOptions[0]?.id) ? 0 : -1}
                                                    disabled={saving}
                                                    onClick={() => {
                                                        if (!accountKind) return;
                                                        const normalized = normalizeOperatorSubtype(vertical, accountKind, option.id);
                                                        setSubtype(normalized);
                                                        if (!isOperatorSubtypeOther(normalized)) setSubtypeCustom('');
                                                        setFirstTask('');
                                                    }}
                                                    className="min-h-24"
                                                >
                                                    <span className="block font-semibold" style={{ color: 'var(--fg)' }}>{option.label}</span>
                                                    {option.description ? <span className="mt-1 block text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>{option.description}</span> : null}
                                                </PanelChoiceCard>
                                            ))}
                                        </div>
                                        {accountKind === 'company' ? (
                                            <PanelField label={vertical === 'agenda' ? 'Nombre de tu centro o equipo' : vertical === 'autos' ? 'Nombre de tu empresa o automotora' : 'Nombre de tu empresa o espacio'} required>
                                                <input
                                                    value={resolvedCompanyName}
                                                    maxLength={160}
                                                    disabled={saving || isPersonalAccount === false || Boolean(existingBusinessWorkspaceName)}
                                                    onChange={(event) => setCompanyName(event.target.value)}
                                                    placeholder={vertical === 'agenda' ? 'Ej. Centro Vida' : vertical === 'autos' ? 'Ej. Automotora del Valle' : 'Ej. Inmobiliaria del Valle'}
                                                    className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                                />
                                            </PanelField>
                                        ) : null}
                                        {selectedCustomSubtype ? (
                                            <PanelField label="Cuéntanos brevemente a qué te dedicas" required>
                                                <input
                                                    value={subtypeCustom}
                                                    maxLength={160}
                                                    disabled={saving}
                                                    onChange={(event) => setSubtypeCustom(event.target.value)}
                                                    placeholder="Describe tu actividad"
                                                    className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                                                    style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--fg)' }}
                                                />
                                            </PanelField>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <h2 id="role-onboarding-step-title" ref={stepHeadingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight focus:outline-none" style={{ color: 'var(--fg)' }}>
                                            ¿Qué te gustaría resolver primero?
                                        </h2>
                                        <p id="role-onboarding-step-description" className="mt-2 text-sm leading-6" style={{ color: 'var(--fg-muted)' }}>
                                            Elegiremos una primera vista útil. Después podrás acceder al resto de Simple.
                                        </p>
                                        {savedFirstTaskAnswer ? (
                                            <p className="mt-2 text-sm leading-5" style={{ color: 'var(--accent)' }}>
                                                Tu primera tarea guardada: {savedFirstTaskAnswer}. Puedes confirmarla o elegir otra.
                                            </p>
                                        ) : null}
                                        <div className="mt-5 grid gap-3" role="radiogroup" aria-labelledby="role-onboarding-step-title" onKeyDown={handleRadioGroupKeyDown}>
                                            {tasks.map((task) => (
                                                <PanelChoiceCard
                                                    key={task.id}
                                                    selected={firstTask === task.id}
                                                    selectionMode="radio"
                                                    tabIndex={firstTask === task.id || (!firstTask && task.id === tasks[0]?.id) ? 0 : -1}
                                                    disabled={saving}
                                                    onClick={() => setFirstTask(task.id)}
                                                    className="w-full"
                                                >
                                                    <span className="block font-semibold" style={{ color: 'var(--fg)' }}>{task.label}</span>
                                                    <span className="mt-1 block text-sm leading-5" style={{ color: 'var(--fg-muted)' }}>{task.description}</span>
                                                </PanelChoiceCard>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {error ? <div role="alert" className="lg:shrink-0"><PanelNotice tone="error" className="mt-5">{error}</PanelNotice></div> : null}

                            <div className="fixed inset-x-0 bottom-0 z-20 mt-0 flex flex-wrap items-center justify-between gap-3 border-t px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:static lg:mt-auto lg:shrink-0 lg:border-t lg:px-0 lg:pt-5 lg:pb-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                                <PanelButton type="button" variant="ghost" onClick={() => void goBack()} disabled={saving || step === 0}>
                                    Volver
                                </PanelButton>
                                <PanelButton type="button" variant="primary" onClick={() => void advance()} loading={saving} disabled={!canContinue}>
                                    {step === finalStep ? 'Preparar mi espacio' : 'Continuar'}
                                </PanelButton>
                            </div>
                        </div>
                    </div>
                </PanelCard>
            </div>
        </section>
    );
}
