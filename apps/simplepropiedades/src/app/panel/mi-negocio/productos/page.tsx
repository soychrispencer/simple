import { redirect } from 'next/navigation';

/** Crear/administrar catálogo vive en Mis publicaciones. */
export default function MiNegocioProductosRedirectPage() {
    redirect('/panel/publicaciones?tab=products');
}
