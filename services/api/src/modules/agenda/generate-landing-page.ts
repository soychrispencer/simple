import { z } from 'zod';
import { generateGeminiText } from '../../lib/gemini.js';
import type {
    OperatorSiteLandingBrief,
    OperatorSiteLandingContent,
} from '@simple/utils';
import { resolveOperatorSiteIndustry } from '@simple/utils';

const landingContentSchema = z.object({
    heroHeadline: z.string().trim().min(8).max(90),
    heroSubheadline: z.string().trim().min(12).max(180),
    aboutTitle: z.string().trim().min(4).max(80),
    aboutText: z.string().trim().min(60).max(900),
    highlightsTitle: z.string().trim().min(4).max(80),
    highlights: z.array(z.object({
        title: z.string().trim().min(3).max(48),
        description: z.string().trim().min(12).max(150),
    })).min(2).max(3),
    seoTitle: z.string().trim().min(8).max(65),
    seoDescription: z.string().trim().min(35).max(170),
});

const landingContentResponseSchema = {
    type: 'OBJECT',
    properties: {
        heroHeadline: { type: 'STRING' },
        heroSubheadline: { type: 'STRING' },
        aboutTitle: { type: 'STRING' },
        aboutText: { type: 'STRING' },
        highlightsTitle: { type: 'STRING' },
        highlights: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    title: { type: 'STRING' },
                    description: { type: 'STRING' },
                },
                required: ['title', 'description'],
            },
        },
        seoTitle: { type: 'STRING' },
        seoDescription: { type: 'STRING' },
    },
    required: [
        'heroHeadline',
        'heroSubheadline',
        'aboutTitle',
        'aboutText',
        'highlightsTitle',
        'highlights',
        'seoTitle',
        'seoDescription',
    ],
};

export type LandingPageGenerationInput = {
    displayName: string;
    profession: string;
    existingHeadline?: string | null;
    existingBio?: string | null;
    city?: string | null;
    servesOnline?: boolean;
    servesPresential?: boolean;
    services: Array<{ name: string; description?: string | null }>;
    brief: OperatorSiteLandingBrief;
};

function clean(value: string | null | undefined, max = 500): string {
    return (value ?? '').replace(/[<>]/g, '').trim().slice(0, max);
}

export async function generateAgendaLandingPageContent(
    input: LandingPageGenerationInput,
): Promise<{ ok: true; content: OperatorSiteLandingContent } | { ok: false; error: string }> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
        return { ok: false, error: 'La generación con IA no está configurada en este entorno.' };
    }

    const factualContext = {
        nombre: clean(input.displayName, 120),
        actividad: clean(input.profession, 120),
        titularActual: clean(input.existingHeadline, 180) || null,
        presentacionActual: clean(input.existingBio, 900) || null,
        ciudad: clean(input.city, 100) || null,
        modalidad: [input.servesOnline ? 'online' : null, input.servesPresential ? 'presencial' : null].filter(Boolean),
        servicios: input.services.slice(0, 20).map((service) => ({
            nombre: clean(service.name, 120),
            descripcion: clean(service.description, 300) || null,
        })),
        publico: clean(input.brief.audience, 500) || null,
        diferenciales: clean(input.brief.differentiators, 700) || null,
        experienciaOCredenciales: clean(input.brief.credentials, 500) || null,
        tono: input.brief.tone,
    };
    const industry = resolveOperatorSiteIndustry(input.profession);

    const prompt = `Eres director de contenido UX para páginas de reserva de profesionales en Chile.
Redacta el contenido de una página moderna, clara, específica y orientada a que la persona entienda el servicio y reserve.

RUBRO DETECTADO: ${industry.label}
ENFOQUE PARA ESTE RUBRO: ${industry.contentDirection}

DATOS CONFIRMADOS (la fuente de verdad):
${JSON.stringify(factualContext, null, 2)}

REGLAS ESTRICTAS:
- Responde solamente un objeto JSON válido con estas claves: heroHeadline, heroSubheadline, aboutTitle, aboutText, highlightsTitle, highlights, seoTitle, seoDescription.
- Escribe en español chileno natural, con el tono indicado. Evita frases genéricas, superlativos y exceso de signos.
- No inventes títulos, certificaciones, años de experiencia, resultados, testimonios, precios, disponibilidad, servicios ni datos de contacto.
- Usa las credenciales solo si el usuario las proporcionó. Si están vacías, no sugieras que existan.
- No hagas promesas clínicas, legales ni resultados garantizados.
- El titular principal debe ser breve y describir el valor real del servicio. La bajada debe explicar qué puede hacer la persona.
- Adapta títulos, vocabulario y puntos clave al rubro detectado y a los servicios reales; evita una plantilla de texto intercambiable entre profesiones.
- Si no se indicó público objetivo o diferenciadores, redacta usando únicamente actividad, servicios, modalidad y ubicación confirmados.
- aboutText debe tener entre 70 y 150 palabras; presenta enfoque y experiencia usando solo hechos confirmados. Si faltan hechos, describe la forma de atención sin afirmaciones no respaldadas.
- Genera 2 o 3 highlights concisos. Basa cada uno en los diferenciales, servicios, modalidad o ciudad disponibles; no agregues beneficios no confirmados.
- Escribe un título propio y específico para esos highlights; no uses frases genéricas como "Una atención pensada para ti".
- SEO: título de hasta 65 caracteres y descripción de hasta 170.
- No incluyas HTML, Markdown, emojis ni etiquetas de precio.

Genera el JSON ahora.`;

    try {
        const raw = await generateGeminiText(prompt, apiKey, { responseSchema: landingContentResponseSchema });
        const content = landingContentSchema.parse(JSON.parse(raw));
        return { ok: true, content };
    } catch (error) {
        console.error('[agenda-landing-generation] generation failed', error instanceof Error ? error.message : 'unknown error');
        return { ok: false, error: 'No pudimos generar la página ahora. Revisa tus datos e inténtalo nuevamente.' };
    }
}
