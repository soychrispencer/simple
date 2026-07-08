'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { IconSearch } from '@tabler/icons-react';
import { LOCATION_REGIONS } from '@simple/utils';
import { PanelButton } from '@simple/ui/panel';
import HomeSearchBox from './home-searchbox';

type HubSearchMode = 'vehicles' | 'services' | 'products';

const MODE_META: Record<HubSearchMode, { label: string; placeholder: string; path: string }> = {
    vehicles: { label: 'Vehículos', placeholder: '', path: '/ventas' },
    services: { label: 'Servicios', placeholder: 'Lavado, taller, revisión técnica…', path: '/servicios' },
    products: { label: 'Productos', placeholder: 'Zócalos, stickers, protectores…', path: '/productos' },
};

function HubCatalogSearchForm({ mode }: { mode: 'services' | 'products' }) {
    const router = useRouter();
    const meta = MODE_META[mode];
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
        <section className="container-app relative z-11 mt-0 mb-10">
            <div className="rounded-card border overflow-visible marketplace-search-hero p-3 sm:p-4">
                <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
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
            </div>
        </section>
    );
}

function HubSearchShellContent() {
    const [mode, setMode] = useState<HubSearchMode>('vehicles');

    return (
        <div className="relative z-11 -mt-12 md:-mt-16 space-y-0">
            <div className="container-app relative z-12 -mb-2">
                <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-sm">
                    {(Object.keys(MODE_META) as HubSearchMode[]).map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setMode(key)}
                            className={`h-9 px-4 text-sm font-medium rounded-lg transition-colors ${mode === key ? 'bg-[var(--bg-subtle)] text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'}`}
                        >
                            {MODE_META[key].label}
                        </button>
                    ))}
                </div>
            </div>
            {mode === 'vehicles' ? <HomeSearchBox /> : <HubCatalogSearchForm mode={mode} />}
        </div>
    );
}

export default function HubSearchShell() {
    return (
        <Suspense fallback={null}>
            <HubSearchShellContent />
        </Suspense>
    );
}
