'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconArrowRight, IconCheck, IconLoader2 } from '@tabler/icons-react';
import {
    PanelCard,
    PanelNotice,
    AGENDA_BUSINESS_PROMOCIONES_PAGE,
    BusinessCatalogTabs,
    AGENDA_BUSINESS_CATALOG_HREFS,
    BusinessCatalogPromotionEditor,
    BusinessCatalogPromotionCodeChip,
    useCatalogPromotionCodeCopy,
    EMPTY_CATALOG_PROMOTION_FORM,
    PanelConfirmProvider,
    validateCatalogPromotionAppliesTo,
    type BusinessCatalogPromotionAdapter,
    type CatalogPromotionFormValues,
} from '@simple/ui/panel';
import {
    formatAgendaPromotionDiscount,
    resolveAgendaPromotionLifecycleStatus,
} from '@simple/utils';
import { AgendaMisServiciosShell } from '@/components/panel/agenda-mis-servicios-shell';
import { useAgendaVocab } from '@/components/panel/agenda-vocab-context';
import {
    fetchAgendaPromotions,
    createAgendaPromotion,
    patchAgendaPromotion,
    deleteAgendaPromotion,
    fetchAgendaServices,
    fetchAgendaProfile,
    hasAgendaFullAccess,
    type AgendaPromotion,
    type AgendaProfile,
} from '@/lib/agenda-api';

type AgendaPromotionItem = AgendaPromotion & { name: string };

const AGENDA_EMPTY_PROMO: CatalogPromotionFormValues = {
    ...EMPTY_CATALOG_PROMOTION_FORM,
    discountValue: '',
};

const fromIsoToLocalInput = (iso: string | null): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const toIsoFromLocalInput = (value: string): string | null => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

function promoToForm(promotion: AgendaPromotion): CatalogPromotionFormValues {
    return {
        code: promotion.code ?? '',
        label: promotion.label,
        description: promotion.description ?? '',
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        appliesTo: promotion.appliesTo,
        serviceIds: promotion.serviceIds ?? [],
        minAmount: promotion.minAmount ?? '',
        maxUses: promotion.maxUses !== null ? String(promotion.maxUses) : '',
        startsAt: fromIsoToLocalInput(promotion.startsAt),
        endsAt: fromIsoToLocalInput(promotion.endsAt),
        isActive: promotion.isActive,
    };
}

function validateAgendaPromotionForm(values: CatalogPromotionFormValues): string | null {
    const label = values.label.trim();
    if (!label) return 'Falta el nombre de la promoción.';
    const value = Number(values.discountValue);
    if (!Number.isFinite(value) || value <= 0) return 'El descuento debe ser mayor a 0.';
    if (values.discountType === 'percent' && value > 100) return 'El porcentaje no puede superar 100.';
    return validateCatalogPromotionAppliesTo(values);
}

export default function PromocionesPage() {
    return (
        <PanelConfirmProvider>
            <PromocionesPageContent />
        </PanelConfirmProvider>
    );
}

function PromocionesPageContent() {
    const vocab = useAgendaVocab();
    const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
    const [profile, setProfile] = useState<AgendaProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [flash, setFlash] = useState<string | null>(null);
    const { copiedCode, copyCode } = useCatalogPromotionCodeCopy();

    useEffect(() => {
        let active = true;
        void Promise.all([fetchAgendaServices(), fetchAgendaProfile()]).then(([items, loadedProfile]) => {
            if (!active) return;
            setServices(items.filter((service) => service.isActive).map((service) => ({ id: service.id, name: service.name })));
            setProfile(loadedProfile);
            setProfileLoading(false);
        });
        return () => { active = false; };
    }, []);

    const hasFullAccess = !profile || hasAgendaFullAccess(profile);

    const adapter = useMemo((): BusinessCatalogPromotionAdapter<AgendaPromotionItem> => ({
        load: async () => {
            const items = await fetchAgendaPromotions();
            return {
                ok: true,
                items: items.map((promotion) => ({ ...promotion, name: promotion.label })),
            };
        },
        save: async (id, values) => {
            const payload = {
                code: values.code.trim().toUpperCase() || null,
                label: values.label.trim(),
                description: values.description.trim() || null,
                discountType: values.discountType,
                discountValue: Number(values.discountValue),
                appliesTo: values.appliesTo,
                serviceIds: values.serviceIds,
                minAmount: values.minAmount ? Number(values.minAmount) : null,
                maxUses: values.maxUses ? Math.floor(Number(values.maxUses)) : null,
                startsAt: toIsoFromLocalInput(values.startsAt),
                endsAt: toIsoFromLocalInput(values.endsAt),
                isActive: values.isActive,
            };
            const result = id
                ? await patchAgendaPromotion(id, payload)
                : await createAgendaPromotion(payload);
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'No se pudo guardar.' };
        },
        toggle: async (promotion) => {
            const result = await patchAgendaPromotion(promotion.id, { isActive: !promotion.isActive });
            if (result.ok) {
                setFlash(promotion.isActive ? 'Promoción pausada.' : 'Promoción activada.');
            }
            return { ok: result.ok, error: result.error };
        },
        remove: async (promotion) => {
            const result = await deleteAgendaPromotion(promotion.id);
            if (result.ok) setFlash('Promoción archivada.');
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'No se pudo archivar.' };
        },
        toForm: promoToForm,
        validate: validateAgendaPromotionForm,
        getRowProps: (promotion) => ({
            description: promotion.description,
            statusBadge: resolveAgendaPromotionLifecycleStatus(promotion),
            hideThumbnail: true,
            meta: (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-accent-ink">{formatAgendaPromotionDiscount(promotion)}</span>
                    {promotion.code ? (
                        <BusinessCatalogPromotionCodeChip
                            code={promotion.code}
                            copiedCode={copiedCode}
                            onCopy={copyCode}
                        />
                    ) : null}
                    {promotion.maxUses !== null ? (
                        <span className="text-fg-muted">{promotion.usesCount}/{promotion.maxUses} usos</span>
                    ) : null}
                    {promotion.maxUses === null && promotion.usesCount > 0 ? (
                        <span className="text-fg-muted">{promotion.usesCount} usos</span>
                    ) : null}
                    {promotion.endsAt ? (
                        <span className="text-fg-muted">
                            hasta {new Date(promotion.endsAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                        </span>
                    ) : null}
                </div>
            ),
        }),
    }), [copiedCode, copyCode]);

    return (
        <AgendaMisServiciosShell
            activeKey="servicios"
            title={AGENDA_BUSINESS_PROMOCIONES_PAGE.title}
            description={AGENDA_BUSINESS_PROMOCIONES_PAGE.description}
        >
            <div className="space-y-6">
                <BusinessCatalogTabs active="promotions" variant="links" hrefs={AGENDA_BUSINESS_CATALOG_HREFS} />

                {profileLoading ? (
                    <p className="flex items-center gap-2 text-sm text-fg-muted">
                        <IconLoader2 size={16} className="animate-spin" />
                        Cargando…
                    </p>
                ) : !hasFullAccess ? (
                    <PanelCard size="lg">
                        <h2 className="text-lg font-bold tracking-tight text-fg">Descuentos y cupones</h2>
                        <p className="mt-2 text-sm text-fg-secondary">
                            Las promociones y códigos de descuento para tus {vocab.clients} están disponibles desde Plan Pro o durante tus 30 días de prueba gratis.
                        </p>
                        <Link
                            href="/panel/mi-negocio/plan"
                            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90"
                        >
                            Ver planes y prueba gratis <IconArrowRight size={16} aria-hidden="true" />
                        </Link>
                    </PanelCard>
                ) : (
                    <>
                        {flash ? (
                            <PanelNotice tone="success">
                                <span className="flex items-center gap-2">
                                    <IconCheck size={14} /> {flash}
                                </span>
                            </PanelNotice>
                        ) : null}

                        <BusinessCatalogPromotionEditor
                            adapter={adapter}
                            emptyForm={AGENDA_EMPTY_PROMO}
                            services={services}
                            formLayout="modal"
                            onNotice={setFlash}
                            promotionFormFields={{
                                features: { couponCode: true, minAmount: true, maxUses: true, dateInput: 'datetime-local' },
                                labelPlaceholder: 'Primera sesión',
                            }}
                            copy={{
                                emptyTitle: 'Aún no tienes promociones',
                                emptyDescription: `Crea tu primer cupón y compártelo en redes o con tus ${vocab.clients}.`,
                                archiveMessage: (name) => `"${name}" se pausará y dejará de aplicarse. Podrás reactivarla con el interruptor.`,
                                createSubmitLabel: 'Crear',
                                editSubmitLabel: 'Guardar cambios',
                                createdNotice: 'Promoción creada.',
                                updatedNotice: 'Promoción actualizada.',
                            }}
                        />
                    </>
                )}
            </div>
        </AgendaMisServiciosShell>
    );
}
