import type { ReactNode } from 'react';
import type { PanelStatusBadgeProps } from './panel-primitives.js';
import type { BusinessCatalogPromotionFormFieldsProps } from './business-catalog-promotion-form-fields.js';
import type { CatalogPromotionFormValues, CatalogServiceOption } from './business-catalog-form-types.js';

export type BusinessCatalogPromotionListItem = {
    id: string;
    name: string;
    isActive: boolean;
};

export type BusinessCatalogPromotionRowProps = {
    meta: ReactNode | string;
    description?: string | null;
    statusBadge?: Pick<PanelStatusBadgeProps, 'label' | 'tone'>;
    hideThumbnail?: boolean;
};

export type BusinessCatalogPromotionAdapter<T extends BusinessCatalogPromotionListItem> = {
    load: () => Promise<{ ok: true; items: T[] } | { ok: false; error: string }>;
    save: (id: string | null, values: CatalogPromotionFormValues) => Promise<{ ok: true } | { ok: false; error: string }>;
    toggle: (item: T) => Promise<{ ok: boolean; error?: string }>;
    remove: (item: T) => Promise<{ ok: boolean; error?: string }>;
    toForm: (item: T) => CatalogPromotionFormValues;
    validate: (values: CatalogPromotionFormValues) => string | null;
    getRowProps: (item: T) => BusinessCatalogPromotionRowProps;
};

export type BusinessCatalogPromotionEditorCopy = {
    actionLabel?: string;
    loadingLabel?: string;
    loadErrorTitle?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    archiveTitle?: string;
    archiveMessage?: (name: string) => string;
    createTitle?: string;
    editTitle?: string;
    createSubmitLabel?: string;
    editSubmitLabel?: string;
    createdNotice?: string;
    updatedNotice?: string;
};

export const DEFAULT_CATALOG_PROMOTION_EDITOR_COPY: Required<BusinessCatalogPromotionEditorCopy> = {
    actionLabel: 'Nueva promoción',
    loadingLabel: 'Cargando promociones…',
    loadErrorTitle: 'No se cargaron las promociones',
    emptyTitle: 'Sin promociones',
    emptyDescription: 'Publica ofertas temporales o descuentos para atraer más clientes.',
    archiveTitle: 'Archivar promoción',
    archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse. Podrás reactivarla con el interruptor.`,
    createTitle: 'Nueva promoción',
    editTitle: 'Editar promoción',
    createSubmitLabel: 'Crear promoción',
    editSubmitLabel: 'Guardar cambios',
    createdNotice: 'Promoción creada.',
    updatedNotice: 'Promoción actualizada.',
};

export type BusinessCatalogPromotionEditorProps<T extends BusinessCatalogPromotionListItem> = {
    adapter: BusinessCatalogPromotionAdapter<T>;
    emptyForm: CatalogPromotionFormValues;
    services?: CatalogServiceOption[];
    resetKey?: string | number | null;
    formLayout?: 'inline' | 'modal';
    promotionFormFields?: Omit<BusinessCatalogPromotionFormFieldsProps, 'values' | 'onChange' | 'services'>;
    copy?: BusinessCatalogPromotionEditorCopy;
    onSaved?: () => void | Promise<void>;
    onNotice?: (message: string) => void;
    onItemsChange?: (items: T[]) => void;
    toolbarSummary?: (items: T[]) => string;
    className?: string;
};
