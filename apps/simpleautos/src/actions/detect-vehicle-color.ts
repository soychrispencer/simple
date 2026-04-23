'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '');

const COLOR_LIST = [
    'Negro', 'Blanco', 'Blanco Perla', 'Plata', 'Gris', 'Gris Oscuro',
    'Rojo', 'Burdeos', 'Azul', 'Azul Marino', 'Celeste', 'Verde',
    'Amarillo', 'Naranjo', 'Café', 'Beige', 'Dorado', 'Morado',
];

// Common synonyms the model might return instead of exact list values
const SYNONYMS: Record<string, string> = {
    'plateado': 'Plata', 'silver': 'Plata', 'cromado': 'Plata',
    'gris claro': 'Gris', 'gris medio': 'Gris', 'grey': 'Gris', 'gray': 'Gris',
    'gris oscuro': 'Gris Oscuro', 'grafito': 'Gris Oscuro', 'antracita': 'Gris Oscuro', 'charcoal': 'Gris Oscuro',
    'blanco nacar': 'Blanco Perla', 'blanco nácár': 'Blanco Perla', 'blanco nacár': 'Blanco Perla',
    'blanco perla': 'Blanco Perla', 'pearl white': 'Blanco Perla',
    'negro': 'Negro', 'black': 'Negro',
    'blanco': 'Blanco', 'white': 'Blanco',
    'rojo': 'Rojo', 'red': 'Rojo',
    'granate': 'Burdeos', 'vino': 'Burdeos', 'bordo': 'Burdeos', 'bordó': 'Burdeos', 'burgundy': 'Burdeos', 'burdeos': 'Burdeos',
    'azul': 'Azul', 'blue': 'Azul', 'azul claro': 'Azul',
    'azul marino': 'Azul Marino', 'azul oscuro': 'Azul Marino', 'navy': 'Azul Marino', 'marino': 'Azul Marino',
    'celeste': 'Celeste', 'azul celeste': 'Celeste', 'sky blue': 'Celeste',
    'verde': 'Verde', 'green': 'Verde', 'verde oscuro': 'Verde', 'verde claro': 'Verde',
    'amarillo': 'Amarillo', 'yellow': 'Amarillo',
    'naranja': 'Naranjo', 'orange': 'Naranjo', 'naranjo': 'Naranjo',
    'café': 'Café', 'cafe': 'Café', 'marrón': 'Café', 'marron': 'Café', 'brown': 'Café', 'tierra': 'Café',
    'beige': 'Beige', 'champagne': 'Beige', 'crema': 'Beige', 'arena': 'Beige',
    'dorado': 'Dorado', 'gold': 'Dorado', 'golden': 'Dorado', 'ocre': 'Dorado',
    'morado': 'Morado', 'violeta': 'Morado', 'lila': 'Morado', 'purple': 'Morado', 'violet': 'Morado',
};

function resolveColor(raw: string): string | null {
    const normalized = raw.toLowerCase().trim();

    // Exact match (case-insensitive)
    const exact = COLOR_LIST.find((c) => c.toLowerCase() === normalized);
    if (exact) return exact;

    // Synonym map
    if (SYNONYMS[normalized]) return SYNONYMS[normalized];

    // Partial: raw contains a list color (e.g. "color azul marino" → "Azul Marino")
    const partial = COLOR_LIST.slice().sort((a, b) => b.length - a.length)
        .find((c) => normalized.includes(c.toLowerCase()));
    if (partial) return partial;

    return null;
}

export async function detectVehicleColor(coverPhotoDataUrl: string): Promise<string | null> {
    try {
        const [header, base64] = coverPhotoDataUrl.split(',');
        if (!base64) return null;
        const rawMediaType = header?.split(';')[0]?.split(':')[1] ?? 'image/jpeg';
        type SupportedType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
        const supportedTypes: SupportedType[] = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const mediaType: SupportedType = supportedTypes.includes(rawMediaType as SupportedType)
            ? (rawMediaType as SupportedType)
            : 'image/jpeg';

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const result = await model.generateContent({
            contents: [{
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            mimeType: mediaType,
                            data: base64,
                        },
                    },
                    {
                        text: `¿De qué color es el exterior del vehículo? Responde con UNA sola palabra o par de palabras del color. Ejemplos válidos: Negro, Blanco, Blanco Perla, Plata, Gris, Gris Oscuro, Rojo, Burdeos, Azul, Azul Marino, Celeste, Verde, Amarillo, Naranjo, Café, Beige, Dorado, Morado. Si no se puede determinar con certeza, responde: null`,
                    },
                ],
            }],
        });

        const raw = result.response.text().trim();
        if (!raw || raw.toLowerCase() === 'null') return null;

        return resolveColor(raw);
    } catch {
        return null;
    }
}
