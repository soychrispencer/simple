import type { PublicProfileAccountKind, PublicProfileVertical } from './public-profile-settings.js';

type OperatorProfileInput = {
    accountKind: PublicProfileAccountKind;
    operatorSubtype: string | null;
    specialties: string[];
    displayName?: string;
};

export type AutosOperatorPublishContext = {
    showFleetRentFields: boolean;
    showConsignmentFields: boolean;
};

export type PropiedadesOperatorPublishContext = {
    emphasizeProjectOperation: boolean;
    showRentAdminFields: boolean;
    prefillDeveloperName: string | null;
};

export type OperatorPublishContext = {
    autos: AutosOperatorPublishContext;
    propiedades: PropiedadesOperatorPublishContext;
};

function hasTag(specialties: string[], tag: string): boolean {
    return specialties.includes(tag);
}

export function resolveAutosOperatorPublishContext(
    profile: OperatorProfileInput,
    listingType: 'sale' | 'rent' | 'auction',
): AutosOperatorPublishContext {
    const { operatorSubtype, specialties } = profile;
    const fleetOperator =
        operatorSubtype === 'rent_a_car'
        || hasTag(specialties, 'rent')
        || hasTag(specialties, 'fleet');
    const consignmentOperator =
        operatorSubtype === 'consignment'
        || hasTag(specialties, 'consignment');

    return {
        showFleetRentFields: listingType === 'rent' || fleetOperator,
        showConsignmentFields: listingType === 'sale' && consignmentOperator,
    };
}

export function resolvePropiedadesOperatorPublishContext(
    profile: OperatorProfileInput,
): PropiedadesOperatorPublishContext {
    const { operatorSubtype, specialties, displayName } = profile;
    const emphasizeProjectOperation =
        operatorSubtype === 'developer'
        || hasTag(specialties, 'project');
    const showRentAdminFields =
        operatorSubtype === 'landlord'
        || operatorSubtype === 'property_manager'
        || hasTag(specialties, 'rent')
        || hasTag(specialties, 'administration');
    const prefillDeveloperName =
        emphasizeProjectOperation && displayName?.trim()
            ? displayName.trim()
            : null;

    return {
        emphasizeProjectOperation,
        showRentAdminFields,
        prefillDeveloperName,
    };
}

export function resolveOperatorPublishContext(
    vertical: PublicProfileVertical,
    profile: OperatorProfileInput,
    options: { autosListingType?: 'sale' | 'rent' | 'auction' } = {},
): OperatorPublishContext {
    return {
        autos: resolveAutosOperatorPublishContext(
            profile,
            options.autosListingType ?? 'sale',
        ),
        propiedades: resolvePropiedadesOperatorPublishContext(profile),
    };
}
