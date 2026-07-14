'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { IconLoader2, IconPlus, IconTrash } from '@tabler/icons-react';
import {
    createOperatorProduct,
    deleteOperatorProduct,
    fetchOperatorProducts,
    getOperatorProductCategories,
    formatOperatorProductPrice,
    resolveOperatorProductCategoryLabel,
    updateOperatorProduct,
    validateOperatorProductPromoPrice,
    type OperatorProductRecord,
    type PublicProfileVertical,
} from '@simple/utils';
import { BusinessCatalogImageField } from './business-catalog-image-field.js';
import { BUSINESS_CATALOG_EDITOR_PRODUCTS_SECTION } from './business-copy.js';
import { PanelBlockHeader, PanelNotice } from './panel-primitives.js';
import { PanelButton } from './panel-button.js';
import { PanelCard } from './panel-card.js';
import { PanelConfirmProvider, usePanelConfirm } from './panel-confirm-provider.js';
import { PanelEmptyState, PanelField, PanelList, PanelListRow } from './panel-display.js';
import { PanelSelect } from './panel-select.js';
import { PanelSectionSaveFooter } from './panel-section-save-footer.js';

type ProductForm = {
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    price: string;
    promoPrice: string;
    stock: string;
    sku: string;
};

const EMPTY_FORM: ProductForm = {
    name: '',
    description: '',
    imageUrl: '',
    category: 'other',
    price: '',
    promoPrice: '',
    stock: '',
    sku: '',
};

function productToForm(product: OperatorProductRecord): ProductForm {
    return {
        name: product.name,
        description: product.description ?? '',
        imageUrl: product.imageUrl ?? '',
        category: product.category,
        price: product.price,
        promoPrice: product.promoPrice ?? '',
        stock: product.stock != null ? String(product.stock) : '',
        sku: product.sku ?? '',
    };
}

function validateProductForm(form: ProductForm): string | null {
    if (!form.name.trim()) return 'El nombre del producto es requerido.';
    if (!form.price.trim() || Number(form.price) <= 0) return 'Indica un precio válido.';
    return validateOperatorProductPromoPrice(form.price, form.promoPrice);
}

function BusinessOperatorProductsEditorContent({
    vertical,
    createHref,
}: {
    vertical: PublicProfileVertical;
    createHref?: string;
}) {
    const categories = useMemo(() => getOperatorProductCategories(vertical), [vertical]);
    const { confirm } = usePanelConfirm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [items, setItems] = useState<OperatorProductRecord[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
    const [formOpen, setFormOpen] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const response = await fetchOperatorProducts(vertical);
        if (!response.ok) setError(response.error ?? 'No se pudieron cargar los productos.');
        else {
            setError('');
            setItems(response.items);
        }
        setLoading(false);
    }, [vertical]);

    useEffect(() => {
        void load();
    }, [load]);

    function openCreate() {
        if (createHref) return;
        setEditingId(null);
        setForm(EMPTY_FORM);
        setFormOpen(true);
        setError('');
    }

    function openEdit(product: OperatorProductRecord) {
        setEditingId(product.id);
        setForm(productToForm(product));
        setFormOpen(true);
        setError('');
    }

    function closeForm() {
        setFormOpen(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
    }

    async function handleSave() {
        if (createHref && !editingId) return;
        const validationError = validateProductForm(form);
        if (validationError) {
            setError(validationError);
            return;
        }
        setSaving(true);
        const payload = {
            name: form.name.trim(),
            description: form.description.trim() || null,
            imageUrl: form.imageUrl.trim() || null,
            category: form.category,
            price: form.price.trim(),
            promoPrice: form.promoPrice.trim() || null,
            stock: form.stock.trim() ? Number(form.stock) : null,
            sku: form.sku.trim() || null,
        };
        const result = editingId
            ? await updateOperatorProduct(vertical, editingId, payload)
            : await createOperatorProduct(vertical, payload);
        setSaving(false);
        if (!result.ok) {
            setError(result.error ?? 'No se pudo guardar el producto.');
            return;
        }
        closeForm();
        await load();
    }

    async function handleToggle(product: OperatorProductRecord) {
        await updateOperatorProduct(vertical, product.id, { isActive: !product.isActive });
        await load();
    }

    async function handleDelete(product: OperatorProductRecord) {
        const confirmed = await confirm({
            title: 'Eliminar producto',
            message: `¿Quitar "${product.name}" del catálogo?`,
            confirmLabel: 'Eliminar',
            tone: 'danger',
        });
        if (!confirmed) return;
        await deleteOperatorProduct(vertical, product.id);
        if (editingId === product.id) closeForm();
        await load();
    }

    const activeCount = items.filter((item) => item.isActive).length;
    const createButton = createHref ? (
        <Link href={createHref} className="inline-flex">
            <PanelButton type="button">
                <IconPlus size={16} />
                Publicar producto
            </PanelButton>
        </Link>
    ) : (
        <PanelButton type="button" onClick={openCreate}>
            <IconPlus size={16} />
            Agregar producto
        </PanelButton>
    );

    return (
        <div className="space-y-6">
            <PanelBlockHeader
                title={BUSINESS_CATALOG_EDITOR_PRODUCTS_SECTION.title}
                description={BUSINESS_CATALOG_EDITOR_PRODUCTS_SECTION.description}
                actions={createButton}
            />

            {error ? <PanelNotice tone="warning">{error}</PanelNotice> : null}

            {loading ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted"><IconLoader2 size={16} className="animate-spin" /> Cargando productos…</p>
            ) : items.length === 0 && !formOpen ? (
                <PanelEmptyState
                    title="Sin productos todavía"
                    description={createHref
                        ? 'Crea el primero desde Publicar. Aquí podrás editar stock, precios y visibilidad.'
                        : 'Agrega accesorios, repuestos o artículos que vendas junto a tu negocio.'}
                    action={createButton}
                />
            ) : (
                <PanelList>
                    {items.map((product, index) => (
                        <PanelListRow key={product.id} divider={index > 0} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                            <div className="flex-1 min-w-0 space-y-1">
                                <p className="font-medium text-fg">{product.name}</p>
                                <p className="text-sm text-fg-muted">
                                    {formatOperatorProductPrice(product)}
                                    {' · '}
                                    {resolveOperatorProductCategoryLabel(vertical, product.category)}
                                    {product.stock != null ? ` · Stock: ${product.stock}` : ''}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <PanelButton type="button" variant="secondary" size="sm" onClick={() => openEdit(product)}>Editar</PanelButton>
                                <PanelButton type="button" variant="secondary" size="sm" onClick={() => void handleToggle(product)}>
                                    {product.isActive ? 'Ocultar' : 'Publicar'}
                                </PanelButton>
                                <PanelButton type="button" variant="secondary" size="sm" onClick={() => void handleDelete(product)}>
                                    <IconTrash size={14} />
                                </PanelButton>
                            </div>
                        </PanelListRow>
                    ))}
                </PanelList>
            )}

            {formOpen && (!createHref || editingId) ? (
                <PanelCard size="lg" className="space-y-4 p-4 md:p-6">
                    <PanelBlockHeader
                        title={editingId ? 'Editar producto' : 'Nuevo producto'}
                        description={`${activeCount} producto${activeCount === 1 ? '' : 's'} visible${activeCount === 1 ? '' : 's'} en tu perfil.`}
                        className="mb-0"
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                        <PanelField label="Nombre" className="md:col-span-2">
                            <input className="form-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Cubre zócalos universales" />
                        </PanelField>
                        <PanelField label="Descripción" className="md:col-span-2">
                            <textarea className="form-input min-h-24" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Material, compatibilidad, colores…" />
                        </PanelField>
                        <BusinessCatalogImageField
                            imageUrl={form.imageUrl || null}
                            onChange={(url) => setForm((prev) => ({ ...prev, imageUrl: url ?? '' }))}
                            onError={(message) => setError(message)}
                        />
                        <PanelField label="Categoría">
                            <PanelSelect value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}>
                                {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                            </PanelSelect>
                        </PanelField>
                        <PanelField label="Precio (CLP)">
                            <input className="form-input" inputMode="numeric" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="19990" />
                        </PanelField>
                        <PanelField label="Precio promo (opcional)">
                            <input className="form-input" inputMode="numeric" value={form.promoPrice} onChange={(e) => setForm((prev) => ({ ...prev, promoPrice: e.target.value }))} placeholder="14990" />
                        </PanelField>
                        <PanelField label="Stock (opcional)">
                            <input className="form-input" inputMode="numeric" value={form.stock} onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))} placeholder="10" />
                        </PanelField>
                        <PanelField label="SKU (opcional)">
                            <input className="form-input" value={form.sku} onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value }))} placeholder="CZ-001" />
                        </PanelField>
                    </div>
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
                        <PanelButton type="button" variant="secondary" onClick={closeForm} disabled={saving}>
                            Cancelar
                        </PanelButton>
                        <PanelSectionSaveFooter
                            saving={saving}
                            onSave={() => void handleSave()}
                            saveLabel={editingId ? 'Guardar cambios' : 'Crear producto'}
                        />
                    </div>
                </PanelCard>
            ) : null}
        </div>
    );
}

export function BusinessOperatorProductsEditor({
    vertical,
    createHref,
}: {
    vertical: PublicProfileVertical;
    createHref?: string;
}) {
    return (
        <PanelConfirmProvider>
            <BusinessOperatorProductsEditorContent vertical={vertical} createHref={createHref} />
        </PanelConfirmProvider>
    );
}
