import type { ReactNode } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { BusinessCatalogServiceFormFieldsProps, BusinessCatalogServiceFormValues } from './business-catalog-service-form-fields.js';

export type BusinessCatalogServiceListItem = {
    id: string;
    name: string;
    isActive: boolean;
};

export type BusinessCatalogServiceRowProps = {
    meta: ReactNode | string;
    description?: string | null;
    imageUrl?: string | null;
    accentColor?: string | null;
    footer?: ReactNode;
};

export type BusinessCatalogServiceAdapter<
    T extends BusinessCatalogServiceListItem,
    TForm extends BusinessCatalogServiceFormValues = BusinessCatalogServiceFormValues,
> = {
    load: () => Promise<{ ok: true; items: T[] } | { ok: false; error: string }>;
    save: (id: string | null, values: TForm) => Promise<{ ok: true } | { ok: false; error: string }>;
    toggle: (item: T) => Promise<{ ok: boolean; error?: string }>;
    remove: (item: T) => Promise<{ ok: boolean; error?: string }>;
    toForm: (item: T) => TForm;
    validate: (values: TForm) => string | null;
    getRowProps: (item: T) => BusinessCatalogServiceRowProps;
};

export type BusinessCatalogServiceEditorCopy = {
    actionLabel?: string;
    loadingLabel?: string;
    loadErrorTitle?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    archiveTitle?: string;
    archiveMessage?: (name: string) => string;
    createTitle?: string;
    editTitle?: string;
    modalDescription?: string;
    createSubmitLabel?: string;
    editSubmitLabel?: string;
    createdNotice?: string;
    updatedNotice?: string;
};

export const DEFAULT_CATALOG_SERVICE_EDITOR_COPY: Required<BusinessCatalogServiceEditorCopy> = {
    actionLabel: 'Nuevo servicio',
    loadingLabel: 'Cargando servicios…',
    loadErrorTitle: 'No se cargaron los servicios',
    emptyTitle: 'Sin servicios',
    emptyDescription: 'Agrega tu primer servicio para mostrarlo en tu perfil.',
    archiveTitle: 'Archivar servicio',
    archiveMessage: (name) => `"${name}" se pausará y dejará de mostrarse. Podrás reactivarlo con el interruptor.`,
    createTitle: 'Nuevo servicio',
    editTitle: 'Editar servicio',
    modalDescription: 'Visible en tu perfil público y en el explorador de servicios.',
    createSubmitLabel: 'Guardar',
    editSubmitLabel: 'Guardar',
    createdNotice: 'Servicio creado.',
    updatedNotice: 'Servicio actualizado.',
};

export type BusinessCatalogServiceEditorProps<
    T extends BusinessCatalogServiceListItem,
    TForm extends BusinessCatalogServiceFormValues = BusinessCatalogServiceFormValues,
> = {
    adapter: BusinessCatalogServiceAdapter<T, TForm>;
    emptyForm: TForm;
    resetKey?: string | number | null;
    formLayout?: 'inline' | 'modal';
    formFieldsProps?: Omit<BusinessCatalogServiceFormFieldsProps, 'values' | 'onChange' | 'onImageError'>;
    resolveFormFieldsProps?: (helpers: {
        form: TForm;
        setForm: Dispatch<SetStateAction<TForm>>;
    }) => Omit<BusinessCatalogServiceFormFieldsProps, 'values' | 'onChange' | 'onImageError'>;
    copy?: BusinessCatalogServiceEditorCopy;
    onSaved?: () => void | Promise<void>;
    onNotice?: (message: string) => void;
    onItemsChange?: (items: T[]) => void;
    toolbarSummary?: (items: T[]) => string;
    /** Si existe, “Nuevo” navega a Publicar en lugar de abrir el formulario de alta. */
    createHref?: string;
    className?: string;
};
