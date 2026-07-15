import type { Metadata } from 'next';
import SimuladorHipotecario from '@/components/hipotecario/SimuladorHipotecario';
import type { TipoPropiedad } from '@/lib/hipotecario/calculadora';
import { fetchValorUF } from '@/lib/hipotecario/fetch-uf';

export const metadata: Metadata = {
    title: 'Simulador de crédito hipotecario | SimplePropiedades',
    description:
        'Simula tu crédito hipotecario en Chile: dividendo mensual, seguros y capacidad de pago. Herramienta orientativa.',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string | undefined {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value[0];
    return undefined;
}

function resolveTipo(value: string | undefined): TipoPropiedad | undefined {
    if (value === 'nueva' || value === 'usada') return value;
    return undefined;
}

function parsePositiveInt(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const n = Number(value.replace(/\D/g, ''));
    return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function SimuladorHipotecarioPage({
    searchParams,
}: {
    searchParams: SearchParams;
}) {
    const [uf, params] = await Promise.all([fetchValorUF(), searchParams]);

    return (
        <SimuladorHipotecario
            valorUF={uf.valor}
            valorUFFuente={uf.fuente}
            listingTitle={firstParam(params.titulo)?.trim() || undefined}
            listingId={firstParam(params.listingId)?.trim() || undefined}
            initialTipoPropiedad={resolveTipo(firstParam(params.tipo))}
            initialPrecioUF={parsePositiveInt(firstParam(params.precioUF))}
            initialPrecioCLP={parsePositiveInt(firstParam(params.precio))}
        />
    );
}
