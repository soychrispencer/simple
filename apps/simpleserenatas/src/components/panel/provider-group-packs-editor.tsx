'use client';

import { useMemo } from 'react';
import {
    BusinessCatalogPackEditor,
    EMPTY_CATALOG_PACK_FORM,
    validateCatalogPackAppliesTo,
    type BusinessCatalogPackAdapter,
    type CatalogPackFormValues,
} from '@simple/ui/panel';
import { validateOperatorPromoPrice } from '@simple/utils';
import {
    serenatasApi,
    type ProviderGroup,
    type ProviderGroupService,
    type ProviderGroupServicePack,
} from '@/lib/serenatas-api';
import { formatPackPriceLabel } from '@/lib/serenata-catalog-display';

const EMPTY_PACK: CatalogPackFormValues = { ...EMPTY_CATALOG_PACK_FORM, price: '120000' };

function packToForm(pack: ProviderGroupServicePack): CatalogPackFormValues {
    return {
        name: pack.name,
        description: pack.description ?? '',
        price: String(pack.price),
        promoPrice: pack.promoPrice == null ? '' : String(pack.promoPrice),
        sessionsCount: String(pack.sessionsCount),
        validityDays: pack.validityDays == null ? '' : String(pack.validityDays),
        imageUrl: pack.imageUrl ?? '',
        appliesTo: pack.appliesTo,
        serviceIds: pack.serviceIds,
        isActive: pack.isActive,
    };
}

function validatePackForm(values: CatalogPackFormValues): string | null {
    const price = Number(values.price);
    const promoPrice = values.promoPrice.trim() === '' ? null : Number(values.promoPrice);
    const sessionsCount = Number(values.sessionsCount);
    if (!values.name.trim() || !Number.isFinite(price) || price <= 0) {
        return 'Nombre y precio son requeridos.';
    }
    if (!Number.isFinite(sessionsCount) || sessionsCount < 1) {
        return 'Debe incluir al menos 1 serenata.';
    }
    const promoError = validateOperatorPromoPrice(price, values.promoPrice);
    if (promoError) return promoError;
    if (promoPrice != null && promoPrice < 1000) {
        return 'El precio oferta mínimo es $1.000 CLP.';
    }
    return validateCatalogPackAppliesTo(values);
}

export function ProviderGroupPacksEditor({
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

    const adapter = useMemo((): BusinessCatalogPackAdapter<ProviderGroupServicePack> => ({
        load: async () => {
            if (!group?.id) return { ok: true, items: [] };
            const response = await serenatasApi.providerGroupServicePacks(group.id);
            if (!response.ok) return { ok: false, error: response.error ?? 'No se pudieron cargar los packs.' };
            return { ok: true, items: response.items };
        },
        save: async (id, values) => {
            if (!group?.id) return { ok: false, error: 'No pudimos guardar el pack.' };
            const price = Number(values.price);
            const promoPrice = values.promoPrice.trim() === '' ? null : Number(values.promoPrice);
            const payload = {
                name: values.name.trim(),
                description: values.description.trim() || null,
                imageUrl: values.imageUrl.trim() || null,
                price,
                promoPrice,
                sessionsCount: Number(values.sessionsCount),
                validityDays: values.validityDays.trim() === '' ? null : Number(values.validityDays),
                appliesTo: values.appliesTo,
                serviceIds: values.appliesTo === 'services' ? values.serviceIds : [],
                isActive: values.isActive,
            };
            const response = id
                ? await serenatasApi.updateProviderGroupServicePack(group.id, id, payload)
                : await serenatasApi.createProviderGroupServicePack(group.id, payload);
            if (!response.ok) return { ok: false, error: response.error ?? 'No se pudo guardar el pack.' };
            return { ok: true };
        },
        toggle: async (pack) => {
            if (!group?.id) return { ok: false };
            await serenatasApi.updateProviderGroupServicePack(group.id, pack.id, { isActive: !pack.isActive });
            return { ok: true };
        },
        remove: async (pack) => {
            if (!group?.id) return { ok: false, error: 'No se pudo eliminar el pack.' };
            const response = await serenatasApi.deleteProviderGroupServicePack(group.id, pack.id);
            return response.ok
                ? { ok: true }
                : { ok: false, error: response.error ?? 'No se pudo eliminar el pack.' };
        },
        toForm: packToForm,
        validate: validatePackForm,
        getRowProps: (pack) => ({
            imageUrl: pack.imageUrl,
            description: pack.description,
            meta: [
                `${pack.sessionsCount} serenata${pack.sessionsCount === 1 ? '' : 's'}`,
                formatPackPriceLabel(pack),
                pack.validityDays ? `${pack.validityDays} días de validez` : null,
            ].filter(Boolean).join(' · '),
        }),
    }), [group?.id]);

    return (
        <BusinessCatalogPackEditor
            adapter={adapter}
            emptyForm={EMPTY_PACK}
            services={serviceOptions}
            resetKey={group?.id}
            onSaved={onSaved}
            packFormFields={{
                sessionsLabel: 'Serenatas incluidas',
                namePlaceholder: 'Pack 3 serenatas',
            }}
            copy={{
                emptyDescription: 'Crea un pack o bono para vender serenatas agrupadas.',
                archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse en tu ficha. Podrás reactivarlo con el interruptor.`,
            }}
        />
    );
}
