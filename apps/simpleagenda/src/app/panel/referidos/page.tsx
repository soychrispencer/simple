import { redirect } from 'next/navigation';

/** @deprecated Usa /panel/mi-cuenta/referidos */
export default function ReferidosLegacyRedirect() {
    redirect('/panel/mi-cuenta/referidos');
}
