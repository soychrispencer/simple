import type { PublishType } from './vertical-config.js';
import { publicationListPath } from './publication.js';

export type PublishWizardStepId = 'media' | 'basics' | 'details' | 'confirm';

export type PublishTypeDefinition = {
    type: PublishType;
    label: string;
    description: string;
    /** Steps shown in the wizard for this type */
    steps: readonly PublishWizardStepId[];
    successListPath: string;
};

const ALL_DEFINITIONS: Record<PublishType, PublishTypeDefinition> = {
    sale: {
        type: 'sale',
        label: 'Venta',
        description: 'Publica un aviso de venta.',
        steps: ['media', 'basics', 'details', 'confirm'],
        successListPath: publicationListPath('sale'),
    },
    rent: {
        type: 'rent',
        label: 'Arriendo',
        description: 'Publica un aviso de arriendo.',
        steps: ['media', 'basics', 'details', 'confirm'],
        successListPath: publicationListPath('rent'),
    },
    auction: {
        type: 'auction',
        label: 'Subasta',
        description: 'Publica una subasta.',
        steps: ['media', 'basics', 'details', 'confirm'],
        successListPath: publicationListPath('auction'),
    },
    project: {
        type: 'project',
        label: 'Proyecto',
        description: 'Publica un proyecto inmobiliario.',
        steps: ['media', 'basics', 'details', 'confirm'],
        successListPath: publicationListPath('project'),
    },
    service: {
        type: 'service',
        label: 'Servicio',
        description: 'Ofrece un servicio con nombre y precio.',
        steps: ['media', 'basics', 'confirm'],
        successListPath: publicationListPath('service'),
    },
    product: {
        type: 'product',
        label: 'Producto',
        description: 'Vende un producto o accesorio.',
        steps: ['media', 'basics', 'confirm'],
        successListPath: publicationListPath('product'),
    },
};

export const PUBLISH_SELECTOR_TITLE = '¿Qué quieres publicar?';

export function getPublishTypeDefinition(type: PublishType): PublishTypeDefinition {
    return ALL_DEFINITIONS[type];
}

export function getPublishTypeDefinitions(types: readonly PublishType[]): PublishTypeDefinition[] {
    return types.map((type) => ALL_DEFINITIONS[type]);
}

export function publishTypeIncludesStep(type: PublishType, step: PublishWizardStepId): boolean {
    return ALL_DEFINITIONS[type].steps.includes(step);
}
