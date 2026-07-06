import { redirect } from 'next/navigation';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Alias corto para campañas y enlaces legacy. */
export default async function SimuladorFinanciamientoRedirect({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') query.set(key, value);
        else if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    }
    const qs = query.toString();
    redirect(qs ? `/precalificacion-financiamiento?${qs}` : '/precalificacion-financiamiento');
}
