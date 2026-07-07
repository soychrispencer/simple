export type AgendaDirectorySort = 'recommended' | 'name_asc';

export type AgendaDirectoryFilterChip = {
    id: string;
    label: string;
    href: string;
};

export type AgendaDirectoryFilters = {
    q: string;
    country: string;
    region: string;
    locality: string;
    profession: string;
    modality: 'all' | 'online' | 'presential';
    sort: AgendaDirectorySort;
};

export const EMPTY_AGENDA_DIRECTORY_FILTERS: AgendaDirectoryFilters = {
    q: '',
    country: 'CL',
    region: '',
    locality: '',
    profession: '',
    modality: 'all',
    sort: 'recommended',
};

export function parseAgendaDirectoryParams(params: URLSearchParams): AgendaDirectoryFilters {
    const modalityRaw = params.get('modality') ?? params.get('modalidad') ?? 'all';
    const sortRaw = params.get('sort');
    return {
        country: params.get('country') ?? params.get('pais') ?? 'CL',
        region: params.get('region') ?? '',
        locality: params.get('locality') ?? params.get('comuna') ?? '',
        profession: params.get('profession') ?? params.get('rubro') ?? '',
        q: params.get('q') ?? '',
        modality: modalityRaw === 'online' || modalityRaw === 'presential' ? modalityRaw : 'all',
        sort: sortRaw === 'name_asc' ? 'name_asc' : 'recommended',
    };
}

export function agendaDirectoryFiltersToParams(filters: AgendaDirectoryFilters): URLSearchParams {
    const params = new URLSearchParams();
    if (filters.country && filters.country !== 'CL') params.set('country', filters.country);
    if (filters.region) params.set('region', filters.region);
    if (filters.locality) params.set('locality', filters.locality);
    if (filters.profession) params.set('profession', filters.profession);
    if (filters.q) params.set('q', filters.q);
    if (filters.modality && filters.modality !== 'all') params.set('modality', filters.modality);
    if (filters.sort !== 'recommended') params.set('sort', filters.sort);
    return params;
}

export function agendaDirectoryHref(filters: AgendaDirectoryFilters): string {
    const query = agendaDirectoryFiltersToParams(filters).toString();
    return query ? `/profesionales?${query}` : '/profesionales';
}

export function agendaDirectoryActiveFilterChips(filters: AgendaDirectoryFilters): AgendaDirectoryFilterChip[] {
    const chips: AgendaDirectoryFilterChip[] = [];

    if (filters.q.trim()) {
        chips.push({
            id: 'q',
            label: `Búsqueda: ${filters.q.trim()}`,
            href: agendaDirectoryHref({ ...filters, q: '' }),
        });
    }
    if (filters.profession?.trim()) {
        chips.push({
            id: 'profession',
            label: `Rubro: ${filters.profession.trim()}`,
            href: agendaDirectoryHref({ ...filters, profession: '' }),
        });
    }
    if (filters.locality.trim()) {
        chips.push({
            id: 'locality',
            label: filters.locality.trim(),
            href: agendaDirectoryHref({ ...filters, locality: '' }),
        });
    }
    if (filters.region.trim()) {
        chips.push({
            id: 'region',
            label: filters.region.trim(),
            href: agendaDirectoryHref({ ...filters, region: '', locality: '' }),
        });
    }
    if (filters.modality && filters.modality !== 'all') {
        chips.push({
            id: 'modality',
            label: filters.modality === 'online' ? 'Online' : 'Presencial',
            href: agendaDirectoryHref({ ...filters, modality: 'all' }),
        });
    }

    return chips;
}

export function hasActiveAgendaDirectoryFilters(filters: AgendaDirectoryFilters): boolean {
    return agendaDirectoryActiveFilterChips(filters).length > 0;
}

export const AGENDA_DIRECTORY_SORT_OPTIONS = [
    { value: 'recommended', label: 'Recomendados' },
    { value: 'name_asc', label: 'Nombre A-Z' },
] as const;

export const AGENDA_DIRECTORY_SEARCH_COPY = {
    queryPlaceholder: 'Nombre o palabra clave',
    queryAriaLabel: 'Buscar profesional',
    footerHint: 'Filtra por rubro, zona y modalidad. Reserva directa en el perfil publicado de cada profesional.',
    submitLabel: 'Buscar',
    localityPlaceholder: 'Comuna / ciudad',
    professionPlaceholder: 'Psicólogo, nutricionista…',
} as const;

export const AGENDA_DIRECTORY_SEARCH_FIELDS = [
    'q',
    'country',
    'profession',
    'region',
    'locality',
    'modality',
] as const;
