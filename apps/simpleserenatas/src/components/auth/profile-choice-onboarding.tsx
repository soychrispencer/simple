'use client';

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconBriefcase,
    IconCalendarHeart,
    IconCheck,
    IconChevronRight,
    IconLoader2,
    IconMusic,
    IconUsersGroup,
} from '@tabler/icons-react';
import { useAuth } from '@simple/auth';
import { BrandLogo } from '@simple/ui/brand';
import { PanelButton, PanelNotice } from '@simple/ui/panel';
import { SerenatasChromeHeader } from '@/components/layout/serenatas-chrome-header';
import { Footer } from '@/components/layout/footer';
import { hasAnySerenataProfile } from '@/lib/app-mode';
import { panelMiNegocioHref } from '@/lib/panel-routes';
import { serenatasApi, type ActiveProfile, type Profiles } from '@/lib/serenatas-api';

type Choice = {
    key: ActiveProfile;
    title: string;
    description: string;
    icon: ComponentType<{ size?: number; className?: string }>;
    benefits: string[];
    cta: string;
    destination: string;
};

const CHOICES: Choice[] = [
    {
        key: 'client',
        title: 'Soy cliente',
        description: 'Quiero contratar una serenata para una fecha especial.',
        icon: IconCalendarHeart,
        benefits: ['Buscar mariachis por zona', 'Solicitar fecha y horario', 'Guardar grupos favoritos'],
        cta: 'Contratar serenata',
        destination: '/mariachis',
    },
    {
        key: 'musician',
        title: 'Soy músico',
        description: 'Quiero tocar en grupos de mariachi y recibir invitaciones.',
        icon: IconMusic,
        benefits: ['Crear perfil musical', 'Recibir invitaciones de grupos', 'Revisar agenda de presentaciones'],
        cta: 'Crear perfil de músico',
        destination: '/panel/mi-cuenta?account_tab=musico',
    },
    {
        key: 'owner',
        title: 'Soy dueño',
        description: 'Quiero registrar mi grupo, probar SimpleSerenatas y mantenerlo activo con Esencial o Pro.',
        icon: IconUsersGroup,
        benefits: ['Prueba gratis por 30 días', 'Publicar grupo y servicios', 'Sin comisión por serenata'],
        cta: 'Registrar mi grupo',
        destination: panelMiNegocioHref('datos'),
    },
];

export function ProfileChoiceOnboarding() {
    const router = useRouter();
    const { user, isLoggedIn, authLoading, openAuth, refreshSession } = useAuth();
    const [profiles, setProfiles] = useState<Profiles | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState<ActiveProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }
        if (user?.status && user.status !== 'verified') {
            router.replace('/');
            return;
        }

        let cancelled = false;
        setLoading(true);
        void serenatasApi.profiles().then((response) => {
            if (cancelled) return;
            if (!response.ok) {
                setError(response.error ?? 'No pudimos cargar tu cuenta.');
                setLoading(false);
                return;
            }
            setProfiles(response.profiles);
            setLoading(false);
            if (hasAnySerenataProfile(response.profiles)) {
                router.replace('/panel');
            }
        });

        return () => {
            cancelled = true;
        };
    }, [authLoading, isLoggedIn, router, user?.status]);

    const likelyMariachiName = useMemo(() => {
        const name = user?.name?.toLowerCase() ?? '';
        return /\b(mariachi|mariachis|grupo|musical|rancher|serenata|serenatas)\b/.test(name);
    }, [user?.name]);

    async function choose(choice: Choice) {
        if (!user || submitting) return;
        setSubmitting(choice.key);
        setError(null);

        try {
            let current = profiles;
            if (!current) {
                const profileResponse = await serenatasApi.profiles();
                if (!profileResponse.ok) throw new Error(profileResponse.error ?? 'No pudimos cargar tu cuenta.');
                current = profileResponse.profiles;
            }
            if (hasAnySerenataProfile(current)) {
                router.replace('/panel');
                return;
            }

            if (choice.key === 'client') {
                if (likelyMariachiName) {
                    const confirmed = window.confirm(
                        'Parece que estás registrando un mariachi o grupo musical. ¿Seguro que quieres continuar como cliente para contratar serenatas?',
                    );
                    if (!confirmed) {
                        setSubmitting(null);
                        return;
                    }
                }
                const response = await serenatasApi.saveClientProfile({});
                if (!response.ok) throw new Error(response.error ?? 'No pudimos crear tu perfil de cliente.');
            } else if (choice.key === 'musician') {
                const response = await serenatasApi.saveMusicianProfile({
                    hasInstrument: false,
                    hasMariachiAttire: false,
                    workZones: [],
                });
                if (!response.ok) throw new Error(response.error ?? 'No pudimos crear tu perfil de músico.');
            } else {
                const response = await serenatasApi.registerOwner();
                if (!response.ok) throw new Error(response.error ?? 'No pudimos crear tu perfil de dueño.');
            }

            await refreshSession();
            router.replace(choice.destination);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No pudimos completar la configuración.');
            setSubmitting(null);
        }
    }

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
                <div className="text-center">
                    <IconLoader2 className="mx-auto mb-4 animate-spin text-accent" size={34} />
                    <BrandLogo appId="simpleserenatas" size="md" />
                    <p className="mt-3 text-sm text-fg-muted">Preparando tu cuenta...</p>
                </div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="flex min-h-screen flex-col bg-bg text-fg">
                <SerenatasChromeHeader showPrimaryAction={false} />
                <main className="container-app flex flex-1 items-center justify-center py-16">
                    <div className="max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-sm">
                        <BrandLogo appId="simpleserenatas" size="md" className="justify-center" />
                        <h1 className="mt-5 text-2xl font-bold">Primero inicia sesión</h1>
                        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                            Para elegir cómo usarás SimpleSerenatas necesitamos tener tu cuenta creada.
                        </p>
                        <div className="mt-6 grid gap-2 sm:grid-cols-2">
                            <PanelButton variant="secondary" onClick={() => openAuth('login')}>Iniciar sesión</PanelButton>
                            <PanelButton onClick={() => openAuth('register')}>Registrarse</PanelButton>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col overflow-x-hidden bg-bg text-fg">
            <SerenatasChromeHeader showPrimaryAction={false} />
            <main className="flex-1">
                <section className="border-b border-border bg-bg-subtle">
                    <div className="container-app max-w-6xl py-10 sm:py-14">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                                <IconBriefcase size={14} />
                                Configura tu cuenta
                            </div>
                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-fg sm:text-5xl">
                                ¿Qué quieres hacer en SimpleSerenatas?
                            </h1>
                            <p className="mt-3 text-base leading-relaxed text-fg-muted sm:text-lg">
                                Elige una opción para activar el panel correcto. Después podrás completar tus datos con calma.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="container-app max-w-6xl py-8 sm:py-12">
                    {error ? <PanelNotice tone="error" className="mb-5">{error}</PanelNotice> : null}
                    <div className="grid gap-4 lg:grid-cols-3">
                        {CHOICES.map((choice) => (
                            <button
                                key={choice.key}
                                type="button"
                                disabled={Boolean(submitting)}
                                onClick={() => void choose(choice)}
                                className="group flex min-h-[24rem] flex-col rounded-card border border-border bg-surface p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg disabled:cursor-wait disabled:opacity-70 sm:p-6"
                            >
                                <div className="flex size-13 items-center justify-center rounded-button bg-accent-soft text-accent">
                                    {submitting === choice.key ? (
                                        <IconLoader2 className="animate-spin" size={25} />
                                    ) : (
                                        <choice.icon size={25} />
                                    )}
                                </div>
                                <h2 className="mt-5 text-2xl font-bold text-fg">{choice.title}</h2>
                                <p className="mt-2 min-h-12 text-sm leading-relaxed text-fg-muted">
                                    {choice.description}
                                </p>
                                <ul className="mt-5 space-y-3 text-sm text-fg-secondary">
                                    {choice.benefits.map((benefit) => (
                                        <li key={benefit} className="flex gap-2">
                                            <IconCheck size={17} className="mt-0.5 shrink-0 text-accent" />
                                            <span>{benefit}</span>
                                        </li>
                                    ))}
                                </ul>
                                <span className="btn btn-primary mt-auto h-11 w-full justify-center font-semibold">
                                    {choice.cta}
                                    <IconChevronRight size={17} />
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
