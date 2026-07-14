'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconCheck } from '@tabler/icons-react';
import {
    PanelNotice,
    AGENDA_BUSINESS_PACKS_PAGE,
    BusinessCatalogTabs,
    AGENDA_BUSINESS_CATALOG_HREFS,
    BusinessCatalogPackEditor,
    EMPTY_CATALOG_PACK_FORM,
    PanelConfirmProvider,
    validateCatalogPackAppliesTo,
    agendaBusinessSubsectionShellProps,
    type BusinessCatalogPackAdapter,
    type CatalogPackFormValues,
} from '@simple/ui/panel';
import { AgendaMisServiciosShell } from '@/components/panel/agenda-mis-servicios-shell';
import {
    fetchAgendaPacks,
    createAgendaPack,
    patchAgendaPack,
    deleteAgendaPack,
    fetchAgendaServices,
    type AgendaPack,
} from '@/lib/agenda-api';

const AGENDA_EMPTY_PACK: CatalogPackFormValues = {
    ...EMPTY_CATALOG_PACK_FORM,
    sessionsCount: '',
};

const formatCLP = (n: number) => n.toLocaleString('es-CL');

function packToForm(pack: AgendaPack): CatalogPackFormValues {
    return {
        name: pack.name,
        description: pack.description ?? '',
        sessionsCount: String(pack.sessionsCount),
        price: pack.price,
        promoPrice: '',
        appliesTo: pack.appliesTo,
        serviceIds: pack.serviceIds ?? [],
        validityDays: pack.validityDays !== null ? String(pack.validityDays) : '',
        imageUrl: '',
        isActive: pack.isActive,
    };
}

function validateAgendaPackForm(values: CatalogPackFormValues): string | null {
    const name = values.name.trim();
    if (!name) return 'Falta el nombre del pack.';
    const sessionsCount = Number(values.sessionsCount);
    if (!Number.isFinite(sessionsCount) || sessionsCount <= 0) {
        return 'Indica cuántas sesiones incluye el pack.';
    }
    const price = Number(values.price);
    if (!Number.isFinite(price) || price < 0) return 'Precio inválido.';
    return validateCatalogPackAppliesTo(values);
}

export default function PacksPage() {
    return (
        <PanelConfirmProvider>
            <PacksPageContent />
        </PanelConfirmProvider>
    );
}

function PacksPageContent() {
    const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
    const [flash, setFlash] = useState<string | null>(null);

    useEffect(() => {
        void fetchAgendaServices().then((items) => {
            setServices(items.filter((service) => service.isActive).map((service) => ({ id: service.id, name: service.name })));
        });
    }, []);

    const adapter = useMemo((): BusinessCatalogPackAdapter<AgendaPack> => ({
        load: async () => {
            const items = await fetchAgendaPacks();
            return { ok: true, items };
        },
        save: async (id, values) => {
            const payload = {
                name: values.name.trim(),
                description: values.description.trim() || null,
                sessionsCount: Math.floor(Number(values.sessionsCount)),
                price: Number(values.price),
                appliesTo: values.appliesTo,
                serviceIds: values.serviceIds,
                validityDays: values.validityDays ? Math.floor(Number(values.validityDays)) : null,
                isActive: values.isActive,
            };
            const result = id
                ? await patchAgendaPack(id, payload)
                : await createAgendaPack(payload);
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'No se pudo guardar.' };
        },
        toggle: async (pack) => {
            const result = await patchAgendaPack(pack.id, { isActive: !pack.isActive });
            return { ok: result.ok, error: result.error };
        },
        remove: async (pack) => {
            const result = await deleteAgendaPack(pack.id);
            return result.ok
                ? { ok: true }
                : { ok: false, error: result.error ?? 'No se pudo archivar.' };
        },
        toForm: packToForm,
        validate: validateAgendaPackForm,
        getRowProps: (pack) => {
            const price = Number(pack.price);
            const pricePerSession = pack.sessionsCount > 0 ? Math.round(price / pack.sessionsCount) : 0;
            return {
                description: pack.description,
                meta: [
                    `$${formatCLP(price)}`,
                    `${pack.sessionsCount} sesiones`,
                    pricePerSession > 0 ? `$${formatCLP(pricePerSession)} c/u` : null,
                    pack.validityDays ? `Vence a ${pack.validityDays} días` : null,
                    pack.appliesTo === 'services' ? `${pack.serviceIds.length} servicio(s)` : null,
                ].filter(Boolean).join(' · '),
            };
        },
    }), []);

    return (
        <AgendaMisServiciosShell
            {...agendaBusinessSubsectionShellProps('packs')}
            title={AGENDA_BUSINESS_PACKS_PAGE.title}
            description={AGENDA_BUSINESS_PACKS_PAGE.description}
        >
            <div className="space-y-6">
                <BusinessCatalogTabs active="packs" variant="links" hrefs={AGENDA_BUSINESS_CATALOG_HREFS} />

                {flash ? (
                    <PanelNotice tone="success">
                        <span className="flex items-center gap-2">
                            <IconCheck size={14} /> {flash}
                        </span>
                    </PanelNotice>
                ) : null}

                <BusinessCatalogPackEditor
                    adapter={adapter}
                    emptyForm={AGENDA_EMPTY_PACK}
                    services={services}
                    formLayout="modal"
                    onNotice={setFlash}
                    packFormFields={{ showImage: false, showPromoPrice: false, namePlaceholder: 'Pack 5 sesiones' }}
                    copy={{
                        emptyTitle: 'Aún no tienes packs',
                        emptyDescription: 'Crea tu primer pack de sesiones (por ejemplo, 5 sesiones con un 10% de descuento).',
                        archiveMessage: () => 'El pack se pausará y dejará de mostrarse. Los bonos ya vendidos no se borran. Podrás reactivarlo con el interruptor.',
                        createSubmitLabel: 'Guardar',
                        editSubmitLabel: 'Guardar',
                        createdNotice: 'Pack creado.',
                        updatedNotice: 'Pack actualizado.',
                    }}
                />
            </div>
        </AgendaMisServiciosShell>
    );
}
