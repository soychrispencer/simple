'use client';

import { useMemo } from 'react';
import {
    BusinessCatalogServiceEditor,
    BusinessCatalogSerenatasServiceFields,
    type BusinessCatalogServiceAdapter,
    type BusinessCatalogServiceFormValues,
} from '@simple/ui/panel';
import {
    DEFAULT_BUSINESS_CALENDAR_COLOR,
    DEFAULT_BUSINESS_SERVICE_MODALITY_PRESENTIAL_FIRST,
    formatBusinessServiceModality,
    validateBusinessServiceModality,
    validateOperatorPromoPrice,
} from '@simple/utils';
import { serenatasApi, type ProviderGroup, type ProviderGroupService } from '@/lib/serenatas-api';
import { money } from './shared';
import { serviceEffectivePrice, serviceHasPromoPrice } from '@/lib/service-pricing';

type SerenataServiceForm = BusinessCatalogServiceFormValues & {
    musiciansCount: string;
    eventType: string;
    songsIncluded: string;
    isOnline: boolean;
    isPresential: boolean;
};

const EMPTY_SERVICE: SerenataServiceForm = {
    name: '',
    description: '',
    imageUrl: '',
    durationMinutes: '45',
    price: '45000',
    promoPrice: '',
    color: DEFAULT_BUSINESS_CALENDAR_COLOR,
    musiciansCount: '3',
    eventType: '',
    songsIncluded: '0',
    ...DEFAULT_BUSINESS_SERVICE_MODALITY_PRESENTIAL_FIRST,
};

function serviceToForm(service: ProviderGroupService): SerenataServiceForm {
    return {
        name: service.name,
        description: service.description ?? '',
        imageUrl: service.imageUrl ?? '',
        durationMinutes: String(service.durationMinutes),
        price: String(service.price),
        promoPrice: service.promoPrice == null ? '' : String(service.promoPrice),
        color: service.color ?? DEFAULT_BUSINESS_CALENDAR_COLOR,
        musiciansCount: String(service.musiciansCount),
        eventType: service.eventType ?? '',
        songsIncluded: String(service.songsIncluded ?? 0),
        isOnline: service.isOnline,
        isPresential: service.isPresential,
    };
}

function validateSerenataServiceForm(values: SerenataServiceForm): string | null {
    const price = Number(values.price);
    const promoPrice = values.promoPrice.trim() === '' ? null : Number(values.promoPrice);
    const musiciansCount = Number(values.musiciansCount);
    const durationMinutes = Number(values.durationMinutes);

    if (!values.name.trim()) {
        return 'Ingresa un nombre para el servicio.';
    }
    if (!Number.isFinite(price) || price < 1000) {
        return 'El precio mínimo es $1.000 CLP.';
    }
    const promoError = validateOperatorPromoPrice(price, values.promoPrice);
    if (promoError) return promoError;
    if (promoPrice != null && promoPrice < 1000) {
        return 'El precio oferta mínimo es $1.000 CLP.';
    }
    if (!Number.isFinite(musiciansCount) || musiciansCount < 1) {
        return 'Indica al menos 1 músico.';
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes < 15) {
        return 'La duración mínima es 15 minutos.';
    }
    return validateBusinessServiceModality(values);
}

function buildSerenataServicePayload(values: SerenataServiceForm) {
    const price = Number(values.price);
    const promoPrice = values.promoPrice.trim() === '' ? null : Number(values.promoPrice);
    const musiciansCount = Number(values.musiciansCount);
    const durationMinutes = Number(values.durationMinutes);
    const songsIncluded = Math.max(0, Math.floor(Number(values.songsIncluded) || 0));

    return {
        name: values.name.trim(),
        description: values.description.trim() || null,
        imageUrl: values.imageUrl.trim() || null,
        musiciansCount: Math.floor(musiciansCount),
        durationMinutes: Math.floor(durationMinutes),
        price: Math.floor(price),
        promoPrice: promoPrice == null ? null : Math.floor(promoPrice),
        eventType: values.eventType.trim() || null,
        songsIncluded,
        color: values.color || null,
        isOnline: values.isOnline,
        isPresential: values.isPresential,
        repertoirePolicy: 'any_active' as const,
    };
}

export function ProviderServicesEditor({
    group,
    ensureGroup,
    onSaved,
}: {
    group: ProviderGroup | null;
    ensureGroup: () => Promise<ProviderGroup | null>;
    onSaved: () => Promise<void>;
}) {
    const adapter = useMemo((): BusinessCatalogServiceAdapter<ProviderGroupService, SerenataServiceForm> => ({
        load: async () => {
            if (!group?.id) return { ok: true, items: [] };
            const response = await serenatasApi.providerGroupServices(group.id);
            if (!response.ok) {
                return { ok: false, error: response.error ?? 'No se pudieron cargar los servicios.' };
            }
            return { ok: true, items: response.items };
        },
        save: async (id, values) => {
            const activeGroup = group ?? await ensureGroup();
            if (!activeGroup) {
                return { ok: false, error: 'No pudimos guardar el servicio.' };
            }
            const payload = buildSerenataServicePayload(values);
            const response = id
                ? await serenatasApi.updateProviderGroupService(activeGroup.id, id, payload)
                : await serenatasApi.createProviderGroupService(activeGroup.id, payload);
            return response.ok
                ? { ok: true }
                : { ok: false, error: response.error ?? 'No se pudo guardar el servicio.' };
        },
        toggle: async (service) => {
            if (!group?.id) return { ok: false, error: 'No se pudo actualizar el servicio.' };
            const response = await serenatasApi.updateProviderGroupService(group.id, service.id, {
                isActive: !service.isActive,
            });
            return response.ok
                ? { ok: true }
                : { ok: false, error: response.error ?? 'No se pudo actualizar el servicio.' };
        },
        remove: async (service) => {
            if (!group?.id) return { ok: false, error: 'No se pudo eliminar el servicio.' };
            const response = await serenatasApi.deleteProviderGroupService(group.id, service.id);
            return response.ok
                ? { ok: true }
                : { ok: false, error: response.error ?? 'No se pudo eliminar el servicio.' };
        },
        toForm: serviceToForm,
        validate: validateSerenataServiceForm,
        getRowProps: (service) => {
            const hasPromo = serviceHasPromoPrice(service);
            const displayPrice = serviceEffectivePrice(service);
            const metaParts = [
                formatBusinessServiceModality(service),
                `${service.musiciansCount} músicos`,
                `${service.durationMinutes} min`,
                hasPromo ? (
                    <>
                        <span className="line-through opacity-70">{money(service.price)}</span>
                        {' '}
                        <span className="font-semibold text-accent">{money(displayPrice)}</span>
                    </>
                ) : money(service.price),
                service.eventType || null,
                (service.songsIncluded ?? 0) > 0
                    ? `Hasta ${service.songsIncluded} canción${service.songsIncluded === 1 ? '' : 'es'} a elegir`
                    : null,
            ].filter(Boolean);

            return {
                imageUrl: service.imageUrl,
                description: service.description,
                accentColor: service.color ?? undefined,
                meta: (
                    <>
                        {metaParts.map((part, index) => (
                            <span key={index}>
                                {index > 0 ? ' · ' : null}
                                {part}
                            </span>
                        ))}
                    </>
                ),
            };
        },
    }), [group, ensureGroup]);

    return (
        <BusinessCatalogServiceEditor
            adapter={adapter}
            emptyForm={EMPTY_SERVICE}
            resetKey={group?.id}
            formLayout="modal"
            onSaved={onSaved}
            resolveFormFieldsProps={({ form, setForm }) => ({
                namePlaceholder: 'Trío clásico',
                descriptionPlaceholder: 'Repertorio variado, vestimenta formal, desplazamiento en RM…',
                showModality: true,
                isOnline: form.isOnline,
                isPresential: form.isPresential,
                onModalityChange: (key, value) => setForm((prev) => ({ ...prev, [key]: value })),
                extraFields: (
                    <BusinessCatalogSerenatasServiceFields
                        values={{
                            eventType: form.eventType,
                            musiciansCount: form.musiciansCount,
                            songsIncluded: form.songsIncluded,
                        }}
                        onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))}
                    />
                ),
            })}
            copy={{
                emptyTitle: 'Aún no hay servicios',
                emptyDescription: 'Usa el botón Nuevo servicio arriba a la derecha para publicar tu primer paquete (trío, duración y precio).',
                modalDescription: 'Lo verán los clientes al contratar una serenata contigo.',
                createSubmitLabel: 'Crear servicio',
                editSubmitLabel: 'Guardar cambios',
                archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse en el marketplace. Podrás reactivarlo con el interruptor.`,
            }}
        />
    );
}
