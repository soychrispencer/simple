'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE } from '@simple/config';
import { getSupportedCountries, getRegionsForCountry, getLocalitiesForRegion } from '@simple/utils';

type ProfessionalItem = {
    slug: string;
    displayName: string | null;
    profession: string | null;
    headline: string | null;
    avatarUrl: string | null;
    city: string | null;
    region: string | null;
    countryCode: string;
    servesOnline: boolean;
    servesPresential: boolean;
};

type Filters = {
    country: string;
    region: string;
    locality: string;
    profession: string;
    q: string;
    modality: 'all' | 'online' | 'presential';
};

function parseFilters(params: URLSearchParams): Filters {
    const modality = params.get('modality') ?? params.get('modalidad') ?? 'all';
    return {
        country: params.get('country') ?? params.get('pais') ?? 'CL',
        region: params.get('region') ?? '',
        locality: params.get('locality') ?? params.get('comuna') ?? '',
        profession: params.get('profession') ?? params.get('rubro') ?? '',
        q: params.get('q') ?? '',
        modality: modality === 'online' || modality === 'presential' ? modality : 'all',
    };
}

function filtersToParams(filters: Filters) {
    const params = new URLSearchParams();
    if (filters.country && filters.country !== 'CL') params.set('country', filters.country);
    if (filters.region) params.set('region', filters.region);
    if (filters.locality) params.set('locality', filters.locality);
    if (filters.profession) params.set('profession', filters.profession);
    if (filters.q) params.set('q', filters.q);
    if (filters.modality !== 'all') params.set('modality', filters.modality);
    return params;
}

export default function ProfesionalesPage() {
    return (
        <Suspense fallback={<div className="container-app py-8 text-sm text-fg-muted">Cargando profesionales…</div>}>
            <ProfesionalesPageInner />
        </Suspense>
    );
}

function ProfesionalesPageInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
    const [draft, setDraft] = useState<Filters>(filters);
    const [items, setItems] = useState<ProfessionalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setDraft(filters);
    }, [filters]);

    const load = useCallback(async (next: Filters) => {
        setLoading(true);
        setError(null);
        const params = filtersToParams(next);
        const response = await fetch(`${API_BASE}/api/public/agenda/marketplace/professionals?${params.toString()}`);
        const data = await response.json().catch(() => null) as { ok?: boolean; items?: ProfessionalItem[]; error?: string };
        if (!response.ok || !data?.ok) {
            setItems([]);
            setError(data?.error ?? 'No pudimos cargar profesionales.');
            setLoading(false);
            return;
        }
        setItems(data.items ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        void load(filters);
    }, [filters, load]);

    const regions = useMemo(() => getRegionsForCountry(draft.country), [draft.country]);
    const regionId = regions.find((r) => r.name === draft.region)?.id ?? '';
    const localities = useMemo(() => getLocalitiesForRegion(draft.country, regionId), [draft.country, regionId]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const params = filtersToParams(draft);
        router.push(params.toString() ? `/profesionales?${params}` : '/profesionales');
    };

    return (
        <div className="container-app py-8 lg:py-12">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-fg">Encuentra un profesional</h1>
                <p className="mt-1 text-sm text-fg-muted">
                    Directorio de profesionales con reserva directa en su página pública. Sin comisiones de Simple por cita.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="mb-8 grid gap-3 rounded-2xl border border-(--border) bg-(--surface) p-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm">
                    <span className="mb-1 block text-fg-muted">País</span>
                    <select className="form-input" value={draft.country} onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value, region: '', locality: '' }))}>
                        {getSupportedCountries().map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                </label>
                <label className="text-sm">
                    <span className="mb-1 block text-fg-muted">Rubro</span>
                    <input className="form-input" value={draft.profession} onChange={(e) => setDraft((d) => ({ ...d, profession: e.target.value }))} placeholder="Psicólogo, nutricionista…" />
                </label>
                <label className="text-sm">
                    <span className="mb-1 block text-fg-muted">Búsqueda</span>
                    <input className="form-input" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} placeholder="Nombre o palabra clave" />
                </label>
                {regions.length > 0 ? (
                    <label className="text-sm">
                        <span className="mb-1 block text-fg-muted">Región</span>
                        <select className="form-input" value={draft.region} onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value, locality: '' }))}>
                            <option value="">Todas</option>
                            {regions.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                    </label>
                ) : (
                    <label className="text-sm">
                        <span className="mb-1 block text-fg-muted">Región</span>
                        <input className="form-input" value={draft.region} onChange={(e) => setDraft((d) => ({ ...d, region: e.target.value }))} />
                    </label>
                )}
                {localities.length > 0 ? (
                    <label className="text-sm">
                        <span className="mb-1 block text-fg-muted">Comuna / ciudad</span>
                        <select className="form-input" value={draft.locality} onChange={(e) => setDraft((d) => ({ ...d, locality: e.target.value }))}>
                            <option value="">Todas</option>
                            {localities.map((l) => <option key={l.id} value={l.name}>{l.name}</option>)}
                        </select>
                    </label>
                ) : (
                    <label className="text-sm">
                        <span className="mb-1 block text-fg-muted">Comuna / ciudad</span>
                        <input className="form-input" value={draft.locality} onChange={(e) => setDraft((d) => ({ ...d, locality: e.target.value }))} />
                    </label>
                )}
                <label className="text-sm">
                    <span className="mb-1 block text-fg-muted">Modalidad</span>
                    <select className="form-input" value={draft.modality} onChange={(e) => setDraft((d) => ({ ...d, modality: e.target.value as Filters['modality'] }))}>
                        <option value="all">Todas</option>
                        <option value="online">Online</option>
                        <option value="presential">Presencial</option>
                    </select>
                </label>
                <div className="flex items-end md:col-span-2 lg:col-span-3">
                    <button type="submit" className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white">
                        Buscar profesionales
                    </button>
                </div>
            </form>

            {loading ? <p className="text-sm text-fg-muted">Cargando profesionales…</p> : null}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            {!loading && !error ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                        <Link
                            key={item.slug}
                            href={`/${item.slug}`}
                            className="rounded-2xl border border-(--border) bg-(--surface) p-4 transition-colors hover:border-accent-border"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--bg-subtle) text-sm font-semibold text-accent">
                                    {item.displayName?.charAt(0) ?? '?'}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-fg truncate">{item.displayName ?? 'Profesional'}</p>
                                    <p className="text-sm text-fg-muted truncate">{item.profession ?? 'Sin rubro'}</p>
                                    <p className="mt-1 text-xs text-fg-muted">
                                        {[item.city, item.region].filter(Boolean).join(', ') || item.countryCode}
                                    </p>
                                    <p className="mt-1 text-xs text-accent">
                                        {item.servesOnline && item.servesPresential
                                            ? 'Online y presencial'
                                            : item.servesOnline
                                                ? 'Online'
                                                : item.servesPresential
                                                    ? 'Presencial'
                                                    : 'Consultar modalidad'}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : null}

            {!loading && !error && items.length === 0 ? (
                <p className="text-sm text-fg-muted">No encontramos profesionales con esos filtros.</p>
            ) : null}
        </div>
    );
}
