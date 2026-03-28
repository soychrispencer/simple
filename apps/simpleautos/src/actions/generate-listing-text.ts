'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { QuickBasicData, GeneratedText } from '@/components/quick-publish/types';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '');

function toTitleCase(s: string): string {
    return s
        .toLowerCase()
        .split(' ')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
        .join(' ');
}

function resolveName(id: string, customValue: string, catalogName?: string): string {
    if (id === '__custom__') return customValue;
    if (catalogName) return catalogName;
    return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildPriceBlock(data: QuickBasicData): string {
    const priceDigits = data.price?.replace(/\D/g, '') ?? '';
    if (!priceDigits) return '';

    const mainPrice = Number(priceDigits);
    const priceFormatted = `$ ${mainPrice.toLocaleString('es-CL')}`;

    let offerLine = '';
    if (data.offerPrice) {
        if (data.offerPriceMode === '%') {
            const pct = parseInt(data.offerPrice, 10);
            if (pct > 0 && pct < 100) {
                const final = Math.round(mainPrice * (1 - pct / 100));
                offerLine = `🏷️ Precio oferta: $ ${final.toLocaleString('es-CL')} (-${pct}%)`;
            }
        } else {
            const offerDigits = data.offerPrice.replace(/\D/g, '');
            const offerNum = Number(offerDigits);
            if (offerNum > 0 && offerNum < mainPrice) {
                const pct = Math.round((1 - offerNum / mainPrice) * 100);
                offerLine = `🏷️ Precio oferta: $ ${offerNum.toLocaleString('es-CL')} (-${pct}%)`;
            }
        }
    }

    const lines = [`💰 Precio: ${priceFormatted}`];
    if (offerLine) lines.push(offerLine);
    if (data.negotiable) lines.push('💸 Precio negociable');
    if (data.financingAvailable) lines.push('🏦 Acepta financiamiento');
    return lines.join('\n');
}

/** Inserts the price block before the last non-empty line (the CTA). */
function injectPriceBlock(description: string, priceBlock: string): string {
    if (!priceBlock) return description;
    const lines = description.trimEnd().split('\n');
    let ctaIdx = lines.length - 1;
    while (ctaIdx > 0 && !lines[ctaIdx]?.trim()) ctaIdx--;
    const before = lines.slice(0, ctaIdx).join('\n').trimEnd();
    const cta = lines[ctaIdx];
    return `${before}\n\n${priceBlock}\n\n${cta}`;
}

function buildFallbackText(brand: string, model: string, data: QuickBasicData, communeName?: string): GeneratedText {
    const typeLabel = data.listingType === 'rent' ? 'en arriendo' : data.listingType === 'auction' ? 'en subasta' : 'en venta';
    const titleParts = [brand, model, data.version, data.year, data.color, data.bodyType].filter(Boolean);
    const titulo = toTitleCase(titleParts.join(' ')).slice(0, 70);
    const kmRaw = data.mileage?.replace(/\D/g, '') ?? '';
    const kmNum = kmRaw ? Number(kmRaw) : null;
    const kmFormatted = kmNum ? kmNum.toLocaleString('es-CL') : '';

    // Build a dynamic hook based on available data
    const yearNum = data.year ? Number(data.year) : null;
    const currentYear = new Date().getFullYear();
    const age = yearNum ? currentYear - yearNum : null;

    let hook: string;
    if (data.listingType === 'rent') {
        hook = `Disponible para arriendo, ideal para uso personal o empresarial. Entrega inmediata y en excelentes condiciones.`;
    } else if (data.listingType === 'auction') {
        hook = `Oportunidad única en subasta. Revisa todos los detalles y participa antes de que se agote el tiempo.`;
    } else if (data.condition === 'Nuevo') {
        hook = `Vehículo 0 km, sin uso y con todos sus accesorios de fábrica. Aprovecha esta oportunidad antes de que se vaya.`;
    } else if (data.condition === 'Seminuevo' || (age !== null && age <= 3)) {
        hook = `${data.condition === 'Seminuevo' ? 'Seminuevo' : 'Poco uso'}, en excelente estado${kmNum && kmNum < 50000 ? ' y con bajo kilometraje' : ''}. Ideal para quien busca calidad sin pagar precio de cero.`;
    } else if (data.ownerCount === '1° dueño') {
        hook = `Único dueño, mantenido al día y en muy buen estado. Un auto cuidado que se nota desde el primer vistazo.`;
    } else if (kmNum && kmNum < 80000) {
        hook = `Con solo ${kmFormatted} km recorridos, este vehículo tiene mucha vida por delante. Revisado y listo para el traspaso.`;
    } else {
        hook = `Vehículo en buen estado, revisado y listo para transferir. Ideal para quien busca confianza a buen precio.`;
    }

    const ficha = [
        data.version ? `🚙 Versión: ${data.version}` : null,
        data.bodyType ? `🏎️ Carrocería: ${data.bodyType}` : null,
        kmFormatted ? `🛣️ Kilometraje: ${kmFormatted} km` : null,
        data.transmission ? `⚙️ Transmisión: ${data.transmission}` : null,
        data.fuelType ? `⛽ Combustible: ${data.fuelType}` : null,
        data.condition ? `🔧 Estado: ${data.condition}` : null,
        data.ownerCount ? `👤 N° dueños: ${data.ownerCount}` : null,
        communeName ? `📍 Ubicación: ${communeName}` : null,
    ].filter(Boolean).join('\n');

    const cta = '¡Consulta sin compromiso en SimpleAutos, te respondemos de inmediato! 📲';
    const vehicleEmoji =
        data.vehicleType === 'motorcycle' ? '🏍️' :
        data.vehicleType === 'truck' ? '🚛' :
        data.vehicleType === 'bus' ? '🚌' :
        data.vehicleType === 'nautical' ? '⛵' :
        data.vehicleType === 'aerial' ? '✈️' :
        data.vehicleType === 'machinery' ? '🚜' : '🚗';
    const body = `${vehicleEmoji} ${brand} ${model}${data.year ? ` ${data.year}` : ''} – ¡${data.listingType === 'auction' ? 'Participa en la subasta' : `Gran oportunidad ${typeLabel}`}!\n\n${hook}\n\n${ficha}\n\n${cta}`;
    const priceBlock = buildPriceBlock(data);
    const descripcion = injectPriceBlock(body, priceBlock).slice(0, 1000);
    return { titulo, descripcion };
}

export async function generateListingText(
    data: QuickBasicData,
    coverPhotoDataUrl?: string,
    options?: { communeName?: string },
): Promise<GeneratedText> {
    const brand = resolveName(data.brandId, data.customBrand, data.brandName);
    const model = resolveName(data.modelId, data.customModel, data.modelName);
    const typeLabel = data.listingType === 'rent' ? 'arriendo' : data.listingType === 'auction' ? 'subasta' : 'venta';
    const detectColor = coverPhotoDataUrl && !data.color;
    const communeName = options?.communeName;

    const kmFormatted = data.mileage
        ? Number(data.mileage.replace(/\D/g, '') || '0').toLocaleString('es-CL')
        : null;

    // Price block is injected in code — not delegated to the AI
    const priceBlock = buildPriceBlock(data);

    const specs = [
        `- Marca: ${brand}`,
        `- Modelo: ${model}`,
        `- Año: ${data.year}`,
        data.version ? `- Versión: ${data.version}` : null,
        data.color ? `- Color: ${data.color}` : null,
        data.bodyType ? `- Carrocería: ${data.bodyType}` : null,
        kmFormatted ? `- Kilometraje: ${kmFormatted} km` : null,
        data.transmission ? `- Transmisión: ${data.transmission}` : null,
        data.fuelType ? `- Combustible: ${data.fuelType}` : null,
        data.condition ? `- Estado: ${data.condition}` : null,
        data.traction ? `- Tracción: ${data.traction}` : null,
        data.ownerCount ? `- N° de dueños: ${data.ownerCount}` : null,
        communeName ? `- Ubicación: ${communeName}` : null,
    ].filter(Boolean).join('\n');

    const colorRule = detectColor
        ? '\n- "colorDetectado": color exterior del vehículo en la imagen (una o dos palabras, ej: "Negro", "Blanco Perla"). Omite si no puedes identificarlo con certeza.'
        : '';

    const prompt = `Eres un experto en venta de vehículos en Chile. Genera un título y descripción para este anuncio de ${typeLabel}.

DATOS DEL VEHÍCULO:
${specs}

REGLAS TÍTULO (máx 70 caracteres):
- Formato Title Case
- Incluir en orden: marca, modelo, versión (si hay), año, color (si hay), carrocería (si hay)
- Sin guiones ni símbolos especiales, solo espacios
- Si supera 70 caracteres, omite primero carrocería, luego color

REGLAS DESCRIPCIÓN (entre 400 y 700 caracteres):
Usa el siguiente formato con saltos de línea reales (\\n):

Línea 1 — TITULAR: emoji + "Marca Modelo [Versión] Año [Color]" + guión + slogan corto + 1-2 emojis.

Línea vacía

GANCHO: 1-2 oraciones sobre el atractivo del vehículo. Tono cercano, estilo vendedor chileno profesional.

Línea vacía

FICHA TÉCNICA con emojis, un dato por línea, SOLO los datos disponibles (omitir los que no estén):
📅 Año: [año]
🎨 Color: [color]
🚙 Versión: [versión]
🏎️ Carrocería: [carrocería]
🛣️ Kilometraje: [km]
⚙️ Transmisión: [transmisión]
⛽ Combustible: [combustible]
🔧 Estado: [estado]
👤 N° dueños: [dueños]
🔄 Tracción: [tracción]
📍 Ubicación: [comuna]

Línea vacía

ÚLTIMA LÍNEA — CTA directa y breve que incluya "SimpleAutos". Ej: "¡Contáctanos por SimpleAutos y agenda tu prueba de manejo hoy! 📲"

Reglas adicionales:
- Sin hashtags, asteriscos ni sección de precio (el precio se agrega por separado)
- Adaptar tono y emojis al tipo de vehículo
- Si es arriendo, adaptar el CTA a "reserva en SimpleAutos"
- Si es subasta, incluir urgencia en el CTA

Responde ÚNICAMENTE con JSON válido sin markdown:
{"titulo": "...", "descripcion": "..."${colorRule ? ', "colorDetectado": "..."' : ''}}`;

    try {
        const gemini = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' },
        });

        type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
        const parts: Part[] = [];

        if (detectColor && coverPhotoDataUrl) {
            const [header, base64] = coverPhotoDataUrl.split(',');
            const mimeType = header?.split(';')[0]?.split(':')[1] ?? 'image/webp';
            parts.push({ inlineData: { mimeType, data: base64 ?? '' } });
        }

        parts.push({ text: prompt });

        const result = await gemini.generateContent({ contents: [{ role: 'user', parts }] });
        const text = result.response.text().trim();
        const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        const parsed = JSON.parse(clean) as GeneratedText;

        if (typeof parsed.titulo === 'string' && typeof parsed.descripcion === 'string') {
            const descripcion = injectPriceBlock(parsed.descripcion.slice(0, 900), priceBlock);
            return {
                titulo: parsed.titulo.slice(0, 70),
                descripcion,
                colorDetectado: typeof parsed.colorDetectado === 'string' ? parsed.colorDetectado : undefined,
            };
        }
        return buildFallbackText(brand, model, data, communeName);
    } catch {
        return buildFallbackText(brand, model, data, communeName);
    }
}
