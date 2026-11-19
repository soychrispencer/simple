import type {
    AgendaOperatorSiteProfile,
    OperatorSiteCatalog,
    OperatorSiteSchedule,
} from '@simple/ui/operator-site';
import type { OperatorSiteColorMode, OperatorSiteLayout } from '@simple/utils';

export type IndustrySiteDemo = {
    id: string;
    label: string;
    detail: string;
    showcase: {
        headline: string;
        description: string;
        highlights: string[];
    };
    slug: string;
    initials: string;
    professional: string;
    profession: string;
    businessLabel: string;
    profile: AgendaOperatorSiteProfile;
    catalog: Omit<OperatorSiteCatalog, 'services'> & {
        services: Array<OperatorSiteCatalog['services'][number] & { category: string }>;
    };
    schedule: OperatorSiteSchedule;
    appearance: {
        layout: OperatorSiteLayout;
        colorMode: OperatorSiteColorMode;
        accentColor: string;
    };
    coverPosition: {
        mobile: string;
        desktop: string;
    };
};

const weeklySchedule = (days: number[], startTime: string, endTime: string): OperatorSiteSchedule => ({
    alwaysOpen: false,
    scheduleNote: null,
    days: Array.from({ length: 6 }, (_, index) => {
        const dayOfWeek = index + 1;
        return {
            dayOfWeek,
            dayLabel: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][index]!,
            isActive: days.includes(dayOfWeek),
            startTime,
            endTime,
            breakStart: null,
            breakEnd: null,
        };
    }),
});

const service = (
    id: string,
    name: string,
    description: string,
    durationMinutes: number,
    price: string,
    category: string,
    options: { online?: boolean; presential?: boolean } = {},
) => ({
    id,
    name,
    description,
    durationMinutes,
    price,
    currency: 'CLP',
    category,
    isOnline: options.online ?? false,
    isPresential: options.presential ?? true,
});

const commonPaymentMethods = {
    requiresAdvancePayment: false,
    acceptsMp: false,
    acceptsTransfer: false,
    mpConnected: false,
    paymentLinkUrl: null,
    bankTransferData: null,
};

function location(id: string, name: string, addressLine: string, city: string, region: string) {
    return { id, name, addressLine, city, region, googleMapsUrl: null };
}

export const INDUSTRY_SITE_DEMOS: IndustrySiteDemo[] = [
    {
        id: 'psychology',
        label: 'Psicología',
        detail: 'Atención y bienestar emocional',
        showcase: {
            headline: 'Una consulta clara, sin interrumpir tus sesiones.',
            description: 'Presenta tus tipos de atención y modalidad para que cada paciente revise las horas disponibles y reserve desde su teléfono.',
            highlights: ['Sesiones online y presenciales en servicios distintos', 'Duración y valor visibles antes de reservar', 'Solo se muestran los horarios que tienes disponibles'],
        },
        slug: 'valentina',
        initials: 'VM',
        professional: 'Valentina Muñoz',
        profession: 'Psicóloga clínica',
        businessLabel: 'Psicóloga',
        profile: {
            slug: 'demo-psicologia',
            displayName: 'Valentina Muñoz',
            profession: 'Psicóloga clínica',
            headline: 'Un espacio tranquilo para cuidar tu bienestar emocional.',
            bio: 'Acompañamiento psicológico para adultos, con atención cercana y objetivos definidos en conjunto. Sesiones presenciales y online.',
            avatarUrl: '/hero/psychologist-profile.webp',
            coverUrl: '/hero/psychology-session.webp',
            city: 'Providencia',
            region: 'Región Metropolitana',
            publicEmail: null,
            publicPhone: null,
            publicWhatsapp: null,
            websiteUrl: null,
            servesOnline: true,
            servesPresential: true,
            paymentMethods: commonPaymentMethods,
            locations: [location('psychology-office', 'Consulta Providencia', 'Atención con reserva previa', 'Providencia', 'Región Metropolitana')],
        },
        catalog: {
            services: [
                service('psychology-individual', 'Atención individual', 'Un espacio confidencial para trabajar tus objetivos personales.', 50, '35000', 'Online o presencial', { online: true }),
                service('psychology-first', 'Primera consulta', 'Primera conversación para conocer tu motivo de consulta.', 60, '40000', 'Primera atención', { online: true }),
                service('psychology-followup', 'Sesión de seguimiento', 'Continuidad y revisión de avances del proceso.', 45, '30000', 'Seguimiento', { online: true }),
            ],
            packs: [],
            promotions: [],
        },
        schedule: weeklySchedule([1, 2, 3, 4, 5], '09:00', '18:00'),
        appearance: { layout: 'studio', colorMode: 'light', accentColor: '#557B72' },
        coverPosition: { mobile: '50% 50%', desktop: '42% 50%' },
    },
    {
        id: 'barber',
        label: 'Barbería',
        detail: 'Cortes, barba y estilo',
        showcase: {
            headline: 'Cortes y servicios listos para reservar.',
            description: 'Tus clientes revisan cada servicio, cuánto dura y cuánto cuesta antes de elegir una hora disponible.',
            highlights: ['Corte, barba y combinaciones en el mismo catálogo', 'Duración y precio a la vista', 'Un link de reservas para compartir en tus redes'],
        },
        slug: 'matias',
        initials: 'MR',
        professional: 'Matías Rojas',
        profession: 'Barbero · Atención presencial',
        businessLabel: 'Barbería',
        profile: {
            slug: 'demo-barberia',
            displayName: 'Matías Rojas',
            profession: 'Barbero profesional',
            headline: 'Cortes con carácter y tiempo reservado solo para ti.',
            bio: 'Barbería clásica y contemporánea, con atención personalizada y cuidado en cada detalle.',
            avatarUrl: '/hero/barber-portrait.webp',
            coverUrl: '/hero/barber-session.webp',
            city: 'Viña del Mar',
            region: 'Valparaíso',
            publicEmail: null,
            publicPhone: null,
            publicWhatsapp: null,
            websiteUrl: null,
            servesOnline: false,
            servesPresential: true,
            paymentMethods: commonPaymentMethods,
            locations: [location('barber-studio', 'Estudio de barbería', 'Atención con reserva previa', 'Viña del Mar', 'Valparaíso')],
        },
        catalog: {
            services: [
                service('barber-cut', 'Corte de cabello', 'Asesoría de estilo, corte y terminaciones.', 40, '15000', 'Servicio presencial'),
                service('barber-combo', 'Corte + barba', 'Un servicio completo para renovar tu estilo.', 60, '22000', 'Servicio presencial'),
                service('barber-beard', 'Perfilado de barba', 'Diseño y definición de barba.', 30, '12000', 'Servicio presencial'),
            ],
            packs: [],
            promotions: [],
        },
        schedule: weeklySchedule([2, 3, 4, 5, 6], '10:30', '20:00'),
        appearance: { layout: 'portfolio', colorMode: 'dark', accentColor: '#AE754B' },
        coverPosition: { mobile: '50% 50%', desktop: '48% 50%' },
    },
    {
        id: 'aesthetics',
        label: 'Estética',
        detail: 'Tratamientos y cuidado personal',
        showcase: {
            headline: 'Una vitrina de tratamientos con tu sello visual.',
            description: 'Ordena tus tratamientos en una página de marca con portada, colores y datos listos para que tus clientes reserven.',
            highlights: ['Tratamientos separados por tipo de atención', 'Duración y precio visibles', 'Portada y paleta personalizables con Pro'],
        },
        slug: 'camila',
        initials: 'CS',
        professional: 'Camila Silva',
        profession: 'Estética facial y corporal',
        businessLabel: 'Estética',
        profile: {
            slug: 'demo-estetica',
            displayName: 'Camila Silva',
            profession: 'Especialista en estética',
            headline: 'Un momento para ti. Un tratamiento elegido para tu piel.',
            bio: 'Atención personalizada en un espacio diseñado para que puedas pausar, cuidarte y sentirte bien.',
            avatarUrl: '/hero/esthetician-profile.webp',
            coverUrl: '/hero/aesthetics-consultation.webp',
            city: 'Las Condes',
            region: 'Región Metropolitana',
            publicEmail: null,
            publicPhone: null,
            publicWhatsapp: null,
            websiteUrl: null,
            servesOnline: false,
            servesPresential: true,
            paymentMethods: commonPaymentMethods,
            locations: [location('aesthetic-studio', 'Estudio de cuidado personal', 'Atención con reserva previa', 'Las Condes', 'Región Metropolitana')],
        },
        catalog: {
            services: [
                service('aesthetics-facial', 'Limpieza facial', 'Rutina de limpieza y cuidado adaptada a tu piel.', 60, '32000', 'Cuidado facial'),
                service('aesthetics-manicure', 'Manicure permanente', 'Manicure y esmaltado de larga duración.', 75, '25000', 'Manos y uñas'),
                service('aesthetics-lashes', 'Lifting de pestañas', 'Realza tus pestañas con un acabado natural.', 60, '28000', 'Mirada'),
            ],
            packs: [],
            promotions: [],
        },
        schedule: weeklySchedule([1, 2, 3, 4, 5, 6], '09:30', '19:00'),
        appearance: { layout: 'portfolio', colorMode: 'light', accentColor: '#A95477' },
        coverPosition: { mobile: '50% 50%', desktop: '60% 50%' },
    },
    {
        id: 'kinesiology',
        label: 'Kinesiología',
        detail: 'Movimiento y rehabilitación',
        showcase: {
            headline: 'Evaluaciones y seguimientos, fáciles de distinguir.',
            description: 'Ayuda a tus pacientes a encontrar la atención adecuada y reservar dentro de los bloques que definiste.',
            highlights: ['Evaluación inicial y sesiones de seguimiento', 'Duración y valor para cada servicio', 'Disponibilidad configurada por ti'],
        },
        slug: 'daniela',
        initials: 'DF',
        professional: 'Daniela Fuentes',
        profession: 'Kinesióloga · Atención presencial',
        businessLabel: 'Kinesiología',
        profile: {
            slug: 'demo-kinesiologia',
            displayName: 'Daniela Fuentes',
            profession: 'Kinesióloga',
            headline: 'Recupera movimiento con un plan de atención a tu ritmo.',
            bio: 'Evaluación y acompañamiento kinésico para volver a moverte con confianza. Cada proceso parte con una valoración individual.',
            avatarUrl: '/hero/kinesiologist-profile.webp',
            coverUrl: '/hero/kinesiology-session.webp',
            city: 'Ñuñoa',
            region: 'Región Metropolitana',
            publicEmail: null,
            publicPhone: null,
            publicWhatsapp: null,
            websiteUrl: null,
            servesOnline: false,
            servesPresential: true,
            paymentMethods: commonPaymentMethods,
            locations: [location('kine-centre', 'Centro de movimiento', 'Atención con reserva previa', 'Ñuñoa', 'Región Metropolitana')],
        },
        catalog: {
            services: [
                service('kine-assessment', 'Evaluación kinésica', 'Evaluación inicial para definir objetivos y plan de trabajo.', 60, '30000', 'Primera atención'),
                service('kine-session', 'Sesión de kinesioterapia', 'Sesión individual de tratamiento y ejercicio terapéutico.', 45, '25000', 'Seguimiento'),
                service('kine-sports', 'Rehabilitación deportiva', 'Acompañamiento progresivo para retomar tu actividad.', 60, '28000', 'Deporte'),
            ],
            packs: [],
            promotions: [],
        },
        schedule: weeklySchedule([1, 2, 3, 4, 5], '08:30', '18:30'),
        appearance: { layout: 'booking', colorMode: 'light', accentColor: '#397A91' },
        coverPosition: { mobile: '50% 50%', desktop: '47% 50%' },
    },
    {
        id: 'nutrition',
        label: 'Nutrición',
        detail: 'Evaluación y seguimiento',
        showcase: {
            headline: 'Primera atención o control: cada opción en su lugar.',
            description: 'Muestra la modalidad, duración y valor de tus consultas para que tus pacientes elijan con claridad.',
            highlights: ['Atenciones online y presenciales', 'Servicios con duración propia', 'Reservas desde tu link público'],
        },
        slug: 'francisca',
        initials: 'FP',
        professional: 'Francisca Pérez',
        profession: 'Nutricionista · Online y presencial',
        businessLabel: 'Nutrición',
        profile: {
            slug: 'demo-nutricion',
            displayName: 'Francisca Pérez',
            profession: 'Nutricionista',
            headline: 'Alimentación flexible para cuidar tu salud y tus objetivos.',
            bio: 'Acompañamiento nutricional con metas realistas, evaluación personalizada y seguimiento a tu ritmo.',
            avatarUrl: '/hero/nutritionist-profile.webp',
            coverUrl: '/hero/nutrition-consultation.webp',
            city: 'Las Condes',
            region: 'Región Metropolitana',
            publicEmail: null,
            publicPhone: null,
            publicWhatsapp: null,
            websiteUrl: null,
            servesOnline: true,
            servesPresential: true,
            paymentMethods: commonPaymentMethods,
            locations: [location('nutrition-office', 'Consulta Las Condes', 'Atención con reserva previa', 'Las Condes', 'Región Metropolitana')],
        },
        catalog: {
            services: [
                service('nutrition-assessment', 'Evaluación nutricional', 'Revisión de hábitos, objetivos y plan de acompañamiento.', 60, '32000', 'Online o presencial', { online: true }),
                service('nutrition-followup', 'Control nutricional', 'Seguimiento y ajustes para mantener tus avances.', 30, '22000', 'Seguimiento', { online: true }),
                service('nutrition-online', 'Consulta online', 'Atención por videollamada desde donde estés.', 45, '25000', 'Videollamada', { online: true, presential: false }),
            ],
            packs: [],
            promotions: [],
        },
        schedule: weeklySchedule([1, 2, 3, 4], '09:30', '19:00'),
        appearance: { layout: 'studio', colorMode: 'light', accentColor: '#72823A' },
        coverPosition: { mobile: '50% 50%', desktop: '42% 50%' },
    },
    {
        id: 'therapy',
        label: 'Terapia',
        detail: 'Acompañamiento individual y familiar',
        showcase: {
            headline: 'Cada tipo de sesión explicado con claridad.',
            description: 'Presenta tus alternativas de atención y deja que cada persona revise las horas disponibles antes de reservar.',
            highlights: ['Sesiones individuales y de pareja', 'Modalidad online y presencial', 'Reserva directa desde tu página'],
        },
        slug: 'paula',
        initials: 'PH',
        professional: 'Paula Herrera',
        profession: 'Terapeuta · Online y presencial',
        businessLabel: 'Terapia',
        profile: {
            slug: 'demo-terapia',
            displayName: 'Paula Herrera',
            profession: 'Terapeuta familiar',
            headline: 'Un espacio de confianza para conversar y avanzar.',
            bio: 'Acompañamiento para personas y familias que buscan nuevas herramientas para sus relaciones y bienestar.',
            avatarUrl: '/hero/therapist-profile.webp',
            coverUrl: '/hero/therapy-family-session.webp',
            city: 'Santiago',
            region: 'Región Metropolitana',
            publicEmail: null,
            publicPhone: null,
            publicWhatsapp: null,
            websiteUrl: null,
            servesOnline: true,
            servesPresential: true,
            paymentMethods: commonPaymentMethods,
            locations: [location('therapy-office', 'Espacio de atención', 'Atención con reserva previa', 'Santiago', 'Región Metropolitana')],
        },
        catalog: {
            services: [
                service('therapy-individual', 'Sesión individual', 'Espacio de conversación y acompañamiento personal.', 50, '35000', 'Online o presencial', { online: true }),
                service('therapy-first', 'Primera sesión', 'Conoce el enfoque y define tus objetivos de atención.', 60, '40000', 'Primera atención', { online: true }),
                service('therapy-couple', 'Terapia de pareja', 'Un espacio guiado para trabajar acuerdos y comunicación.', 60, '48000', 'Atención especializada', { online: true }),
            ],
            packs: [],
            promotions: [],
        },
        schedule: weeklySchedule([1, 2, 3, 4, 5], '10:00', '19:00'),
        appearance: { layout: 'booking', colorMode: 'light', accentColor: '#746992' },
        coverPosition: { mobile: '50% 50%', desktop: '50% 50%' },
    },
];

export function getIndustrySiteDemo(id: string): IndustrySiteDemo | undefined {
    return INDUSTRY_SITE_DEMOS.find((demo) => demo.id === id);
}
