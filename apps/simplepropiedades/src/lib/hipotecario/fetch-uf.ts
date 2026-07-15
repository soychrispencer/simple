import { VALOR_UF_REFERENCIAL } from './tasas-referenciales';

export type ValorUFFuente = 'vivo' | 'referencial';

export type ValorUFResult = {
  valor: number;
  fuente: ValorUFFuente;
};

/** UF del día (mindicador.cl). Si falla, usa el valor referencial. */
export async function fetchValorUF(): Promise<ValorUFResult> {
  try {
    const response = await fetch('https://mindicador.cl/api/uf', {
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return { valor: VALOR_UF_REFERENCIAL, fuente: 'referencial' };
    }
    const data = (await response.json()) as {
      serie?: Array<{ valor?: number }>;
    };
    const valor = data.serie?.[0]?.valor;
    if (typeof valor === 'number' && valor > 0) {
      return { valor, fuente: 'vivo' };
    }
    return { valor: VALOR_UF_REFERENCIAL, fuente: 'referencial' };
  } catch {
    return { valor: VALOR_UF_REFERENCIAL, fuente: 'referencial' };
  }
}
