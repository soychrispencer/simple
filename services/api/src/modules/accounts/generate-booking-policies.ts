import { GoogleGenerativeAI } from '@google/generative-ai';

export type GenerateBookingPoliciesInput = {
    vertical?: 'agenda' | 'serenatas' | 'autos' | 'propiedades';
    profession?: string;
    displayName?: string;
    businessName?: string;
    clientLabel?: string;
    cancellationHours?: number;
    bookingWindowDays?: number;
    existingText?: string;
};

const FALLBACK_POLICIES = `POLÍTICAS Y CONDICIONES

1. Reserva y confirmación
Las reservas quedan registradas al completar el formulario. Recibirás una confirmación con los datos acordados.

2. Puntualidad
Te pedimos llegar (o conectarte) cinco minutos antes. Si llegas tarde, el servicio terminará a la hora pactada.

3. Cancelaciones y reagendamientos
Puedes cancelar o reagendar hasta 24 horas antes del inicio sin costo. Cancelaciones con menos tiempo pueden considerarse como servicio realizado.

4. Forma de pago
El pago se realiza según la modalidad acordada al reservar o contratar.

Al reservar o contratar aceptas estas condiciones.`;

function verticalContext(vertical?: GenerateBookingPoliciesInput['vertical']) {
    switch (vertical) {
        case 'serenatas':
            return 'un servicio de serenatas / mariachi en Chile';
        case 'autos':
            return 'un negocio de venta o arriendo de vehículos en Chile';
        case 'propiedades':
            return 'un negocio inmobiliario en Chile';
        case 'agenda':
        default:
            return 'un profesional de servicios con reserva online en Chile';
    }
}

export async function generateBookingPoliciesText(
    input: GenerateBookingPoliciesInput,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
        return { ok: true, text: FALLBACK_POLICIES };
    }

    const clientLabel = input.clientLabel?.trim() || 'cliente';
    const businessLabel = input.businessName?.trim() || input.displayName?.trim() || 'el negocio';
    const profession = input.profession?.trim() || verticalContext(input.vertical);
    const cancellationHours = input.cancellationHours ?? 24;
    const bookingWindowDays = input.bookingWindowDays ?? 30;

    const prompt = `Eres un asistente experto en redacción de políticas y condiciones comerciales en Chile.

Genera un texto de "Políticas y condiciones" claro, cercano y profesional que el ${clientLabel} deba leer y aceptar antes de reservar o contratar.

CONTEXTO:
- Tipo de negocio: ${profession}
- Nombre visible: ${businessLabel}
- Ventana de reserva: hasta ${bookingWindowDays} días de anticipación
- Tiempo mínimo para cancelar sin costo: ${cancellationHours} horas antes

REGLAS:
- Extensión: entre 200 y 450 palabras
- Estructura en secciones numeradas con título breve y 1-2 oraciones cada una
- Incluye al menos: Reserva y confirmación, Puntualidad o coordinación, Cancelaciones y reagendamientos, Forma de pago
- Usa "tú" para dirigirte al ${clientLabel}
- Cierra indicando que al reservar o contratar acepta estas condiciones
- No uses asteriscos, markdown ni emojis
- Responde ÚNICAMENTE con el texto de las políticas

${input.existingText ? `TEXTO ACTUAL (referencia de tono):\n${input.existingText}\n\n` : ''}Genera las políticas ahora:`;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        if (!text) return { ok: true, text: FALLBACK_POLICIES };
        return { ok: true, text };
    } catch (error) {
        console.error('[generate-booking-policies] error', error);
        return { ok: true, text: FALLBACK_POLICIES };
    }
}
