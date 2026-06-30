'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    createOperatorService,
    createOperatorServicePack,
    createOperatorServicePromotion,
    deleteOperatorService,
    deleteOperatorServicePack,
    deleteOperatorServicePromotion,
    fetchOperatorServicePacks,
    fetchOperatorServicePromotions,
    fetchOperatorServices,
    getOperatorServiceCategories,
    resolveOperatorServiceCategoryLabel,
    updateOperatorService,
    updateOperatorServicePack,
    updateOperatorServicePromotion,
    formatOperatorServicePrice,
    formatOperatorPromotionLabel,
    validateOperatorPromoPrice,
    DEFAULT_BUSINESS_CALENDAR_COLOR,
    DEFAULT_BUSINESS_SERVICE_MODALITY_HYBRID,
    validateBusinessServiceModality,
    formatBusinessServiceModality,
    type OperatorServicePackRecord,
    type OperatorServicePromotionRecord,
    type OperatorServiceRecord,
    type PublicProfileVertical,
} from '@simple/utils';
import { BusinessCatalogTabs } from './business-catalog-tabs.js';
import { BUSINESS_CATALOG_EDITOR_SECTION } from './business-copy.js';
import { BusinessCatalogServiceEditor } from './business-catalog-service-editor.js';
import { BusinessCatalogPackEditor } from './business-catalog-pack-editor.js';
import { BusinessCatalogPromotionEditor } from './business-catalog-promotion-editor.js';
import type { BusinessCatalogServiceFormValues } from './business-catalog-service-form-fields.js';
import {
    EMPTY_CATALOG_PACK_FORM,
    EMPTY_CATALOG_PROMOTION_FORM,
    validateCatalogPackAppliesTo,
    validateCatalogPromotionAppliesTo,
    type CatalogPackFormValues,
    type CatalogPromotionFormValues,
    type CatalogServiceOption,
} from './business-catalog-form-types.js';
import type { BusinessCatalogPackAdapter } from './business-catalog-pack-editor-types.js';
import type { BusinessCatalogPromotionAdapter } from './business-catalog-promotion-editor-types.js';
import type { BusinessCatalogServiceAdapter } from './business-catalog-service-editor-types.js';
import { PanelConfirmProvider } from './panel-confirm-provider.js';

type TabKey = 'services' | 'packs' | 'promotions';

type MarketplaceServiceForm = BusinessCatalogServiceFormValues & {
    category: string;
    pricingMode: 'fixed' | 'quote';
    isOnline: boolean;
    isPresential: boolean;
};

type MarketplacePromotionItem = OperatorServicePromotionRecord & { name: string };

const EMPTY_SERVICE: MarketplaceServiceForm = {
    name: '',
    description: '',
    imageUrl: '',
    category: 'other',
    pricingMode: 'fixed',
    price: '',
    promoPrice: '',
    durationMinutes: '',
    color: DEFAULT_BUSINESS_CALENDAR_COLOR,
    ...DEFAULT_BUSINESS_SERVICE_MODALITY_HYBRID,
};

const EMPTY_PACK: CatalogPackFormValues = { ...EMPTY_CATALOG_PACK_FORM, sessionsCount: '5' };
const EMPTY_PROMO: CatalogPromotionFormValues = EMPTY_CATALOG_PROMOTION_FORM;

function serviceToForm(service: OperatorServiceRecord): MarketplaceServiceForm {
    return {
        name: service.name,
        description: service.description ?? '',
        imageUrl: service.imageUrl ?? '',
        category: service.category,
        pricingMode: service.pricingMode,
        price: service.price ?? '',
        promoPrice: service.promoPrice ?? '',
        durationMinutes: service.durationMinutes ? String(service.durationMinutes) : '',
        color: service.color ?? DEFAULT_BUSINESS_CALENDAR_COLOR,
        isOnline: service.isOnline,
        isPresential: service.isPresential,
    };
}

function packToForm(pack: OperatorServicePackRecord): CatalogPackFormValues {
    return {
        name: pack.name,
        description: pack.description ?? '',
        price: pack.price,
        promoPrice: pack.promoPrice ?? '',
        sessionsCount: String(pack.sessionsCount),
        validityDays: pack.validityDays ? String(pack.validityDays) : '',
        imageUrl: pack.imageUrl ?? '',
        appliesTo: pack.appliesTo,
        serviceIds: pack.serviceIds,
        isActive: pack.isActive,
    };
}

function promoToForm(promo: OperatorServicePromotionRecord): CatalogPromotionFormValues {
    return {
        label: promo.label,
        description: promo.description ?? '',
        code: '',
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        appliesTo: promo.appliesTo,
        serviceIds: promo.serviceIds,
        minAmount: '',
        maxUses: '',
        startsAt: promo.startsAt ? promo.startsAt.slice(0, 10) : '',
        endsAt: promo.endsAt ? promo.endsAt.slice(0, 10) : '',
        isActive: promo.isActive,
    };
}

function validateMarketplaceService(form: MarketplaceServiceForm): string | null {
    if (!form.name.trim()) return 'El nombre del servicio es requerido.';
    const modalityError = validateBusinessServiceModality(form);
    if (modalityError) return modalityError;
    if (form.pricingMode === 'fixed') {
        const promoError = validateOperatorPromoPrice(form.price, form.promoPrice);
        if (promoError) return promoError;
    }
    return null;
}

function validateMarketplacePack(values: CatalogPackFormValues): string | null {
    if (!values.name.trim() || !values.price.trim()) return 'Nombre y precio son requeridos.';
    const promoError = validateOperatorPromoPrice(values.price, values.promoPrice);
    if (promoError) return promoError;
    return validateCatalogPackAppliesTo(values);
}

function validateMarketplacePromotion(values: CatalogPromotionFormValues): string | null {
    if (!values.label.trim() || !values.discountValue.trim()) return 'Etiqueta y descuento son requeridos.';
    const discount = Number(values.discountValue);
    if (!Number.isFinite(discount) || discount <= 0) return 'El descuento debe ser mayor a 0.';
    if (values.discountType === 'percent' && discount > 100) return 'El porcentaje no puede superar 100.';
    return validateCatalogPromotionAppliesTo(values);
}

function BusinessOperatorServicesEditorContent({ vertical }: { vertical: PublicProfileVertical }) {
    const categories = useMemo(() => getOperatorServiceCategories(vertical), [vertical]);
    const [tab, setTab] = useState<TabKey>('services');
    const [serviceOptions, setServiceOptions] = useState<CatalogServiceOption[]>([]);
    const [counts, setCounts] = useState({ services: 0, packs: 0, promotions: 0 });

    const refreshServiceOptions = useCallback(async () => {
        const response = await fetchOperatorServices(vertical);
        if (!response.ok) return;
        setServiceOptions(
            response.items
                .filter((service) => service.isActive)
                .map((service) => ({ id: service.id, name: service.name })),
        );
    }, [vertical]);

    useEffect(() => {
        void refreshServiceOptions();
    }, [refreshServiceOptions]);

    useEffect(() => {
        void Promise.all([
            fetchOperatorServices(vertical),
            fetchOperatorServicePacks(vertical),
            fetchOperatorServicePromotions(vertical),
        ]).then(([servicesResponse, packsResponse, promotionsResponse]) => {
            setCounts({
                services: servicesResponse.ok ? servicesResponse.items.filter((item) => item.isActive).length : 0,
                packs: packsResponse.ok ? packsResponse.items.filter((item) => item.isActive).length : 0,
                promotions: promotionsResponse.ok ? promotionsResponse.items.filter((item) => item.isActive).length : 0,
            });
        });
    }, [vertical]);

    const onServicesItemsChange = useCallback((items: Array<{ isActive: boolean }>) => {
        setCounts((prev) => ({
            ...prev,
            services: items.filter((item) => item.isActive).length,
        }));
    }, []);

    const onPacksItemsChange = useCallback((items: Array<{ isActive: boolean }>) => {
        setCounts((prev) => ({
            ...prev,
            packs: items.filter((item) => item.isActive).length,
        }));
    }, []);

    const onPromotionsItemsChange = useCallback((items: Array<{ isActive: boolean }>) => {
        setCounts((prev) => ({
            ...prev,
            promotions: items.filter((item) => item.isActive).length,
        }));
    }, []);

    const serviceAdapter = useMemo((): BusinessCatalogServiceAdapter<OperatorServiceRecord, MarketplaceServiceForm> => ({
        load: async () => {
            const response = await fetchOperatorServices(vertical);
            return response.ok
                ? { ok: true, items: response.items }
                : { ok: false, error: response.error ?? 'No se pudieron cargar los servicios.' };
        },
        save: async (id, values) => {
            const payload = {
                name: values.name.trim(),
                description: values.description.trim() || null,
                imageUrl: values.imageUrl.trim() || null,
                category: values.category,
                pricingMode: values.pricingMode,
                price: values.pricingMode === 'fixed' && values.price ? values.price : null,
                promoPrice: values.promoPrice ? values.promoPrice : null,
                durationMinutes: values.durationMinutes ? Number(values.durationMinutes) : null,
                color: values.color || null,
                isOnline: values.isOnline,
                isPresential: values.isPresential,
            };
            const result = id
                ? await updateOperatorService(vertical, id, payload)
                : await createOperatorService(vertical, payload);
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'No se pudo guardar.' };
        },
        toggle: async (service) => {
            await updateOperatorService(vertical, service.id, { isActive: !service.isActive });
            return { ok: true };
        },
        remove: async (service) => {
            await deleteOperatorService(vertical, service.id);
            return { ok: true };
        },
        toForm: serviceToForm,
        validate: validateMarketplaceService,
        getRowProps: (service) => ({
            imageUrl: service.imageUrl,
            description: service.description,
            accentColor: service.color ?? undefined,
            meta: [
                formatOperatorServicePrice(service),
                formatBusinessServiceModality(service),
                resolveOperatorServiceCategoryLabel(vertical, service.category),
                service.durationMinutes ? `${service.durationMinutes} min` : null,
            ].filter(Boolean).join(' · '),
        }),
    }), [vertical]);

    const packAdapter = useMemo((): BusinessCatalogPackAdapter<OperatorServicePackRecord> => ({
        load: async () => {
            const response = await fetchOperatorServicePacks(vertical);
            return response.ok
                ? { ok: true, items: response.items }
                : { ok: false, error: response.error ?? 'No se pudieron cargar los packs.' };
        },
        save: async (id, values) => {
            const payload = {
                name: values.name.trim(),
                description: values.description.trim() || null,
                imageUrl: values.imageUrl.trim() || null,
                price: values.price.trim(),
                promoPrice: values.promoPrice.trim() || null,
                sessionsCount: Number(values.sessionsCount) || 1,
                validityDays: values.validityDays ? Number(values.validityDays) : null,
                appliesTo: values.appliesTo,
                serviceIds: values.appliesTo === 'services' ? values.serviceIds : [],
                isActive: values.isActive,
            };
            const result = id
                ? await updateOperatorServicePack(vertical, id, payload)
                : await createOperatorServicePack(vertical, payload);
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'No se pudo guardar el pack.' };
        },
        toggle: async (pack) => {
            await updateOperatorServicePack(vertical, pack.id, { isActive: !pack.isActive });
            return { ok: true };
        },
        remove: async (pack) => {
            await deleteOperatorServicePack(vertical, pack.id);
            return { ok: true };
        },
        toForm: packToForm,
        validate: validateMarketplacePack,
        getRowProps: (pack) => ({
            imageUrl: pack.imageUrl,
            description: pack.description,
            meta: [
                `${pack.sessionsCount} sesiones`,
                formatOperatorServicePrice({
                    pricingMode: 'fixed',
                    price: pack.price,
                    promoPrice: pack.promoPrice,
                    currency: pack.currency,
                }),
                pack.validityDays ? `${pack.validityDays} días` : null,
            ].filter(Boolean).join(' · '),
        }),
    }), [vertical]);

    const promotionAdapter = useMemo((): BusinessCatalogPromotionAdapter<MarketplacePromotionItem> => ({
        load: async () => {
            const response = await fetchOperatorServicePromotions(vertical);
            if (!response.ok) {
                return { ok: false, error: response.error ?? 'No se pudieron cargar las promociones.' };
            }
            return {
                ok: true,
                items: response.items.map((promo) => ({ ...promo, name: promo.label })),
            };
        },
        save: async (id, values) => {
            const payload = {
                label: values.label.trim(),
                description: values.description.trim() || null,
                discountType: values.discountType,
                discountValue: values.discountValue.trim(),
                appliesTo: values.appliesTo,
                serviceIds: values.appliesTo === 'services' ? values.serviceIds : [],
                startsAt: values.startsAt ? new Date(values.startsAt).toISOString() : null,
                endsAt: values.endsAt ? new Date(values.endsAt).toISOString() : null,
                isActive: values.isActive,
            };
            const result = id
                ? await updateOperatorServicePromotion(vertical, id, payload)
                : await createOperatorServicePromotion(vertical, payload);
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'No se pudo guardar la promoción.' };
        },
        toggle: async (promo) => {
            await updateOperatorServicePromotion(vertical, promo.id, { isActive: !promo.isActive });
            return { ok: true };
        },
        remove: async (promo) => {
            await deleteOperatorServicePromotion(vertical, promo.id);
            return { ok: true };
        },
        toForm: promoToForm,
        validate: validateMarketplacePromotion,
        getRowProps: (promo) => {
            const dateMeta = promo.startsAt || promo.endsAt
                ? [
                    promo.startsAt ? new Date(promo.startsAt).toLocaleDateString('es-CL') : '—',
                    promo.endsAt ? new Date(promo.endsAt).toLocaleDateString('es-CL') : '—',
                ].join(' → ')
                : null;
            return {
                description: promo.description,
                hideThumbnail: true,
                meta: [formatOperatorPromotionLabel(promo), dateMeta].filter(Boolean).join(' · '),
            };
        },
    }), [vertical]);

    return (
        <div className="space-y-6">
            <p className="text-sm text-fg-secondary">{BUSINESS_CATALOG_EDITOR_SECTION.description}</p>

            <BusinessCatalogTabs
                active={tab}
                variant="buttons"
                onChange={setTab}
                counts={counts}
            />

            {tab === 'services' ? (
                <BusinessCatalogServiceEditor
                    adapter={serviceAdapter}
                    emptyForm={EMPTY_SERVICE}
                    resetKey={vertical}
                    formLayout="modal"
                    onItemsChange={onServicesItemsChange}
                    onSaved={refreshServiceOptions}
                    resolveFormFieldsProps={({ form, setForm }) => ({
                        category: form.category,
                        categories,
                        onCategoryChange: (category) => setForm((prev) => ({ ...prev, category })),
                        pricingMode: form.pricingMode,
                        onPricingModeChange: (pricingMode) => setForm((prev) => ({ ...prev, pricingMode })),
                        showModality: true,
                        isOnline: form.isOnline,
                        isPresential: form.isPresential,
                        onModalityChange: (key, value) => setForm((prev) => ({ ...prev, [key]: value })),
                    })}
                    copy={{
                        archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse en tu perfil. Podrás reactivarlo con el interruptor.`,
                    }}
                />
            ) : null}

            {tab === 'packs' ? (
                <BusinessCatalogPackEditor
                    adapter={packAdapter}
                    emptyForm={EMPTY_PACK}
                    services={serviceOptions}
                    resetKey={vertical}
                    formLayout="inline"
                    onItemsChange={onPacksItemsChange}
                    copy={{
                        archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse en tu perfil. Podrás reactivarlo con el interruptor.`,
                    }}
                />
            ) : null}

            {tab === 'promotions' ? (
                <BusinessCatalogPromotionEditor
                    adapter={promotionAdapter}
                    emptyForm={EMPTY_PROMO}
                    services={serviceOptions}
                    resetKey={vertical}
                    formLayout="inline"
                    onItemsChange={onPromotionsItemsChange}
                    copy={{
                        emptyDescription: 'Crea una oferta temporal para destacar descuentos.',
                        archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse en tu perfil. Podrás reactivarla con el interruptor.`,
                    }}
                />
            ) : null}
        </div>
    );
}

export function BusinessOperatorServicesEditor({ vertical }: { vertical: PublicProfileVertical }) {
    return (
        <PanelConfirmProvider>
            <BusinessOperatorServicesEditorContent vertical={vertical} />
        </PanelConfirmProvider>
    );
}
