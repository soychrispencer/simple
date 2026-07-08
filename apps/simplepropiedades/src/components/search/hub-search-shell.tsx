'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { IconAdjustmentsHorizontal, IconChevronDown, IconSearch } from '@tabler/icons-react';
import { LOCATION_REGIONS } from '@simple/utils';
import { PanelButton } from '@simple/ui/panel';
import HomeSearchBox, { type PropertiesTab } from './home-searchbox';

type HubSearchTab = PropertiesTab | 'servicios' | 'productos';

const HUB_TABS: Array<{ key: HubSearchTab; label: string }> = [
    { key: 'comprar', label: 'Comprar' },
    { key: 'arrendar', label: 'Arrendar' },
    { key: 'proyectos', label: 'Proyectos' },
    { key: 'servicios', label: 'Servicios' },
    { key: 'productos', label: 'Productos' },
];

const CATALOG_META: Record<'servicios' | 'productos', { placeholder: string; path: string }> = {
    servicios: { placeholder: 'Aseo, mudanza, tasación…', path: '/servicios' },
    productos: { placeholder: 'Herramientas, decoración…', path: '/productos' },
};

function isListingTab(tab: HubSearchTab): tab is PropertiesTab {
    return tab === 'comprar' || tab === 'arrendar' || tab === 'proyectos';
}

function HubCatalogSearchForm({ mode }: { mode: 'servicios' | 'productos' }) {
    const router = useRouter();
    const meta = CATALOG_META[mode];
    const [query, setQuery] = useState('');
    const [region, setRegion] = useState('');

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (region) params.set('region', region);
        const suffix = params.toString() ? `?${params.toString()}` : '';
        router.push(`${meta.path}${suffix}`);
    }

    return (
        <form onSubmit={handleSubmit} className="grid gap-3 p-3 sm:p-4 md:grid-cols-[1fr_200px_auto]">
            <div className="relative">
                <IconSearch size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
                <input
                    className="form-input h-11 pl-10"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={meta.placeholder}
                />
            </div>
            <select className="form-input h-11" value={region} onChange={(event) => setRegion(event.target.value)}>
                <option value="">Todas las regiones</option>
                {LOCATION_REGIONS.map((item) => (
                    <option key={item.id} value={item.name}>{item.name}</option>
                ))}
            </select>
            <PanelButton type="submit" className="h-11">Buscar</PanelButton>
        </form>
    );
}

function HubSearchShellContent() {
    const [activeTab, setActiveTab] = useState<HubSearchTab>('comprar');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const listingMode = isListingTab(activeTab);

    return (
        <section className="container-app relative z-11 -mt-12 mb-10 md:-mt-16">
            <div className="overflow-visible rounded-card border marketplace-search-hero">
                <div className="flex flex-nowrap items-center justify-between gap-2 border-b border-border px-3 pb-2 pt-3 sm:px-4">
                    <div className="inline-flex min-w-0 flex-1 overflow-x-auto rounded-xl bg-bg-subtle p-1 [scrollbar-width:none]">
                        {HUB_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => {
                                    setActiveTab(tab.key);
                                    if (!isListingTab(tab.key)) setShowAdvanced(false);
                                }}
                                className="h-8 shrink-0 rounded-md border px-3 text-sm font-medium transition-all sm:h-9 sm:px-4 hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
                                style={{
                                    background: activeTab === tab.key ? 'var(--button-primary-bg)' : 'transparent',
                                    color: activeTab === tab.key ? 'var(--button-primary-color)' : 'var(--fg-secondary)',
                                    borderColor: activeTab === tab.key ? 'var(--button-primary-border)' : 'transparent',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {listingMode ? (
                        <PanelButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 shrink-0 justify-center px-0 sm:h-9 sm:w-auto sm:px-3"
                            onClick={() => setShowAdvanced((current) => !current)}
                            aria-label="Mostrar filtros avanzados"
                        >
                            <IconAdjustmentsHorizontal size={15} />
                            <span className="hidden sm:inline">Más filtros</span>
                            <IconChevronDown
                                size={14}
                                className="hidden sm:inline"
                                style={{ transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 180ms ease' }}
                            />
                        </PanelButton>
                    ) : null}
                </div>

                {listingMode ? (
                    <HomeSearchBox
                        listingTab={activeTab}
                        showAdvanced={showAdvanced}
                    />
                ) : (
                    <HubCatalogSearchForm mode={activeTab} />
                )}
            </div>
        </section>
    );
}

export default function HubSearchShell() {
    return (
        <Suspense fallback={null}>
            <HubSearchShellContent />
        </Suspense>
    );
}
