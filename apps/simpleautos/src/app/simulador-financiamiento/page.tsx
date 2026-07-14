import { redirect } from 'next/navigation';
import { SIMULADOR_CREDITO_PATH } from '@/lib/financiamiento/listing-href';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Alias legacy: redirige al simulador de crédito automotriz. */
export default async function SimuladorFinanciamientoRedirect({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') query.set(key, value);
        else if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    }
    const qs = query.toString();
    redirect(qs ? `${SIMULADOR_CREDITO_PATH}?${qs}` : SIMULADOR_CREDITO_PATH);
}
