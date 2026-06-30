'use client';

import { useMemo } from 'react';
import {
    BusinessCatalogPromotionEditor,
    EMPTY_CATALOG_PROMOTION_FORM,
    validateCatalogPromotionAppliesTo,
    type BusinessCatalogPromotionAdapter,
    type CatalogPromotionFormValues,
} from '@simple/ui/panel';
import {
    serenatasApi,
    type ProviderGroup,
    type ProviderGroupService,
    type ProviderGroupServicePromotion,
} from '@/lib/serenatas-api';
import { formatPromotionDates, formatPromotionDiscountLabel } from '@/lib/serenata-catalog-display';

type SerenataPromotionItem = ProviderGroupServicePromotion & { name: string };

const EMPTY_PROMO: CatalogPromotionFormValues = EMPTY_CATALOG_PROMOTION_FORM;

function toDateInputValue(iso: string | null) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

function promoToForm(promo: ProviderGroupServicePromotion): CatalogPromotionFormValues {
    return {
        label: promo.label,
        description: promo.description ?? '',
        code: '',
        discountType: promo.discountType,
        discountValue: String(promo.discountValue),
        appliesTo: promo.appliesTo,
        serviceIds: promo.serviceIds,
        minAmount: '',
        maxUses: '',
        startsAt: toDateInputValue(promo.startsAt),
        endsAt: toDateInputValue(promo.endsAt),
        isActive: promo.isActive,
    };
}

function validatePromotionForm(values: CatalogPromotionFormValues): string | null {
    const discountValue = Number(values.discountValue);
    if (!values.label.trim() || !Number.isFinite(discountValue) || discountValue <= 0) {
        return 'Etiqueta y descuento son requeridos.';
    }
    if (values.discountType === 'percent' && discountValue > 100) {
        return 'El porcentaje no puede superar 100.';
    }
    return validateCatalogPromotionAppliesTo(values);
}

export function ProviderGroupPromotionsEditor({
    group,
    services,
    onSaved,
}: {
    group: ProviderGroup | null;
    services: ProviderGroupService[];
    onSaved: () => Promise<void>;
}) {
    const serviceOptions = useMemo(
        () => services.filter((service) => service.isActive).map((service) => ({ id: service.id, name: service.name })),
        [services],
    );

    const adapter = useMemo((): BusinessCatalogPromotionAdapter<SerenataPromotionItem> => ({
        load: async () => {
            if (!group?.id) return { ok: true, items: [] };
            const response = await serenatasApi.providerGroupServicePromotions(group.id);
            if (!response.ok) return { ok: false, error: response.error ?? 'No se pudieron cargar las promociones.' };
            return {
                ok: true,
                items: response.items.map((promo) => ({ ...promo, name: promo.label })),
            };
        },
        save: async (id, values) => {
            if (!group?.id) return { ok: false, error: 'No se pudo guardar la promoción.' };
            const payload = {
                label: values.label.trim(),
                description: values.description.trim() || null,
                discountType: values.discountType,
                discountValue: Number(values.discountValue),
                appliesTo: values.appliesTo,
                serviceIds: values.appliesTo === 'services' ? values.serviceIds : [],
                startsAt: values.startsAt ? new Date(`${values.startsAt}T12:00:00.000Z`).toISOString() : null,
                endsAt: values.endsAt ? new Date(`${values.endsAt}T12:00:00.000Z`).toISOString() : null,
                isActive: values.isActive,
            };
            const response = id
                ? await serenatasApi.updateProviderGroupServicePromotion(group.id, id, payload)
                : await serenatasApi.createProviderGroupServicePromotion(group.id, payload);
            if (!response.ok) return { ok: false, error: response.error ?? 'No se pudo guardar la promoción.' };
            return { ok: true };
        },
        toggle: async (promo) => {
            if (!group?.id) return { ok: false };
            await serenatasApi.updateProviderGroupServicePromotion(group.id, promo.id, { isActive: !promo.isActive });
            return { ok: true };
        },
        remove: async (promo) => {
            if (!group?.id) return { ok: false, error: 'No se pudo eliminar la promoción.' };
            const response = await serenatasApi.deleteProviderGroupServicePromotion(group.id, promo.id);
            return response.ok
                ? { ok: true }
                : { ok: false, error: response.error ?? 'No se pudo eliminar la promoción.' };
        },
        toForm: promoToForm,
        validate: validatePromotionForm,
        getRowProps: (promo) => ({
            description: promo.description,
            meta: [formatPromotionDiscountLabel(promo), formatPromotionDates(promo)].filter(Boolean).join(' · '),
        }),
    }), [group?.id]);

    return (
        <BusinessCatalogPromotionEditor
            adapter={adapter}
            emptyForm={EMPTY_PROMO}
            services={serviceOptions}
            resetKey={group?.id}
            onSaved={onSaved}
            copy={{
                archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse en tu ficha. Podrás reactivarla con el interruptor.`,
            }}
        />
    );
}
