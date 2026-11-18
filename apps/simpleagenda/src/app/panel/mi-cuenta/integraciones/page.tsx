import { redirect } from 'next/navigation';

export default async function LegacyIntegracionesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') query.append(key, value);
        else value?.forEach((item) => query.append(key, item));
    }
    const suffix = query.size ? `?${query}` : '';
    if (params.gc) redirect(`/panel/agenda/calendarios${suffix}`);
    redirect(`/panel/mi-negocio/agenda${suffix}#cobros`);
}
