import type { Metadata } from 'next';
import SimuladorCreditoAuto from '@/components/financiamiento/SimuladorCreditoAuto';
import type { TipoVehiculo } from '@/lib/financiamiento/calculadora';

export const metadata: Metadata = {
    title: 'Simulador de crédito automotriz | SimpleAutos',
    description:
        'Simula tu crédito automotriz en Chile: cuota mensual, costo total y capacidad de financiamiento. Herramienta orientativa, no es aprobación de crédito.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string | undefined {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
}

function resolveTipo(value: string | undefined): TipoVehiculo | undefined {
    if (value === 'nuevo' || value === 'usado') return value;
    return undefined;
}

export default async function SimuladorCreditoAutomotrizPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const params = await searchParams;
    const precioRaw = firstParam(params.precio)?.replace(/\D/g, '');
    const anioRaw = firstParam(params.anio)?.replace(/\D/g, '');
    const titulo = firstParam(params.titulo)?.trim() || undefined;
    const listingId = firstParam(params.listingId)?.trim() || undefined;
    const initialTipo = resolveTipo(firstParam(params.tipo));
    const initialPrecio = precioRaw ? Number(precioRaw) : undefined;
    const initialAnio = anioRaw ? Number(anioRaw) : undefined;

    return (
        <SimuladorCreditoAuto
            listingTitle={titulo}
            listingId={listingId}
            initialTipoVehiculo={initialTipo}
            initialPrecio={
                initialPrecio && Number.isFinite(initialPrecio) && initialPrecio > 0
                    ? initialPrecio
                    : undefined
            }
            initialAnio={
                initialAnio && Number.isFinite(initialAnio) ? initialAnio : undefined
            }
        />
    );
}
