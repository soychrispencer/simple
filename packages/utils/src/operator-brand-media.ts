export type OperatorBrandMediaInput = {
    logoUrl?: string | null;
    coverUrl?: string | null;
};

export function operatorBrandMediaMissing(input: OperatorBrandMediaInput): Array<'logo' | 'portada'> {
    const missing: Array<'logo' | 'portada'> = [];
    if (!input.logoUrl?.trim()) missing.push('logo');
    if (!input.coverUrl?.trim()) missing.push('portada');
    return missing;
}

export function hasOperatorBrandMedia(input: OperatorBrandMediaInput): boolean {
    return operatorBrandMediaMissing(input).length === 0;
}

export function operatorBrandMediaPublishError(missing: Array<'logo' | 'portada'>): string {
    if (missing.length === 0) return '';
    const labels = missing.map((item) => (item === 'logo' ? 'logo' : 'portada'));
    return `Antes de publicar completa: ${labels.join(' y ')}.`;
}

/** Dimensiones al subir con el editor integrado; no validadas en API si llega otra URL. */
export const OPERATOR_BRAND_IMAGES_UPLOAD_HINT =
    'Sugerencia: Portada 16:9 (1600×900 px recomendado) y logo cuadrado 512×512 px.';
