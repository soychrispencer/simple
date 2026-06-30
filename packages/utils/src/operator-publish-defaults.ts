import type { PublicProfileAccountKind, PublicProfileVertical } from './public-profile-settings.js';
import { resolveOperatorSubtypeLabel } from './operator-profile-config.js';

export type AutosListingOperation = 'sale' | 'rent' | 'auction';
export type PropiedadesListingOperation = 'sale' | 'rent' | 'project';

type OperatorProfileInput = {
    accountKind: PublicProfileAccountKind;
    operatorSubtype: string | null;
    specialties: string[];
};

export type OperatorPublishDefaults<T> = {
    suggested: T;
    hint: string | null;
};

function hasTag(specialties: string[], tag: string): boolean {
    return specialties.includes(tag);
}

export function resolveAutosPublishDefaults(
    profile: OperatorProfileInput,
): OperatorPublishDefaults<AutosListingOperation> {
    const { operatorSubtype, specialties } = profile;

    if (operatorSubtype === 'rent_a_car' || hasTag(specialties, 'rent') || hasTag(specialties, 'fleet')) {
        return {
            suggested: 'rent',
            hint: 'Según tu perfil, publicar en arriendo encaja con tu operación (rent a car o flota).',
        };
    }

    if (operatorSubtype === 'consignment' || hasTag(specialties, 'consignment')) {
        return {
            suggested: 'sale',
            hint: 'Operas con consignación: en la descripción del aviso puedes indicar comisión, plazos y condiciones de retiro.',
        };
    }

    if (hasTag(specialties, 'financing') || operatorSubtype === 'dealership') {
        return {
            suggested: 'sale',
            hint: 'Tu perfil destaca venta con financiamiento. Menciona crédito o pie en la descripción si aplica.',
        };
    }

    return { suggested: 'sale', hint: null };
}

export function resolvePropiedadesPublishDefaults(
    profile: OperatorProfileInput,
): OperatorPublishDefaults<PropiedadesListingOperation> {
    const { operatorSubtype, specialties } = profile;

    if (operatorSubtype === 'developer' || hasTag(specialties, 'project')) {
        return {
            suggested: 'project',
            hint: 'Tu perfil apunta a proyectos inmobiliarios. Usa la ficha de proyecto para tipologías, etapa y entrega.',
        };
    }

    if (
        operatorSubtype === 'landlord'
        || operatorSubtype === 'property_manager'
        || hasTag(specialties, 'rent')
        || hasTag(specialties, 'administration')
    ) {
        return {
            suggested: 'rent',
            hint: 'Según tu perfil, este aviso encaja como arriendo o administración de propiedades.',
        };
    }

    if (operatorSubtype === 'appraiser' || hasTag(specialties, 'appraisal')) {
        return {
            suggested: 'sale',
            hint: 'Como tasador, puedes publicar venta y detallar metodología o alcance en la descripción.',
        };
    }

    return { suggested: 'sale', hint: null };
}

export function resolveOperatorPublishHint(
    vertical: PublicProfileVertical,
    profile: OperatorProfileInput,
): string | null {
    if (vertical === 'autos') {
        return resolveAutosPublishDefaults(profile).hint;
    }
    return resolvePropiedadesPublishDefaults(profile).hint;
}

export function resolveOperatorSubtypeHint(
    vertical: PublicProfileVertical,
    profile: OperatorProfileInput,
): string | null {
    if (!profile.operatorSubtype) return null;
    const label = resolveOperatorSubtypeLabel(vertical, profile.accountKind, profile.operatorSubtype);
    if (!label) return null;
    return `Perfil configurado como ${label}.`;
}
