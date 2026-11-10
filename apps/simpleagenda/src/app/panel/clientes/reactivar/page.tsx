'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    IconArrowLeft,
    IconBrandWhatsapp,
    IconCalendarEvent,
    IconLoader2,
    IconMail,
    IconSearch,
    IconSparkles,
} from '@tabler/icons-react';
import { AGENDA_PRICING, isPlatformLaunchActive } from '@simple/utils';
import {
    fetchAgendaAppointments,
    fetchAgendaClients,
    fetchAgendaProfile,
    hasAgendaProPlusAccess,
    type AgendaAppointment,
    type AgendaClient,
    type AgendaProfile,
} from '@/lib/agenda-api';
import { buildWhatsAppClickUrl, resolveClientWhatsAppPhone } from '@/lib/whatsapp-click';

type InactiveClient = {
    client: AgendaClient;
    lastVisit: Date;
    daysSinceVisit: number;
};

const INACTIVITY_OPTIONS = [30, 60, 90] as const;
type InactivityDays = (typeof INACTIVITY_OPTIONS)[number];
const DAY_MS = 86_400_000;

function lastCompletedVisits(appointments: AgendaAppointment[]): Map<string, Date> {
    const visits = new Map<string, Date>();
    const now = Date.now();
    for (const appointment of appointments) {
        if (appointment.status !== 'completed' || !appointment.clientId) continue;
        const date = new Date(appointment.startsAt);
        if (date.getTime() > now) continue;
        const previous = visits.get(appointment.clientId);
        if (!previous || date > previous) visits.set(appointment.clientId, date);
    }
    return visits;
}

function makeReactivationMessage(client: AgendaClient, bookingUrl: string): string {
    return [
        'Hola ' + client.firstName + ', ¿cómo has estado?',
        '',
        'Hace un tiempo que no nos vemos. Si quieres agendar una nueva atención, puedes elegir el horario que te acomode aquí:',
        bookingUrl,
        '',
        '¡Un saludo!',
    ].join('\n');
}

function formatLastVisit(date: Date): string {
    return date.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function ReactivarClientesPage() {
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [clients, setClients] = useState<AgendaClient[]>([]);
    const [appointments, setAppointments] = useState<AgendaAppointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [inactivityDays, setInactivityDays] = useState<InactivityDays>(60);
    const [query, setQuery] = useState('');

    useEffect(() => {
        let cancelled = false;
        void fetchAgendaProfile().then(async (nextProfile) => {
            if (cancelled) return;
            setProfile(nextProfile);
            if (!nextProfile || (!isPlatformLaunchActive('agenda') && !hasAgendaProPlusAccess(nextProfile))) return;
            const [nextClients, nextAppointments] = await Promise.all([
                fetchAgendaClients(),
                fetchAgendaAppointments(),
            ]);
            if (cancelled) return;
            setClients(nextClients);
            setAppointments(nextAppointments);
        }).catch(() => {
            if (!cancelled) setLoadError('No pudimos cargar tus clientes. Revisa la conexión e inténtalo otra vez.');
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    const inactiveClients = useMemo(() => {
        const visits = lastCompletedVisits(appointments);
        const now = Date.now();
        const cutoff = now - inactivityDays * DAY_MS;
        const clientsWithUpcomingBooking = new Set(
            appointments
                .filter((appointment) => (
                    (appointment.status === 'confirmed' || appointment.status === 'pending')
                    && new Date(appointment.startsAt).getTime() > now
                    && appointment.clientId
                ))
                .map((appointment) => appointment.clientId as string),
        );
        const search = query.trim().toLocaleLowerCase('es-CL');

        return clients.flatMap((client): InactiveClient[] => {
            if (client.status !== 'active' || clientsWithUpcomingBooking.has(client.id)) return [];
            const lastVisit = visits.get(client.id);
            if (!lastVisit || lastVisit.getTime() > cutoff) return [];
            const fullName = (client.firstName + ' ' + (client.lastName ?? '')).trim();
            if (search && !(fullName + ' ' + (client.email ?? '') + ' ' + (client.whatsapp ?? '') + ' ' + (client.phone ?? '')).toLocaleLowerCase('es-CL').includes(search)) return [];
            return [{
                client,
                lastVisit,
                daysSinceVisit: Math.floor((now - lastVisit.getTime()) / DAY_MS),
            }];
        }).sort((a, b) => b.daysSinceVisit - a.daysSinceVisit);
    }, [appointments, clients, inactivityDays, query]);

    const proPlusActive = Boolean(
        profile
        && (isPlatformLaunchActive('agenda') || hasAgendaProPlusAccess(profile)),
    );

    if (loading) {
        return (
            <div className="container-app flex min-h-[50vh] items-center justify-center">
                <IconLoader2 size={24} className="animate-spin text-(--accent)" aria-label="Cargando" />
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="container-app panel-page max-w-3xl py-6 lg:py-10">
                <Link href="/panel/clientes" className="inline-flex items-center gap-2 text-sm font-medium text-(--fg-secondary) hover:text-(--fg)">
                    <IconArrowLeft size={16} /> Volver a clientes
                </Link>
                <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{loadError}</p>
            </div>
        );
    }

    if (!proPlusActive) {
        return (
            <div className="container-app panel-page max-w-3xl py-6 lg:py-10">
                <Link href="/panel/clientes" className="inline-flex items-center gap-2 text-sm font-medium text-(--fg-secondary) hover:text-(--fg)">
                    <IconArrowLeft size={16} /> Volver a clientes
                </Link>
                <section className="mt-5 rounded-2xl border border-(--border) bg-(--surface) p-6 sm:p-8">
                    <span className="inline-flex size-12 items-center justify-center rounded-xl bg-(--accent-subtle) text-(--accent-ink)">
                        <IconSparkles size={24} />
                    </span>
                    <h1 className="mt-4 text-2xl font-bold text-(--fg)">Reactivación de clientes · Pro+</h1>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-(--fg-secondary)">
                        Encuentra clientes que llevan 30, 60 o 90 días sin una atención y prepara un mensaje personal para WhatsApp o correo. Revisas y envías cada mensaje.
                    </p>
                    <p className="mt-3 text-sm font-semibold text-(--fg)">
                        {'Desde $' + AGENDA_PRICING.proPlusMonthlyNetClp.toLocaleString('es-CL') + ' + IVA al mes'}
                    </p>
                    <Link href="/panel/mi-cuenta/suscripcion" className="agenda-button agenda-button--signal mt-5 inline-flex min-h-11 items-center justify-center px-5">
                        Ver y contratar Pro+
                    </Link>
                </section>
            </div>
        );
    }

    const appUrl = typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app');
    const bookingUrl = profile?.slug ? appUrl.replace(/\/$/, '') + '/' + profile.slug : appUrl;
    const contactableCount = inactiveClients.filter((item) => (
        Boolean(resolveClientWhatsAppPhone(item.client.whatsapp, item.client.phone) || item.client.email)
    )).length;

    return (
        <div className="container-app panel-page max-w-5xl py-4 lg:py-8">
            <Link href="/panel/clientes" className="inline-flex items-center gap-2 text-sm font-medium text-(--fg-secondary) hover:text-(--fg)">
                <IconArrowLeft size={16} /> Volver a clientes
            </Link>

            <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-(--accent-ink)">
                        <IconSparkles size={15} /> Incluido en Pro+
                    </p>
                    <h1 className="mt-2 text-2xl font-bold text-(--fg) sm:text-3xl">Reactivar clientes</h1>
                    <p className="mt-1 max-w-xl text-sm leading-relaxed text-(--fg-secondary)">
                        Encuentra a quienes llevan un tiempo sin volver. Prepara un mensaje personal y envíalo desde tu correo o WhatsApp.
                    </p>
                </div>
                <div className="rounded-xl border border-(--border) bg-(--surface) px-4 py-3 text-sm">
                    <span className="font-bold text-(--fg)">{inactiveClients.length}</span>
                    <span className="ml-1 text-(--fg-secondary)">clientes en este segmento</span>
                </div>
            </header>

            <div className="mt-5 rounded-xl border border-(--accent-border) bg-(--accent-subtle) p-3.5 text-sm leading-relaxed text-(--accent-ink)">
                Los mensajes no se envían automáticamente. Se abre una conversación individual con el texto listo; tú lo revisas y decides si enviarlo.
            </div>

            <section className="mt-5 rounded-2xl border border-(--border) bg-(--surface) p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-(--fg)">Sin una atención reciente</p>
                        <p className="mt-0.5 text-xs text-(--fg-muted)">Solo incluye clientes sin una cita próxima.</p>
                    </div>
                    <div className="inline-flex w-full rounded-xl border border-(--border) bg-(--bg-subtle) p-1 sm:w-auto" role="group" aria-label="Días desde la última atención">
                        {INACTIVITY_OPTIONS.map((days) => (
                            <button
                                key={days}
                                type="button"
                                aria-pressed={inactivityDays === days}
                                onClick={() => setInactivityDays(days)}
                                className={'min-h-9 flex-1 rounded-lg px-3 text-sm font-semibold transition-colors sm:flex-none ' + (inactivityDays === days ? 'bg-(--surface) text-(--fg) shadow-sm' : 'text-(--fg-secondary)')}
                            >
                                {days} días
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative mt-4">
                    <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--fg-muted)" />
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar cliente"
                        className="field-input field-input-with-leading-icon"
                    />
                </div>
            </section>

            {loadError ? (
                <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{loadError}</p>
            ) : inactiveClients.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-(--border) px-5 py-12 text-center">
                    <IconCalendarEvent size={28} className="mx-auto text-(--fg-muted)" />
                    <h2 className="mt-3 font-semibold text-(--fg)">No hay clientes en este segmento</h2>
                    <p className="mt-1 text-sm text-(--fg-secondary)">Prueba con otro plazo o revisa más adelante.</p>
                </div>
            ) : (
                <ul className="mt-5 grid gap-3">
                    {inactiveClients.map(({ client, lastVisit, daysSinceVisit }) => {
                        const fullName = (client.firstName + ' ' + (client.lastName ?? '')).trim();
                        const message = makeReactivationMessage(client, bookingUrl);
                        const phone = resolveClientWhatsAppPhone(client.whatsapp, client.phone);
                        const whatsappHref = phone ? buildWhatsAppClickUrl(phone, message) : null;
                        const emailHref = client.email
                            ? 'mailto:' + client.email
                                + '?subject=' + encodeURIComponent('¿Agendamos tu próxima atención?')
                                + '&body=' + encodeURIComponent(message)
                            : null;

                        return (
                            <li key={client.id} className="flex flex-col gap-4 rounded-2xl border border-(--border) bg-(--surface) p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                                <div className="min-w-0">
                                    <h2 className="truncate font-semibold text-(--fg)">{fullName}</h2>
                                    <p className="mt-1 text-sm text-(--fg-secondary)">
                                        Última atención: {formatLastVisit(lastVisit)} · Hace {daysSinceVisit} días
                                    </p>
                                    <p className="mt-1 truncate text-xs text-(--fg-muted)">{client.email || client.whatsapp || client.phone || 'Sin datos de contacto'}</p>
                                </div>
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    {whatsappHref ? (
                                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="agenda-button inline-flex min-h-10 items-center justify-center gap-2 px-3 text-sm">
                                            <IconBrandWhatsapp size={16} /> WhatsApp
                                        </a>
                                    ) : null}
                                    {emailHref ? (
                                        <a href={emailHref} className="agenda-button agenda-button--secondary inline-flex min-h-10 items-center justify-center gap-2 px-3 text-sm">
                                            <IconMail size={16} /> Correo
                                        </a>
                                    ) : null}
                                    {!whatsappHref && !emailHref ? (
                                        <Link href={'/panel/clientes?edit=' + client.id} className="agenda-button agenda-button--secondary inline-flex min-h-10 items-center justify-center px-3 text-sm">
                                            Agregar contacto
                                        </Link>
                                    ) : null}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <p className="mt-4 text-xs text-(--fg-muted)">{contactableCount} de {inactiveClients.length} clientes tienen un medio de contacto guardado.</p>
        </div>
    );
}
