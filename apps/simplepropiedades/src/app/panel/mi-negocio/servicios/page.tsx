import { redirect } from 'next/navigation';

/** Crear/administrar catálogo vive en Mis publicaciones. */
export default function MiNegocioServiciosRedirectPage() {
    redirect('/panel/publicaciones?tab=services');
}
