'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';
import { BusinessCatalogEditorToolbar } from './business-catalog-editor-toolbar.js';
import { BusinessCatalogInlineFormCard } from './business-catalog-inline-form-card.js';
import { BusinessCatalogPromotionFormFields } from './business-catalog-promotion-form-fields.js';
import { BusinessCatalogServiceModal } from './business-catalog-service-modal.js';
import { BusinessServiceListRow } from './business-service-list-row.js';
import { PanelButton } from './panel-button.js';
import { PanelEmptyState } from './panel-display.js';
import { PanelNotice } from './panel-primitives.js';
import { usePanelConfirm } from './panel-confirm-provider.js';
import type { CatalogPromotionFormValues } from './business-catalog-form-types.js';
import {
    DEFAULT_CATALOG_PROMOTION_EDITOR_COPY,
    type BusinessCatalogPromotionEditorProps,
    type BusinessCatalogPromotionListItem,
} from './business-catalog-promotion-editor-types.js';

export function BusinessCatalogPromotionEditor<T extends BusinessCatalogPromotionListItem>({
    adapter,
    emptyForm,
    services = [],
    resetKey = null,
    formLayout = 'inline',
    promotionFormFields,
    copy: copyInput,
    onSaved,
    onNotice,
    onItemsChange,
    toolbarSummary,
    className = 'w-full space-y-6',
}: BusinessCatalogPromotionEditorProps<T>) {
    const copy = { ...DEFAULT_CATALOG_PROMOTION_EDITOR_COPY, ...copyInput };
    const { confirm } = usePanelConfirm();
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [listNotice, setListNotice] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const onItemsChangeRef = useRef(onItemsChange);
    onItemsChangeRef.current = onItemsChange;

    const patchForm = <K extends keyof CatalogPromotionFormValues>(key: K, value: CatalogPromotionFormValues[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const loadItems = useCallback(async () => {
        setLoading(true);
        setLoadError('');
        const response = await adapter.load();
        if (!response.ok) {
            setItems([]);
            setLoadError(response.error);
            onItemsChangeRef.current?.([]);
            setLoading(false);
            return;
        }
        setItems(response.items);
        onItemsChangeRef.current?.(response.items);
        setLoading(false);
    }, [adapter]);

    useEffect(() => {
        void loadItems();
    }, [loadItems, resetKey]);

    useEffect(() => {
        setFormOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
        setListNotice(null);
    }, [resetKey, emptyForm]);

    function closeForm() {
        setFormOpen(false);
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
    }

    function openCreate() {
        setEditingId(null);
        setForm(emptyForm);
        setFormError(null);
        setFormOpen(true);
    }

    function openEdit(item: T) {
        setEditingId(item.id);
        setForm(adapter.toForm(item));
        setFormError(null);
        setFormOpen(true);
    }

    async function saveItem() {
        const validationError = adapter.validate(form);
        if (validationError) {
            setFormError(validationError);
            return;
        }
        setSaving(true);
        setFormError(null);
        const response = await adapter.save(editingId, form);
        setSaving(false);
        if (!response.ok) {
            setFormError(response.error);
            return;
        }
        onNotice?.(editingId ? copy.updatedNotice : copy.createdNotice);
        closeForm();
        await loadItems();
        await onSaved?.();
    }

    async function toggleItem(item: T) {
        setTogglingId(item.id);
        const response = await adapter.toggle(item);
        setTogglingId(null);
        if (!response.ok) {
            setListNotice(response.error ?? 'No se pudo actualizar la promoción.');
            return;
        }
        await loadItems();
        await onSaved?.();
    }

    async function removeItem(item: T) {
        const confirmed = await confirm({
            title: copy.archiveTitle,
            message: copy.archiveMessage(item.name),
            confirmLabel: 'Archivar',
            tone: 'danger',
        });
        if (!confirmed) return;
        setDeletingId(item.id);
        const response = await adapter.remove(item);
        setDeletingId(null);
        if (!response.ok) {
            setListNotice(response.error ?? 'No se pudo archivar la promoción.');
            return;
        }
        if (editingId === item.id) closeForm();
        await loadItems();
        await onSaved?.();
    }

    if (loading) {
        return (
            <p className="flex items-center gap-2 text-sm text-fg-muted">
                <IconLoader2 size={16} className="animate-spin" />
                {copy.loadingLabel}
            </p>
        );
    }

    if (loadError) {
        return (
            <PanelEmptyState
                title={copy.loadErrorTitle}
                description={loadError}
                action={
                    <PanelButton variant="secondary" size="sm" onClick={() => void loadItems()}>
                        Reintentar
                    </PanelButton>
                }
            />
        );
    }

    const summary = toolbarSummary?.(items)
        ?? (items.length === 0
            ? 'Sin promociones publicadas'
            : `${items.filter((item) => item.isActive).length} activa${items.filter((item) => item.isActive).length === 1 ? '' : 's'} de ${items.length}`);

    const formTitle = editingId ? copy.editTitle : copy.createTitle;
    const submitLabel = editingId ? copy.editSubmitLabel : copy.createSubmitLabel;

    const promotionFields = (
        <>
            {formError ? (
                <div className="md:col-span-2">
                    <PanelNotice tone="error">{formError}</PanelNotice>
                </div>
            ) : null}
            <BusinessCatalogPromotionFormFields
                values={form}
                onChange={patchForm}
                services={services}
                {...promotionFormFields}
            />
        </>
    );

    return (
        <div className={className}>
            <BusinessCatalogEditorToolbar
                actionLabel={copy.actionLabel}
                summary={summary}
                onAction={openCreate}
                hideAction={formOpen}
            />
            {listNotice ? <PanelNotice tone="warning">{listNotice}</PanelNotice> : null}

            {formOpen && formLayout === 'inline' ? (
                <BusinessCatalogInlineFormCard
                    title={formTitle}
                    saving={saving}
                    submitLabel={submitLabel}
                    onSubmit={() => void saveItem()}
                    onCancel={closeForm}
                >
                    {promotionFields}
                </BusinessCatalogInlineFormCard>
            ) : null}

            {formOpen && formLayout === 'modal' ? (
                <BusinessCatalogServiceModal
                    open={formOpen}
                    title={formTitle}
                    onClose={closeForm}
                    actions={(
                        <>
                            <PanelButton variant="secondary" size="sm" onClick={closeForm}>Cancelar</PanelButton>
                            <PanelButton variant="accent" size="sm" onClick={() => void saveItem()} disabled={saving}>
                                {saving ? <IconLoader2 size={14} className="animate-spin" /> : null}
                                {submitLabel}
                            </PanelButton>
                        </>
                    )}
                >
                    {promotionFields}
                </BusinessCatalogServiceModal>
            ) : null}

            {items.length === 0 && !formOpen ? (
                <PanelEmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
            ) : (
                <div className="flex flex-col gap-3">
                    {items.map((item) => {
                        const row = adapter.getRowProps(item);
                        return (
                            <BusinessServiceListRow
                                key={item.id}
                                name={item.name}
                                meta={row.meta}
                                description={row.description}
                                hideThumbnail={row.hideThumbnail ?? true}
                                statusBadge={row.statusBadge}
                                isActive={item.isActive}
                                isEditing={editingId === item.id && formOpen}
                                toggling={togglingId === item.id}
                                deleting={deletingId === item.id}
                                actionsDisabled={formOpen && editingId !== item.id}
                                onToggle={() => void toggleItem(item)}
                                onEdit={() => openEdit(item)}
                                onDelete={() => void removeItem(item)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
