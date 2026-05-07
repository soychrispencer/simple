import type { Metadata } from 'next';
import { getSerenatasSiteOrigin } from '@/lib/site-origin';

export type MariachiComunaConfig = {
    /** Segmento URL: mariachis-{pathSegment} */
    pathSegment: string;
    /** Nombre visible (con tildes) */
    comunName: string;
    metaTitle: string;
    metaDescription: string;
    /** Párrafo principal único (HTML evitado; texto plano) */
    heroLead: string;
    /** bullets o frases locales */
    localHighlights: string[];
};

const PRICE_FROM = '$50.000';

export const MARIACHIS_COMUNAS: MariachiComunaConfig[] = [
    {
        pathSegment: 'providencia',
        comunName: 'Providencia',
        metaTitle: 'Mariachis en Providencia a domicilio | SimpleSerenatas',
        metaDescription:
            'Contrata mariachis en Providencia, Santiago. Precios desde $50.000, coordinadores verificados y solicitud online. Ideal para cumpleaños y aniversarios.',
        heroLead:
            'En Providencia las serenatas suelen pedir horarios claros por el tráfico de Av. Providencia y el borde barrio-lastarria. Coordinamos llegada puntual al edificio o casa.',
        localHighlights: [
            'Nodos frecuentes: Barrio Italia, Plaza Italia y calles perpendiculares a Av. Providencia.',
            'Edificios con conserjería: dejamos el plan de llegada definido antes del día.',
            'Versión sobria o fiesta según condominio vecinos cercanos.',
        ],
    },
    {
        pathSegment: 'las-condes',
        comunName: 'Las Condes',
        metaTitle: 'Mariachis en Las Condes a domicilio | SimpleSerenatas',
        metaDescription:
            'Mariachis para serenatas en Las Condes. Desde $50.000 en Santiago Oriente: Oficinas, casas en condominios y zonas tranquilas para sorpresa sin líos.',
        heroLead:
            'Las Condes mezcla torres corporativas, condominios cerrados y calles muy transitadas por la mañana. Ajustamos ruta desde Manquehue hasta El Golf según cortes de calle.',
        localHighlights: [
            'Accesos típicos: Manquehue, Apoquindo y sector El Golf.',
            'Condominios: coordinamos entrada con seguridad antes de llegar el grupo.',
            'Horarios de mediodía a veces con más congestión salida desde oficinas.',
        ],
    },
    {
        pathSegment: 'maipu',
        comunName: 'Maipú',
        metaTitle: 'Mariachis en Maipú a domicilio | SimpleSerenatas',
        metaDescription:
            'Mariachis en Maipú y plazas cercanas desde $50.000. Solicita fecha comuna y dirección: serenatas familiares o barrio con buen acceso vehicular.',
        heroLead:
            'Maipú es amplio; la clave es la microzona (Plaza de Maipú, Viscount, Ciudad Satellite). Definimos punto de encuentro para no perder tiempo en calles menos conocidas.',
        localHighlights: [
            'Ranchos y patios amplios: buen punto para amplificar sin molestar tanto al vecino si se avisa bien.',
            'Franja tarde puede cruzarse con Pico en Vespucio cercano.',
            'Ideal para ceremonias cortas antes de pastel o segundo evento mismo día.',
        ],
    },
    {
        pathSegment: 'la-florida',
        comunName: 'La Florida',
        metaTitle: 'Mariachis en La Florida a domicilio | SimpleSerenatas',
        metaDescription:
            'Serenatas con mariachis en La Florida, RM. Coordinación orientada a población y casa con patios. Tarifas desde $50.000 y solicitud en minutos.',
        heroLead:
            'La Florida combina villa y barrios con buena red de intersecciones Américo Vespucio. Agendamos buffer en horas punta y referencia de portón o pasaje angosto.',
        localHighlights: [
            'Muchas calles con estacionamiento limitado: conviene indicar dónde descarga el grupo.',
            'Vecinos en poblaciones: acordamos volumen y duración al contratar.',
            'Fin de semana hay más eventos familiares el mismo día en la misma cuadra.',
        ],
    },
    {
        pathSegment: 'nunoa',
        comunName: 'Ñuñoa',
        metaTitle: 'Mariachis en Ñuñoa a domicilio | SimpleSerenatas',
        metaDescription:
            'Mariachis en Ñuñoa para cumpleaños y aniversarios. Desde $50.000: barrio plano y tradiciones de patio. Pide tu serenata con coordinador en la RM.',
        heroLead:
            'Ñuñoa es denso y residencial; Irarrázaval y Grecia concentran edificios y casas antiguas. Priorizamos referencia de esquina y si la serenata es en cité o pasaje.',
        localHighlights: [
            'Plazas y barrios con calles estrechas: llegada a pie desde estacionamiento cercano si hace falta.',
            'Mezcla de departamentos y casas: el brief del edificio evita trabas con administración.',
            'Vecindario acostumbrado a serenatas: timing vocal y repertorio se alinean con la ocasión.',
        ],
    },
];

export const MARIACHIS_BY_PATH = new Map(MARIACHIS_COMUNAS.map((c) => [c.pathSegment, c]));

export function buildComunaPageMetadata(cfg: MariachiComunaConfig): Metadata {
    const base = getSerenatasSiteOrigin();
    const canonicalPath = `/mariachis-${cfg.pathSegment}`;

    return {
        title: cfg.metaTitle,
        description: cfg.metaDescription,
        alternates: { canonical: canonicalPath },
        openGraph: {
            title: cfg.metaTitle,
            description: cfg.metaDescription,
            url: `${base}${canonicalPath}`,
            siteName: 'SimpleSerenatas',
            locale: 'es_CL',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: cfg.metaTitle,
            description: cfg.metaDescription,
        },
    };
}

export function buildLocalBusinessJsonLd(cfg: MariachiComunaConfig): Record<string, unknown> {
    const base = getSerenatasSiteOrigin();
    const url = `${base}/mariachis-${cfg.pathSegment}`;

    return {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: `SimpleSerenatas — Mariachis y serenatas en ${cfg.comunName}`,
        description: cfg.metaDescription,
        url,
        priceRange: PRICE_FROM,
        areaServed: {
            '@type': 'AdministrativeArea',
            name: cfg.comunName,
            containedInPlace: {
                '@type': 'City',
                name: 'Santiago',
                containedInPlace: {
                    '@type': 'AdministrativeArea',
                    name: 'Región Metropolitana',
                },
            },
        },
        address: {
            '@type': 'PostalAddress',
            addressLocality: cfg.comunName,
            addressRegion: 'RM',
            addressCountry: 'CL',
        },
    };
}
