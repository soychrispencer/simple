import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

export default async function MiNegocioServicioIdRedirectPage({ params }: Props) {
    const { id } = await params;
    redirect(`/panel/mis-servicios/${id}`);
}
