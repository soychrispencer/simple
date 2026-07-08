'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconLoader2, IconSearch } from '@tabler/icons-react';
import {
    fetchPublicOperatorProducts,
    getOperatorProductCategories,
    type PublicOperatorProductItem,
    type PublicProfileVertical,
} from '@simple/utils';
import { BusinessOperatorProductsCatalog } from './business-operator-products-catalog.js';
import {
    MARKETPLACE_PUBLIC_PRODUCTS_CATEGORY_HINT,
    MARKETPLACE_PUBLIC_PRODUCTS_PAGE_COPY,
} from './business-copy.js';
import { MarketplaceCatalogLocationFilters } from './marketplace-catalog-location-filters.js';
import { PanelEmptyState } from './panel-display.js';
import { PanelField } from './panel-display.js';
import { PanelNotice } from './panel-primitives.js';
import { PanelSelect } from './panel-select.js';
import { PanelButton } from './panel-button.js';

export function MarketplacePublicProductsPage({ vertical }: { vertical: PublicProfileVertical }) {
    const searchParams = useSearchParams();
    const categories = useMemo(() => getOperatorProductCategories(vertical), [vertical]);
    const copy = MARKETPLACE_PUBLIC_PRODUCTS_PAGE_COPY[vertical === 'propiedades' ? 'propiedades' : 'autos'];
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [products, setProducts] = useState<PublicOperatorProductItem[]>([]);
    const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
    const [debouncedQuery, setDebouncedQuery] = useState(() => searchParams.get('q') ?? '');
    const [category, setCategory] = useState(() => searchParams.get('category') ?? '');
    const [region, setRegion] = useState(() => searchParams.get('region') ?? '');
    const [commune, setCommune] = useState(() => searchParams.get('commune') ?? '');

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedQuery(query), 350);
        return () => window.clearTimeout(timer);
    }, [query]);

    useEffect(() => {
        setLoading(true);
        void fetchPublicOperatorProducts(vertical, {
            q: debouncedQuery.trim() || undefined,
            category: category || undefined,
            region: region || undefined,
            commune: commune || undefined,
        }).then((result) => {
            setProducts(result.products);
            setLoadError(result.ok ? '' : (result.error ?? 'No se pudieron cargar los productos.'));
            setLoading(false);
        });
    }, [vertical, debouncedQuery, category, region, commune]);

    const searching = query !== debouncedQuery;

    return (
        <div className="container-app py-10 space-y-8">
            <div className="max-w-2xl space-y-3">
                <p className="text-sm font-medium text-fg-muted">{copy.eyebrow}</p>
                <h1 className="text-3xl font-semibold text-fg md:text-4xl">{copy.title}</h1>
                <p className="text-base text-fg-secondary">{copy.description}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px_auto]">
                <PanelField label="Buscar">
                    <div className="relative">
                        <IconSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
                        <input className="form-input pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={copy.searchPlaceholder} />
                    </div>
                </PanelField>
                <PanelField label="Categoría" hint={MARKETPLACE_PUBLIC_PRODUCTS_CATEGORY_HINT}>
                    <PanelSelect value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">Todas</option>
                        {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </PanelSelect>
                </PanelField>
                <MarketplaceCatalogLocationFilters
                    region={region}
                    commune={commune}
                    onRegionChange={setRegion}
                    onCommuneChange={setCommune}
                />
                <div className="flex items-end">
                    <PanelButton variant="secondary" onClick={() => { setQuery(''); setCategory(''); setRegion(''); setCommune(''); }}>Limpiar</PanelButton>
                </div>
            </div>

            {loadError ? <PanelNotice tone="warning">{loadError}</PanelNotice> : null}

            {loading || searching ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted"><IconLoader2 size={16} className="animate-spin" /> Cargando productos…</p>
            ) : products.length === 0 ? (
                <PanelEmptyState title="Sin resultados por ahora" description="Prueba otra categoría o vuelve más tarde." />
            ) : (
                <BusinessOperatorProductsCatalog vertical={vertical} products={products} showProvider showConsult />
            )}
        </div>
    );
}
