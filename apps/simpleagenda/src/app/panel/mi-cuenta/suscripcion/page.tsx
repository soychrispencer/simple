import { redirect } from 'next/navigation';

export default async function LegacySuscripcionesPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
        if (typeof value === 'string') query.append(key, value);
        else value?.forEach((item) => query.append(key, item));
    }
    redirect(`/panel/mi-negocio/plan${query.size ? `?${query}` : ''}`);
}
