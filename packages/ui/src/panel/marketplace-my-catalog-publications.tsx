'use client';

import type { PublicProfileVertical } from '@simple/utils';
import { BusinessOperatorProductsEditor } from './business-operator-products-editor.js';
import { BusinessOperatorServicesEditor } from './business-operator-services-editor.js';

export type CatalogPublicationKind = 'service' | 'product';

/**
 * Administración de catálogo en Mis publicaciones.
 * Crear solo desde el + Publicar del header; aquí solo se edita.
 */
export function MarketplaceMyCatalogPublications({
    vertical,
    kind,
}: {
    vertical: PublicProfileVertical;
    kind: CatalogPublicationKind;
}) {
    if (kind === 'service') {
        return (
            <BusinessOperatorServicesEditor
                vertical={vertical}
                createHref="/panel/publicar?op=service"
            />
        );
    }

    return (
        <BusinessOperatorProductsEditor
            vertical={vertical}
            createHref="/panel/publicar?op=product"
        />
    );
}
