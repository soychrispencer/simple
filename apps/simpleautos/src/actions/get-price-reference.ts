'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '');

export interface PriceReferenceResult {
    minPrice: number;
    estimatedPrice: number;
    maxPrice: number;
    confidenceScore: number;
    comparablesUsed: number;
    currency: string;
}

export async function getPriceReference(input: {
    brand: string;
    model: string;
    year: number;
    vehicleType: string;
    mileageKm?: number | null;
    operationType?: 'sale' | 'rent';
}): Promise<PriceReferenceResult | null> {
    try {
        const opLabel = input.operationType === 'rent' ? 'arriendo' : 'venta';
        const kmLabel = input.mileageKm
            ? ` con ${input.mileageKm.toLocaleString('es-CL')} km`
            : '';

        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            tools: [{ googleSearch: {} }] as never,
        });

        const prompt = `Busca precios reales actuales de ${input.brand} ${input.model} ${input.year}${kmLabel} en portales de ${opLabel} de vehículos en Chile (Chileautos, Mercado Libre Chile, AutoValores, Yapo). Analiza los precios encontrados en pesos chilenos (CLP).

Responde ÚNICAMENTE con JSON válido sin markdown ni explicación:
{"minPrice": <mínimo CLP>, "estimatedPrice": <promedio CLP>, "maxPrice": <máximo CLP>, "confidenceScore": <0-100>, "comparablesUsed": <cantidad de anuncios encontrados>}`;

        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const text = result.response.text().trim();
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]) as {
            minPrice: unknown;
            estimatedPrice: unknown;
            maxPrice: unknown;
            confidenceScore: unknown;
            comparablesUsed: unknown;
        };

        const min = Number(parsed.minPrice);
        const est = Number(parsed.estimatedPrice);
        const max = Number(parsed.maxPrice);

        if (!isFinite(min) || !isFinite(est) || !isFinite(max) || est <= 0) return null;

        return {
            minPrice: Math.round(min),
            estimatedPrice: Math.round(est),
            maxPrice: Math.round(max),
            confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 70)),
            comparablesUsed: Math.max(0, Number(parsed.comparablesUsed) || 0),
            currency: 'CLP',
        };
    } catch {
        return null;
    }
}
