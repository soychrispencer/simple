import type { SiteInfoPageData } from '@/components/content/site-info-page';

type SitePageKey = 'nosotros' | 'contacto' | 'blog' | 'terminos' | 'privacidad' | 'faq';

const footerNav = [
    { label: 'Nosotros', href: '/nosotros' },
    { label: 'Contacto', href: '/contacto' },
    { label: 'Blog', href: '/blog' },
    { label: 'Términos', href: '/terminos' },
    { label: 'Privacidad', href: '/privacidad' },
    { label: 'Preguntas frecuentes', href: '/faq' },
];

const pages: Record<SitePageKey, SiteInfoPageData> = {
    nosotros: {
        eyebrow: 'SimplePropiedades',
        title: 'Un portal inmobiliario orientado a operar con claridad y ritmo comercial.',
        intro: 'SimplePropiedades está diseñado para personas, corredores, inmobiliarias y equipos comerciales que necesitan publicar mejor, ordenar inventario y escalar visibilidad sin sacrificar una experiencia sobria y entendible.',
        summary: [
            'Compra, arriendo, proyectos y operación inmobiliaria en un mismo flujo.',
            'Herramientas comerciales para particulares y cuentas empresa.',
            'Panel pensado para publicar, distribuir y medir mejor.',
        ],
        primaryCta: { label: 'Publicar propiedad', href: '/panel/publicar' },
        secondaryCta: { label: 'Ver servicios', href: '/servicios' },
        footerNav,
        sections: [
            {
                title: 'Qué somos',
                paragraphs: [
                    'Somos la vertical inmobiliaria del ecosistema Simple. La plataforma busca ordenar fichas, medios, atributos, visibilidad y operación para que la publicación deje de ser solo una vitrina y se convierta en una herramienta comercial real.',
                    'El foco está en propiedades usadas, arriendos, proyectos y estructuras de publicación que permitan trabajar mejor tanto a independientes como a equipos con inventario mayor.',
                ],
            },
            {
                title: 'Cómo entendemos la operación',
                paragraphs: [
                    'Publicar bien en inmobiliario no depende solo de subir fotos. Importa la estructura, la claridad, la visibilidad y la capacidad de administrar muchas publicaciones con consistencia.',
                    'Por eso priorizamos panel, categorización, visibilidad pagada, suscripciones y futuras integraciones que acompañen la operación en vez de dejarla dispersa.',
                ],
                bullets: [
                    'Fichas con mejor estructura para venta, arriendo y proyectos.',
                    'Herramientas de visibilidad y distribución desde un mismo panel.',
                    'Enfoque para particulares, corredores e inmobiliarias.',
                ],
            },
            {
                title: 'Qué priorizamos',
                paragraphs: [
                    'Preferimos una estética limpia y una jerarquía clara de información. La interfaz tiene que ayudar a leer y decidir, no competir por atención con la propia publicación.',
                    'También priorizamos trazabilidad comercial: qué se publicó, qué se impulsó, qué plan está activo y cómo se está moviendo la operación.',
                ],
            },
        ],
    },
    contacto: {
        eyebrow: 'Soporte y contacto',
        title: 'La mejor conversación es la que llega con contexto y objetivo claro.',
        intro: 'En una plataforma inmobiliaria, no todas las solicitudes son iguales. Soporte de cuenta, publicación, campañas, boost, planes o inventario requieren rutas distintas. El objetivo es ayudarte mejor, no solo responder más rápido.',
        summary: [
            'El panel es el mejor punto de partida para cuentas activas.',
            'Las solicitudes comerciales necesitan contexto operativo.',
            'La calidad de la referencia acelera la resolución.',
        ],
        primaryCta: { label: 'Entrar al panel', href: '/panel' },
        secondaryCta: { label: 'Explorar servicios', href: '/servicios' },
        footerNav,
        sections: [
            {
                title: 'Cuándo escribirnos',
                paragraphs: [
                    'Si necesitas ayuda con publicaciones, suscripciones, campañas, integraciones o revisión de una incidencia, lo ideal es hacerlo desde una cuenta activa y con referencia concreta a la propiedad o configuración involucrada.',
                    'Eso nos permite identificar mejor el contexto real de la operación y reducir intercambios innecesarios.',
                ],
            },
            {
                title: 'Cómo resolver más rápido',
                paragraphs: [
                    'Una buena solicitud describe qué vertical usabas, si era venta, arriendo o proyecto, qué intentabas hacer y qué resultado esperabas.',
                ],
                bullets: [
                    'Incluye la URL o identificador de la publicación cuando exista.',
                    'Aclara si el caso es comercial, técnico o de cuenta.',
                    'Indica si operas como particular, corredor o empresa.',
                ],
            },
            {
                title: 'Si gestionas inventario',
                paragraphs: [
                    'Cuando la consulta involucra múltiples propiedades, planes de visibilidad o una operación comercial más amplia, la ayuda más útil suele ser ordenar estructura y flujo, no solo responder una incidencia aislada.',
                ],
            },
        ],
    },
    blog: {
        eyebrow: 'Editorial',
        title: 'Estamos armando un espacio editorial que sirva para operar mejor.',
        intro: 'El blog de SimplePropiedades está pensado para publicar contenido útil sobre publicación inmobiliaria, calidad de ficha, visibilidad, pricing, arriendo, proyectos y herramientas para cuentas profesionales.',
        summary: [
            'Guías prácticas y análisis con criterio comercial.',
            'Contenido para venta, arriendo y proyectos.',
            'Nada de artículos genéricos solo para llenar espacio.',
        ],
        primaryCta: { label: 'Ir a Descubre', href: '/descubre' },
        secondaryCta: { label: 'Ver propiedades', href: '/ventas' },
        footerNav,
        sections: [
            {
                title: 'Qué publicaremos',
                paragraphs: [
                    'La línea editorial cubrirá temas concretos: cómo mejorar una ficha, cuándo impulsar, qué contenido visual ayuda a convertir, cómo ordenar inventario y qué señales mirar del mercado.',
                ],
                bullets: [
                    'Buenas prácticas para venta y arriendo.',
                    'Operación comercial para corredores e inmobiliarias.',
                    'Notas de producto, distribución e integraciones.',
                ],
            },
            {
                title: 'Qué evitaremos',
                paragraphs: [
                    'No queremos un blog inflado de contenido repetido o vacío. Si un texto no ayuda a decidir mejor o a operar mejor, no aporta valor real.',
                ],
            },
            {
                title: 'Cómo proponernos temas',
                paragraphs: [
                    'Nos interesan especialmente problemas recurrentes de publicación, captación, operación con clientes o visibilidad. Ese tipo de señal es la que vale convertir en contenido.',
                ],
            },
        ],
    },
    terminos: {
        eyebrow: 'Legal',
        title: 'Términos para usar el portal con reglas claras y criterio profesional.',
        intro: 'Estos términos resumen cómo opera SimplePropiedades, qué entendemos por uso correcto de la plataforma y qué responsabilidades corresponden al usuario cuando publica, promociona o administra inventario dentro del portal.',
        summary: [
            'La plataforma facilita publicación y operación comercial.',
            'Cada usuario responde por la veracidad de su contenido.',
            'Los servicios pagos tienen condiciones específicas de uso.',
        ],
        primaryCta: { label: 'Ver privacidad', href: '/privacidad' },
        secondaryCta: { label: 'Preguntas frecuentes', href: '/faq' },
        footerNav,
        sections: [
            {
                title: 'Uso de la plataforma',
                paragraphs: [
                    'SimplePropiedades puede ser utilizada por particulares, corredores, agencias, empresas e inmobiliarias para publicar, organizar, promover y administrar propiedades o proyectos habilitados por la plataforma.',
                    'El uso de cuentas falsas, contenido engañoso, automatizaciones abusivas o prácticas que alteren la experiencia normal de publicación puede derivar en suspensión o limitación del acceso.',
                ],
            },
            {
                title: 'Publicaciones y responsabilidad',
                paragraphs: [
                    'Quien publica responde por la veracidad de la información comercial, disponibilidad, ubicación declarada, atributos del inmueble, imágenes y cualquier condición relevante incorporada en la ficha.',
                    'Podemos moderar, pausar o bajar publicaciones que no cumplan estándares mínimos de claridad, calidad o consistencia con el servicio.',
                ],
            },
            {
                title: 'Servicios pagos',
                paragraphs: [
                    'Publicidad, boosts, suscripciones u otros servicios asociados a la operación inmobiliaria se rigen por lo informado al momento de la contratación y por la configuración vigente del producto.',
                    'La contratación de visibilidad no reemplaza la necesidad de una ficha sólida, con contenido suficiente y datos correctos.',
                ],
            },
            {
                title: 'Propiedad intelectual y actualizaciones',
                paragraphs: [
                    'La marca, interfaz, software y activos propios del portal pertenecen a Simple. El usuario mantiene titularidad sobre el contenido que aporta, autorizando su uso operativo dentro de la plataforma.',
                    'Podemos actualizar funcionalidades, criterios, reglas o precios cuando sea necesario para seguridad, continuidad, calidad o evolución del producto.',
                ],
            },
        ],
    },
    privacidad: {
        eyebrow: 'Privacidad',
        title: 'Usamos la información necesaria para operar el servicio con criterio y control.',
        intro: 'La información que tratamos dentro de SimplePropiedades se utiliza para crear cuentas, administrar publicaciones, operar servicios comerciales, ejecutar pagos, mantener seguridad y dar continuidad al producto.',
        summary: [
            'Datos de cuenta, publicaciones y operación comercial.',
            'Uso limitado a funciones reales del servicio.',
            'Controles de seguridad y revisión de acceso.',
        ],
        primaryCta: { label: 'Ver términos', href: '/terminos' },
        secondaryCta: { label: 'Ir al panel', href: '/panel' },
        footerNav,
        sections: [
            {
                title: 'Qué datos tratamos',
                paragraphs: [
                    'Podemos tratar datos de cuenta, autenticación, contacto, publicaciones, imágenes, campañas, suscripciones, órdenes de pago e interacciones necesarias para el uso del producto.',
                    'Cuando se usan integraciones o proveedores externos, también se procesan los datos mínimos que exige ese flujo para operar correctamente.',
                ],
            },
            {
                title: 'Para qué usamos la información',
                paragraphs: [
                    'La información se usa para permitir acceso, mostrar publicaciones, operar campañas, ejecutar cobros, prevenir abuso, dar soporte y mejorar el funcionamiento general del portal.',
                ],
                bullets: [
                    'Gestión de cuenta y seguridad.',
                    'Operación de publicaciones, boosts y suscripciones.',
                    'Soporte, trazabilidad comercial e integraciones.',
                ],
            },
            {
                title: 'Seguridad y conservación',
                paragraphs: [
                    'Aplicamos medidas razonables para proteger sesiones, credenciales y acceso a áreas sensibles del producto. Conservamos la información durante el tiempo necesario para operación, soporte, seguridad y cumplimiento.',
                    'Cuando un flujo involucra proveedores externos, el tratamiento también puede depender de las condiciones de esos servicios.',
                ],
            },
            {
                title: 'Control del usuario',
                paragraphs: [
                    'Parte importante de la configuración puede ser revisada desde el panel. Para materias sensibles o que requieren validación adicional, la atención puede pasar por revisión interna antes de aplicar cambios.',
                ],
            },
        ],
    },
    faq: {
        eyebrow: 'Preguntas frecuentes',
        title: 'Respuestas breves para dudas frecuentes de la operación inmobiliaria.',
        intro: 'Esta sección resume preguntas habituales de particulares, corredores y cuentas empresa al publicar, impulsar o administrar propiedades dentro de SimplePropiedades.',
        summary: [
            'Venta, arriendo, proyectos y visibilidad.',
            'Planes, boosts y herramientas comerciales.',
            'Operación desde panel e integraciones.',
        ],
        primaryCta: { label: 'Publicar propiedad', href: '/panel/publicar' },
        secondaryCta: { label: 'Ver publicidad', href: '/panel/publicidad' },
        footerNav,
        sections: [
            {
                title: '¿Puedo publicar como particular o empresa?',
                paragraphs: [
                    'Sí. La plataforma contempla ambos escenarios. La diferencia principal está en el volumen operativo, la visibilidad contratada y las herramientas disponibles según plan.',
                ],
            },
            {
                title: '¿Qué hace mejor una ficha inmobiliaria?',
                paragraphs: [
                    'Una ficha mejora cuando la información es clara, las imágenes son suficientes, la ubicación y atributos están bien estructurados y la propuesta comercial tiene coherencia. La visibilidad pagada ayuda, pero no reemplaza eso.',
                ],
            },
            {
                title: '¿Los planes habilitan funciones distintas?',
                paragraphs: [
                    'Sí. Los planes determinan acceso a herramientas comerciales y operativas, especialmente cuando se trabaja con más publicaciones, campañas o integraciones.',
                ],
            },
            {
                title: '¿Puedo conectar integraciones externas?',
                paragraphs: [
                    'Sí, cuando la integración está disponible para tu plan y el entorno técnico cumple las condiciones necesarias. Ese tipo de función depende de credenciales, permisos y callbacks válidos.',
                ],
            },
            {
                title: '¿Qué pasa si una publicación no cumple estándar?',
                paragraphs: [
                    'Puede requerir corrección, ser moderada o quedar pausada. La prioridad es sostener calidad y consistencia del inventario publicado dentro del portal.',
                ],
            },
        ],
    },
};

export function getSitePage(key: SitePageKey): SiteInfoPageData {
    return pages[key];
}
