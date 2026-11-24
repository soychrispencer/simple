'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
    BusinessCatalogTabs,
    AGENDA_BUSINESS_CATALOG_HREFS,
    BusinessCatalogServiceEditor,
    BusinessCatalogAgendaServiceFields,
    BusinessCatalogAgendaPreconsultFields,
    AgendaServiceKindSelector,
    PanelConfirmProvider,
    PanelNotice,
    AGENDA_BUSINESS_SERVICIOS_PAGE,
    type BusinessCatalogServiceAdapter,
    type BusinessCatalogServiceFormValues,
} from '@simple/ui/panel';
import {
    AGENDA_PRICING,
    AGENDA_SERVICE_KIND_LABELS,
    DEFAULT_BUSINESS_CALENDAR_COLOR,
    DEFAULT_BUSINESS_SERVICE_MODALITY_ONLINE_FIRST,
    isAgendaGroupService,
    validateBusinessServiceModality,
    formatBusinessServiceModality,
    filterAgendaPreconsultFieldsForSave,
    type AgendaServiceKind,
    type AgendaPreconsultField,
} from '@simple/utils';
import { AgendaMisServiciosShell } from '@/components/panel/agenda-mis-servicios-shell';
import { AgendaSetupTip } from '@/components/panel/agenda-setup-tip';
import {
    fetchAgendaServices,
    fetchAgendaProfile,
    fetchAgendaLocations,
    hasAgendaFullAccess,
    createAgendaService,
    updateAgendaService,
    deleteAgendaService,
    notifyAgendaSetupChanged,
    type AgendaLocation,
    type AgendaProfile,
    type AgendaService,
} from '@/lib/agenda-api';

type AgendaServiceForm = BusinessCatalogServiceFormValues & {
    kind: AgendaServiceKind;
    startsAt: string;
    capacity: string;
    location: string;
    meetingUrl: string;
    isOnline: boolean;
    isPresential: boolean;
    preconsultFields: AgendaPreconsultField[];
};

const AGENDA_EMPTY_SERVICE: AgendaServiceForm = {
    name: '',
    description: '',
    durationMinutes: '50',
    price: '',
    promoPrice: '',
    color: DEFAULT_BUSINESS_CALENDAR_COLOR,
    imageUrl: '',
    ...DEFAULT_BUSINESS_SERVICE_MODALITY_ONLINE_FIRST,
    kind: 'appointment',
    startsAt: '',
    capacity: '10',
    location: '',
    meetingUrl: '',
    preconsultFields: [],
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function serviceToForm(service: AgendaService): AgendaServiceForm {
    return {
        name: service.name,
        description: service.description ?? '',
        durationMinutes: String(service.durationMinutes),
        price: service.price ?? '',
        promoPrice: '',
        color: service.color ?? DEFAULT_BUSINESS_CALENDAR_COLOR,
        imageUrl: service.imageUrl ?? '',
        kind: service.kind ?? 'appointment',
        startsAt: toDatetimeLocalValue(service.startsAt),
        capacity: service.capacity != null ? String(service.capacity) : '10',
        location: service.location ?? '',
        meetingUrl: service.meetingUrl ?? '',
        isOnline: service.isOnline,
        isPresential: service.isPresential,
        preconsultFields: service.preconsultFields ?? [],
    };
}

function validateAgendaServiceForm(form: AgendaServiceForm): string | null {
    if (!form.name.trim()) return 'El nombre del servicio es requerido.';
    const durationMinutes = Number(form.durationMinutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
        return 'La duración mínima es 15 minutos.';
    }
    const modalityError = validateBusinessServiceModality(form);
    if (modalityError) return modalityError;
    if (form.kind === 'group_event') {
        if (!form.startsAt) return 'Indica fecha y hora de la sesión.';
        const capacity = Number(form.capacity);
        if (!Number.isFinite(capacity) || capacity < 1) return 'Cupo inválido.';
        if (form.isPresential && !form.location.trim()) return 'Indica la dirección del evento.';
    }
    return null;
}

function buildAgendaServicePayload(form: AgendaServiceForm) {
    const durationMinutes = Number(form.durationMinutes);
    const isGroup = form.kind === 'group_event';
    const body: Partial<AgendaService> & { kind?: AgendaServiceKind; capacity?: number; startsAt?: string } = {
        name: form.name.trim(),
        description: form.description || null,
        durationMinutes,
        price: form.price || null,
        color: form.color,
        imageUrl: form.imageUrl.trim() || null,
        kind: form.kind,
        isOnline: form.isOnline,
        isPresential: form.isPresential,
    };

    if (isGroup) {
        body.startsAt = new Date(form.startsAt).toISOString();
        body.capacity = Math.floor(Number(form.capacity));
        body.location = form.isPresential ? form.location.trim() : null;
        body.meetingUrl = form.isOnline ? form.meetingUrl.trim() || null : null;
        body.preconsultFields = [];
    } else {
        body.preconsultFields = filterAgendaPreconsultFieldsForSave(form.preconsultFields);
    }

    return body;
}

function formatAgendaServicePrice(service: AgendaService): string | null {
    if (!service.price) return null;
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: service.currency,
        minimumFractionDigits: 0,
    }).format(parseFloat(service.price));
}

export default function ServiciosConfigPage() {
    return (
        <PanelConfirmProvider>
            <ServiciosConfigPageContent />
        </PanelConfirmProvider>
    );
}

function ServiciosConfigPageContent() {
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [locations, setLocations] = useState<AgendaLocation[]>([]);
    const [services, setServices] = useState<AgendaService[]>([]);
    const servicesRef = useRef<AgendaService[]>([]);
    servicesRef.current = services;

    useEffect(() => {
        let active = true;
        const loadContext = async () => {
            const [loadedProfile, loadedLocations] = await Promise.all([
                fetchAgendaProfile(),
                fetchAgendaLocations().catch(() => [] as AgendaLocation[]),
            ]);
            if (!active) return;
            setProfile(loadedProfile);
            setLocations(loadedLocations);
        };
        void loadContext();
        const refresh = () => { void loadContext(); };
        window.addEventListener('simple:agenda-profile-changed', refresh);
        window.addEventListener('simple:agenda-setup-changed', refresh);
        return () => {
            active = false;
            window.removeEventListener('simple:agenda-profile-changed', refresh);
            window.removeEventListener('simple:agenda-setup-changed', refresh);
        };
    }, []);

    const hasFullAccess = !profile || hasAgendaFullAccess(profile);
    const activeCount = useMemo(() => services.filter((item) => item.isActive).length, [services]);
    const atFreeServiceLimit = !hasFullAccess && activeCount >= AGENDA_PRICING.free.activeServices;
    const defaultOnline = profile?.servesOnline ?? true;
    const defaultPresential = profile?.servesPresential ?? false;
    const emptyForm = useMemo<AgendaServiceForm>(() => ({
        ...AGENDA_EMPTY_SERVICE,
        isOnline: defaultOnline || !defaultPresential,
        isPresential: defaultPresential,
    }), [defaultOnline, defaultPresential]);
    const activeSavedLocations = useMemo(() => locations.filter((loc) => loc.isActive), [locations]);

    const adapter = useMemo((): BusinessCatalogServiceAdapter<AgendaService, AgendaServiceForm> => ({
        load: async () => ({ ok: true, items: await fetchAgendaServices() }),
        save: async (id, form) => {
            const result = id
                ? await updateAgendaService(id, buildAgendaServicePayload(form))
                : await createAgendaService(buildAgendaServicePayload(form));
            if (result.ok) notifyAgendaSetupChanged();
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'Error al guardar.' };
        },
        toggle: async (service) => {
            if (!hasFullAccess && !service.isActive) {
                const currentActive = servicesRef.current.filter((item) => item.isActive).length;
                if (currentActive >= AGENDA_PRICING.free.activeServices) {
                    return {
                        ok: false,
                        error: `Tu plan Gratis permite hasta ${AGENDA_PRICING.free.activeServices} servicios activos. Pausa otro servicio o pásate a Pro.`,
                    };
                }
            }
            const result = await updateAgendaService(service.id, { isActive: !service.isActive });
            if (result.ok) notifyAgendaSetupChanged();
            return { ok: result.ok, error: result.error };
        },
        remove: async (service) => {
            const result = await deleteAgendaService(service.id);
            if (result.ok) notifyAgendaSetupChanged();
            return result.ok ? { ok: true } : { ok: false, error: 'No se pudo archivar el servicio.' };
        },
        toForm: serviceToForm,
        validate: (form) => {
            if (!hasFullAccess && form.kind === 'group_event') {
                return 'Las sesiones grupales están disponibles desde Plan Pro.';
            }
            return validateAgendaServiceForm(form);
        },
        getRowProps: (service) => {
            const isGroup = isAgendaGroupService(service.kind);
            const metaParts = [
                AGENDA_SERVICE_KIND_LABELS[service.kind ?? 'appointment'],
                `${service.durationMinutes} min`,
                formatAgendaServicePrice(service),
                formatBusinessServiceModality(service),
                isGroup && service.startsAt
                    ? new Date(service.startsAt).toLocaleString('es-CL', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                    : null,
                isGroup && service.capacity != null
                    ? `${service.attendeeCount ?? 0}/${service.capacity} asistentes`
                    : null,
            ].filter(Boolean);

            return {
                imageUrl: service.imageUrl,
                description: service.description,
                accentColor: service.color ?? 'var(--accent)',
                emptyThumbnail: 'color',
                meta: metaParts.join(' · '),
                footer: isGroup ? (
                    <Link
                        href={`/panel/mis-servicios/${service.id}`}
                        className="pl-1 text-xs text-accent-ink hover:underline"
                    >
                        Gestionar asistentes
                    </Link>
                ) : undefined,
            };
        },
    }), [hasFullAccess]);

    return (
        <AgendaMisServiciosShell
            title={AGENDA_BUSINESS_SERVICIOS_PAGE.title}
            description={AGENDA_BUSINESS_SERVICIOS_PAGE.description}
        >
            <div className="space-y-6">
                <BusinessCatalogTabs active="services" variant="links" hrefs={AGENDA_BUSINESS_CATALOG_HREFS} />
                <AgendaSetupTip focusStepId="servicios" />

                {atFreeServiceLimit ? (
                    <PanelNotice tone="info">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                Estás usando {activeCount} de {AGENDA_PRICING.free.activeServices} servicios activos en tu plan Gratis. Pausa uno para activar otro o pásate a Pro.
                            </p>
                            <Link href="/panel/mi-negocio/plan" className="shrink-0 font-semibold underline-offset-2 hover:underline">
                                Ver planes →
                            </Link>
                        </div>
                    </PanelNotice>
                ) : null}

                <div id="agenda-first-service" className="scroll-mt-24">
                    <BusinessCatalogServiceEditor
                        adapter={adapter}
                        emptyForm={emptyForm}
                        formLayout="modal"
                        createActionDisabled={atFreeServiceLimit}
                        onItemsChange={setServices}
                        toolbarSummary={(items) => {
                            if (items.length === 0) return 'Sin servicios creados';
                            const active = items.filter((item) => item.isActive).length;
                            if (!hasFullAccess) {
                                return `${active} de ${AGENDA_PRICING.free.activeServices} servicios activos en plan Gratis`;
                            }
                            return `${active} activo${active === 1 ? '' : 's'} de ${items.length}`;
                        }}
                        resolveFormFieldsProps={({ form, setForm }) => {
                            const questionCount = form.preconsultFields.length;
                            const advancedSummaryHint = form.kind === 'group_event'
                                ? 'Color e imagen'
                                : questionCount > 0
                                    ? `${questionCount} pregunta${questionCount === 1 ? '' : 's'} al reservar`
                                    : 'Opcional';

                            return {
                                imageOptional: true,
                                priceOptional: true,
                                showPromoPrice: false,
                                durationPresets: [30, 45, 50, 60, 90],
                                collapseOptionalVisuals: true,
                                defaultAdvancedOpen: questionCount > 0,
                                advancedSummary: 'Color, imagen y preguntas al reservar',
                                advancedSummaryHint,
                                topFields: (
                                    <AgendaServiceKindSelector
                                        value={form.kind}
                                        onChange={(nextKind) => setForm((prev) => ({ ...prev, kind: nextKind }))}
                                        groupDisabled={!hasFullAccess}
                                    />
                                ),
                                extraFields: (
                                    <BusinessCatalogAgendaServiceFields
                                        showKindField={false}
                                        showPreconsult={false}
                                        groupDisabled={!hasFullAccess}
                                        savedLocations={activeSavedLocations}
                                        values={{
                                            kind: form.kind,
                                            startsAt: form.startsAt,
                                            capacity: form.capacity,
                                            location: form.location,
                                            meetingUrl: form.meetingUrl,
                                            isOnline: form.isOnline,
                                            isPresential: form.isPresential,
                                        }}
                                        onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
                                    />
                                ),
                                advancedExtraFields: form.kind !== 'group_event' ? (
                                    <BusinessCatalogAgendaPreconsultFields
                                        fields={form.preconsultFields}
                                        onChange={(preconsultFields) => setForm((prev) => ({ ...prev, preconsultFields }))}
                                    />
                                ) : undefined,
                            };
                        }}
                        copy={{
                            modalDescription: 'Define lo esencial para que puedan reservarte. El resto es opcional.',
                            emptyTitle: 'Todavía no pueden reservarte',
                            emptyDescription: 'Crea tu primer servicio con nombre y duración. Luego defines horario y publicas tu link.',
                            archiveMessage: (name) => `"${name}" dejará de estar disponible. Podrás reactivarlo con el interruptor.`,
                        }}
                    />
                </div>
            </div>
        </AgendaMisServiciosShell>
    );
}
