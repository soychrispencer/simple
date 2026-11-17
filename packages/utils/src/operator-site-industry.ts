export type OperatorSiteIndustry = 'health' | 'beauty' | 'fitness' | 'education' | 'pets' | 'services';

export type OperatorSiteIndustryGuide = {
    id: OperatorSiteIndustry;
    label: string;
    contentDirection: string;
    services: { label: string; title: string; lead: string };
};

const INDUSTRY_GUIDES: Record<OperatorSiteIndustry, OperatorSiteIndustryGuide> = {
    health: {
        id: 'health',
        label: 'Salud y bienestar',
        contentDirection: 'Explica con claridad el tipo de atención, la primera consulta o evaluación, los seguimientos y la modalidad disponible. Mantén un tono cuidadoso; no prometas resultados ni agregues afirmaciones clínicas.',
        services: { label: 'Atenciones', title: 'Elige tu atención', lead: 'Revisa las modalidades y duraciones disponibles antes de reservar.' },
    },
    beauty: {
        id: 'beauty',
        label: 'Belleza y cuidado personal',
        contentDirection: 'Describe los tratamientos y servicios concretos del catálogo, su duración y para quién podrían ser relevantes. Habla de estilo y experiencia sin prometer resultados estéticos ni inventar promociones.',
        services: { label: 'Tratamientos y servicios', title: 'Encuentra tu próximo servicio', lead: 'Explora las opciones disponibles, revisa sus detalles y elige una hora.' },
    },
    fitness: {
        id: 'fitness',
        label: 'Deporte y entrenamiento',
        contentDirection: 'Ayuda a distinguir evaluaciones, sesiones y seguimientos según los servicios reales. Enfócate en cómo reservar y en la modalidad disponible; no prometas cambios físicos ni resultados deportivos.',
        services: { label: 'Entrenamiento', title: 'Elige tu sesión', lead: 'Revisa las opciones de entrenamiento y reserva el horario que te acomode.' },
    },
    education: {
        id: 'education',
        label: 'Clases y aprendizaje',
        contentDirection: 'Explica qué tipo de clase o sesión se ofrece, a quién va dirigida solo si el perfil lo indica y cómo reservar. No inventes niveles, certificaciones, materiales ni resultados académicos.',
        services: { label: 'Clases', title: 'Clases y sesiones', lead: 'Conoce las sesiones disponibles y reserva una hora para comenzar.' },
    },
    pets: {
        id: 'pets',
        label: 'Servicios para mascotas',
        contentDirection: 'Presenta cada servicio de forma práctica y amable, usando solo los animales y prestaciones que aparecen en los datos. No inventes protocolos veterinarios, resultados ni garantías de cuidado.',
        services: { label: 'Servicios para mascotas', title: 'Elige un servicio', lead: 'Revisa los servicios disponibles y agenda una hora para tu mascota.' },
    },
    services: {
        id: 'services',
        label: 'Servicios profesionales',
        contentDirection: 'Explica qué problema o necesidad atiende cada servicio solo a partir de los datos entregados, qué puede elegir la persona y cómo reservar. No inventes credenciales, procesos ni resultados.',
        services: { label: 'Servicios', title: 'Qué ofrezco', lead: 'Conoce los servicios disponibles y reserva en línea en pocos pasos.' },
    },
};

function normalizeIndustryText(value: string | null | undefined): string {
    return (value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/** Clasifica la actividad del perfil para adaptar el contenido sin pedir el rubro dos veces. */
export function resolveOperatorSiteIndustry(value: string | null | undefined): OperatorSiteIndustryGuide {
    const activity = normalizeIndustryText(value);
    const specialized = (
        base: OperatorSiteIndustryGuide,
        label: string,
        contentDirection: string,
        services: OperatorSiteIndustryGuide['services'],
    ): OperatorSiteIndustryGuide => ({ ...base, label, contentDirection, services });

    if (/veter|mascot|perro|canin|felin|peluqueria animal/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.pets,
            /veter/.test(activity) ? 'Veterinaria' : /peluqueria|canin/.test(activity) ? 'Peluquería de mascotas' : 'Servicios para mascotas',
            INDUSTRY_GUIDES.pets.contentDirection,
            { label: 'Servicios', title: 'Atención para tu mascota', lead: 'Revisa cada servicio y reserva una hora para tu mascota.' },
        );
    }
    if (/kinesi|fisio|rehabilit/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.health,
            'Kinesiología y rehabilitación',
            'Presenta primero la evaluación y luego los servicios de seguimiento que aparezcan en el catálogo. Describe la atención y modalidad con precisión; no prometas recuperación ni resultados clínicos.',
            { label: 'Atenciones kinésicas', title: 'Elige tu atención', lead: 'Revisa evaluaciones y sesiones disponibles antes de reservar.' },
        );
    }
    if (/nutri/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.health,
            'Nutrición',
            'Distingue evaluación inicial, controles y modalidad según los servicios confirmados. Mantén un lenguaje respetuoso y realista; no prometas cambios de peso, diagnósticos ni resultados de salud.',
            { label: 'Consultas nutricionales', title: 'Elige tu consulta', lead: 'Compara las consultas y controles disponibles y reserva tu hora.' },
        );
    }
    if (/terapia ocupacional|terapeuta ocupacional/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.health,
            'Terapia ocupacional',
            'Explica el tipo de atención y los servicios confirmados sin atribuir diagnósticos, resultados clínicos ni enfoques que no estén en el perfil.',
            { label: 'Atenciones', title: 'Elige tu atención', lead: 'Revisa los servicios disponibles y reserva una hora.' },
        );
    }
    if (/spa|masaj|masoterap/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.beauty,
            'Spa y masajes',
            'Describe las sesiones y tratamientos que aparecen en el perfil, y permite compararlos por duración, modalidad y valor si esos datos existen. Evita prometer beneficios terapéuticos.',
            { label: 'Sesiones y tratamientos', title: 'Elige una sesión', lead: 'Revisa las opciones disponibles y reserva el horario que te acomode.' },
        );
    }
    if (/psic|psicoter|terap/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.health,
            'Psicología y terapia',
            'Explica el tipo de sesión, la modalidad y las alternativas que aparecen en el perfil. Usa un tono sereno y acogedor, sin prometer resultados ni atribuir credenciales o enfoques que no se hayan indicado.',
            { label: 'Sesiones', title: 'Elige tu tipo de sesión', lead: 'Revisa las modalidades y duraciones disponibles para reservar.' },
        );
    }
    if (/dent|odont/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.health,
            'Odontología',
            'Explica las prestaciones odontológicas únicamente como están nombradas en el catálogo, mostrando duración y modalidad cuando existan. No añadas afirmaciones clínicas ni resultados.',
            { label: 'Atenciones odontológicas', title: 'Elige tu atención', lead: 'Revisa las atenciones disponibles y selecciona una hora.' },
        );
    }
    if (/barber/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.beauty,
            'Barbería',
            'Describe cortes, barba y combinaciones solo si esos servicios aparecen en el catálogo. Destaca duración, valor y reserva fácil; no inventes equipo, estilos, promociones ni resultados.',
            { label: 'Servicios de barbería', title: 'Elige tu próximo corte', lead: 'Revisa cortes y servicios disponibles antes de reservar.' },
        );
    }
    if (/manicur|unas/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.beauty,
            'Uñas y manicure',
            'Presenta cada servicio de uñas tal como aparece en el catálogo, con duración y valor cuando estén disponibles. No inventes técnicas, materiales, diseños ni promociones.',
            { label: 'Servicios de uñas', title: 'Encuentra tu próximo servicio', lead: 'Explora los servicios disponibles y elige una hora.' },
        );
    }
    if (/estet|belleza/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.beauty,
            'Estética y belleza',
            INDUSTRY_GUIDES.beauty.contentDirection,
            { label: 'Tratamientos', title: 'Encuentra tu próximo tratamiento', lead: 'Revisa los detalles de cada tratamiento y reserva una hora.' },
        );
    }
    if (/peluquer|estilista/.test(activity)) {
        return specialized(
            INDUSTRY_GUIDES.beauty,
            'Peluquería',
            INDUSTRY_GUIDES.beauty.contentDirection,
            { label: 'Servicios de peluquería', title: 'Elige tu próximo servicio', lead: 'Explora los servicios disponibles y revisa su duración antes de reservar.' },
        );
    }
    if (/tatuaj/.test(activity)) {
        return specialized(INDUSTRY_GUIDES.beauty, 'Tatuajes', 'Explica qué tipo de cita se puede reservar con la información confirmada. No inventes estilos, portafolio, materiales ni el resultado final del tatuaje.', {
            label: 'Citas', title: 'Agenda una cita', lead: 'Revisa las opciones disponibles y coordina tu próxima visita.' } );
    }
    if (/entren|fitness|deport|personal trainer|acondicionamiento|pilates|yoga|crossfit|calistenia/.test(activity)) return INDUSTRY_GUIDES.fitness;
    if (/profesor|academ|clase|docen|tutor|educa|idioma|musica|instrument/.test(activity)) return INDUSTRY_GUIDES.education;
    if (/medic|fono|enferm|matron|podolog|clinica|salud|doctor/.test(activity)) return INDUSTRY_GUIDES.health;
    return INDUSTRY_GUIDES.services;
}
