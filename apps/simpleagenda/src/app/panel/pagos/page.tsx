import { redirect } from 'next/navigation';

/** @deprecated Usa /panel/finanzas */
export default function PagosLegacyRedirect() {
    redirect('/panel/finanzas');
}
