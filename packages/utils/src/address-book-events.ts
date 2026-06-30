export const ADDRESS_BOOK_CHANGED_EVENT = 'simple:address-book-changed';
export const AGENDA_LOCATIONS_CHANGED_EVENT = 'simple:agenda-locations-changed';

export type AddressBookChangedDetail = {
    scope?: 'personal' | 'business';
    vertical?: string;
};

export function dispatchAddressBookChanged(detail?: AddressBookChangedDetail) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(ADDRESS_BOOK_CHANGED_EVENT, { detail }));
}

export function dispatchAgendaLocationsChanged() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(AGENDA_LOCATIONS_CHANGED_EVENT));
}
