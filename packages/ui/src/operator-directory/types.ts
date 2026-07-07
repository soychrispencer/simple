export type OperatorSearchFieldId =
    | 'q'
    | 'country'
    | 'region'
    | 'locality'
    | 'date'
    | 'profession'
    | 'modality';

export type OperatorSearchShellValue = {
    q: string;
    country: string;
    region: string;
    locality: string;
    date?: string;
    profession?: string;
    modality?: 'all' | 'online' | 'presential';
};

export type OperatorDirectoryFilterChip = {
    id: string;
    label: string;
    href: string;
};

export type OperatorSearchShellCopy = {
    queryPlaceholder: string;
    queryAriaLabel: string;
    footerHint: string;
    submitLabel?: string;
    localityPlaceholder?: string;
    professionPlaceholder?: string;
};
