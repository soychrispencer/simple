import type { ReactNode } from 'react';
import type { BusinessCatalogPackFormFieldsProps } from './business-catalog-pack-form-fields.js';
import type { CatalogPackFormValues, CatalogServiceOption } from './business-catalog-form-types.js';

export type BusinessCatalogPackListItem = {
    id: string;
    name: string;
    isActive: boolean;
};

export type BusinessCatalogPackRowProps = {
    meta: ReactNode | string;
    description?: string | null;
    imageUrl?: string | null;
};

export type BusinessCatalogPackAdapter<T extends BusinessCatalogPackListItem> = {
    load: () => Promise<{ ok: true; items: T[] } | { ok: false; error: string }>;
    save: (id: string | null, values: CatalogPackFormValues) => Promise<{ ok: true } | { ok: false; error: string }>;
    toggle: (item: T) => Promise<{ ok: boolean; error?: string }>;
    remove: (item: T) => Promise<{ ok: boolean; error?: string }>;
    toForm: (item: T) => CatalogPackFormValues;
    validate: (values: CatalogPackFormValues) => string | null;
    getRowProps: (item: T) => BusinessCatalogPackRowProps;
};

export type BusinessCatalogPackEditorCopy = {
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

export const DEFAULT_CATALOG_PACK_EDITOR_COPY: Required<BusinessCatalogPackEditorCopy> = {
    actionLabel: 'Nuevo pack',
    loadingLabel: 'Cargando packs…',
    loadErrorTitle: 'No se cargaron los packs',
    emptyTitle: 'Sin packs',
    emptyDescription: 'Crea un pack o bono para vender sesiones agrupadas.',
    archiveTitle: 'Archivar pack',
    archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse. Podrás reactivarlo con el interruptor.`,
    createTitle: 'Nuevo pack',
    editTitle: 'Editar pack',
    createSubmitLabel: 'Crear pack',
    editSubmitLabel: 'Guardar cambios',
    createdNotice: 'Pack creado.',
    updatedNotice: 'Pack actualizado.',
};

export type BusinessCatalogPackEditorProps<T extends BusinessCatalogPackListItem> = {
    adapter: BusinessCatalogPackAdapter<T>;
    emptyForm: CatalogPackFormValues;
    services?: CatalogServiceOption[];
    resetKey?: string | number | null;
    formLayout?: 'inline' | 'modal';
    packFormFields?: Omit<BusinessCatalogPackFormFieldsProps, 'values' | 'onChange' | 'services' | 'onImageError'>;
    copy?: BusinessCatalogPackEditorCopy;
    onSaved?: () => void | Promise<void>;
    onNotice?: (message: string) => void;
    onItemsChange?: (items: T[]) => void;
    toolbarSummary?: (items: T[]) => string;
    className?: string;
};
