'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? '');

export type GeneratePoliciesInput = {
    profession?: string;
    displayName?: string;
    cancellationHours?: number;
    bookingWindowDays?: number;
    existingText?: string;
};

const FALLBACK_POLICIES = `POLÍTICAS Y CONDICIONES

1. Reserva y confirmación
Las reservas quedan agendadas al completar el formulario. Recibirás una confirmación por correo o WhatsApp con los datos de la sesión.

2. Puntualidad
Te pedimos llegar (o conectarte) cinco minutos antes. Si llegas tarde, la sesión terminará a la hora pactada para no afectar a otros pacientes.

3. Cancelaciones y reagendamientos
Puedes cancelar o reagendar hasta 24 horas antes del inicio sin costo. Cancelaciones con menos tiempo pueden considerarse como sesión realizada.

4. Confidencialidad
Todo lo conversado en la sesión es estrictamente confidencial, salvo las excepciones establecidas por la ley (riesgo vital, maltrato infantil u orden judicial).

5. Forma de pago
El pago se realiza antes o al momento de la sesión, según la modalidad acordada. Se emite comprobante al finalizar.

Al reservar aceptas estas condiciones.`;

export async function generatePolicies(input: GeneratePoliciesInput): Promise<{ ok: boolean; text: string; error?: string }> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
        return { ok: true, text: FALLBACK_POLICIES };
    }

    const profession = input.profession?.trim() || 'Profesional de la salud mental';
    const name = input.displayName?.trim() || '';
    const cancellationHours = input.cancellationHours ?? 24;

    const prompt = `Eres un asistente experto en redacción de políticas y condiciones para profesionales de la salud mental en Chile.

Genera un texto de "Políticas y condiciones" claro, cercano y profesional que el paciente deba leer y aceptar antes de reservar una sesión.

DATOS DEL PROFESIONAL:
- Profesión: ${profession}${name ? `\n- Nombre: ${name}` : ''}
- Tiempo mínimo para cancelar sin costo: ${cancellationHours} horas antes

REGLAS:
- Extensión: entre 250 y 500 palabras
- Estructura en secciones numeradas con título breve y 1-2 oraciones cada una
- Incluye al menos estas secciones: Reserva y confirmación, Puntualidad, Cancelaciones y reagendamientos, Confidencialidad (con las excepciones legales chilenas), Forma de pago
- Usa "tú" para dirigirte al paciente (tono cercano pero profesional)
- Cierra con una frase que diga que al reservar acepta estas condiciones
- No uses asteriscos, markdown ni emojis
- No inventes cifras o datos específicos que no estén en los datos entregados
- Responde ÚNICAMENTE con el texto de las políticas, sin preámbulo ni explicaciones

${input.existingText ? `TEXTO ACTUAL DEL PROFESIONAL (úsalo como referencia del tono si existe):\n${input.existingText}\n\n` : ''}Genera las políticas ahora:`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();
        if (!text) return { ok: true, text: FALLBACK_POLICIES };
        return { ok: true, text };
    } catch (error) {
        console.error('[generatePolicies] error', error);
        return { ok: true, text: FALLBACK_POLICIES };
    }
}
