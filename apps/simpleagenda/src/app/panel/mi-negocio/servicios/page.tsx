'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
    BusinessCatalogTabs,
    AGENDA_BUSINESS_CATALOG_HREFS,
    BusinessCatalogServiceEditor,
    BusinessCatalogAgendaServiceFields,
    PanelConfirmProvider,
    AGENDA_BUSINESS_SERVICIOS_PAGE,
    type BusinessCatalogServiceAdapter,
    type BusinessCatalogServiceFormValues,
} from '@simple/ui/panel';
import {
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
import { AgendaMiNegocioShell } from '@/components/panel/agenda-mi-negocio-shell';
import { businessSectionTabs } from '@/components/panel/panel-section-tabs';
import {
    fetchAgendaServices,
    createAgendaService,
    updateAgendaService,
    deleteAgendaService,
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
    const adapter = useMemo((): BusinessCatalogServiceAdapter<AgendaService, AgendaServiceForm> => ({
        load: async () => ({ ok: true, items: await fetchAgendaServices() }),
        save: async (id, form) => {
            const result = id
                ? await updateAgendaService(id, buildAgendaServicePayload(form))
                : await createAgendaService(buildAgendaServicePayload(form));
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'Error al guardar.' };
        },
        toggle: async (service) => {
            const result = await updateAgendaService(service.id, { isActive: !service.isActive });
            return { ok: result.ok, error: result.error };
        },
        remove: async (service) => {
            const result = await deleteAgendaService(service.id);
            return result.ok ? { ok: true } : { ok: false, error: 'No se pudo archivar el servicio.' };
        },
        toForm: serviceToForm,
        validate: validateAgendaServiceForm,
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
                meta: metaParts.join(' · '),
                footer: isGroup ? (
                    <Link
                        href={`/panel/mi-negocio/servicios/${service.id}`}
                        className="pl-1 text-xs text-accent hover:underline"
                    >
                        Gestionar asistentes
                    </Link>
                ) : undefined,
            };
        },
    }), []);

    return (
        <AgendaMiNegocioShell
            activeKey="servicios"
            tabs={businessSectionTabs}
            title={AGENDA_BUSINESS_SERVICIOS_PAGE.title}
            description={AGENDA_BUSINESS_SERVICIOS_PAGE.description}
        >
            <div className="space-y-6">
                <BusinessCatalogTabs active="services" variant="links" hrefs={AGENDA_BUSINESS_CATALOG_HREFS} />

                <BusinessCatalogServiceEditor
                    adapter={adapter}
                    emptyForm={AGENDA_EMPTY_SERVICE}
                    formLayout="modal"
                    resolveFormFieldsProps={({ form, setForm }) => ({
                        showPromoPrice: false,
                        extraFields: (
                            <BusinessCatalogAgendaServiceFields
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
                                preconsultFields={form.preconsultFields}
                                onPreconsultFieldsChange={(preconsultFields) => setForm((prev) => ({ ...prev, preconsultFields }))}
                            />
                        ),
                    })}
                    copy={{
                        modalDescription: 'Citas individuales o sesiones grupales con cupo limitado.',
                        emptyTitle: 'Sin servicios aún',
                        emptyDescription: 'Agrega citas individuales o sesiones grupales.',
                        archiveMessage: (name) => `"${name}" dejará de estar disponible. Podrás reactivarlo con el interruptor.`,
                    }}
                />
            </div>
        </AgendaMiNegocioShell>
    );
}
