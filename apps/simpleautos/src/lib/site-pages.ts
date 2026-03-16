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
        eyebrow: 'SimpleAutos',
        title: 'Marketplace automotriz pensado para publicar, escalar y cerrar mejor.',
        intro: 'SimpleAutos busca reducir fricción en la compra, venta, arriendo y subasta de vehículos. La idea no es llenar de ruido el proceso, sino ordenar la información, dar mejores herramientas a quienes publican y ofrecer una experiencia más clara para quien busca.',
        summary: [
            'Operación enfocada en publicar mejor y responder más rápido.',
            'Herramientas para particulares, profesionales y flotas.',
            'Boost, publicidad e integraciones como parte del flujo comercial.',
        ],
        primaryCta: { label: 'Publicar vehículo', href: '/panel/publicar' },
        secondaryCta: { label: 'Ver servicios', href: '/servicios' },
        footerNav,
        sections: [
            {
                title: 'Qué somos',
                paragraphs: [
                    'Somos una vertical especializada dentro del ecosistema Simple para vehículos livianos, SUVs, pickups, motos, náutica y otros segmentos que requieren catálogos, medios y atributos más ordenados.',
                    'El objetivo es que una publicación no dependa solo de estar “arriba”, sino de tener estructura, calidad visual, datos claros y herramientas comerciales que ayuden a convertir.',
                ],
            },
            {
                title: 'Cómo trabajamos',
                paragraphs: [
                    'Diseñamos el producto para que una publicación tenga vida completa: creación, mejora, distribución, impulso, seguimiento y cierre. Eso incluye gestión desde panel, promociones, portales, suscripciones y automatizaciones.',
                    'Cuando corresponde, también incorporamos capas de servicio para personas o empresas que prefieren delegar parte de la operación comercial y de publicación.',
                ],
                bullets: [
                    'Publicaciones mejor estructuradas y listas para distribuir.',
                    'Panel operativo con foco comercial y no solo administrativo.',
                    'Herramientas pagas claras: publicidad, boost y suscripciones.',
                ],
            },
            {
                title: 'Qué priorizamos',
                paragraphs: [
                    'Preferimos una interfaz sobria y profesional antes que una plataforma cargada de estímulos. La confianza, la lectura rápida de datos y la capacidad de operar importan más que el adorno.',
                    'También priorizamos compatibilidad con operación real: cuentas empresa, múltiples publicaciones, medios de pago e integraciones que permitan vender de forma más consistente.',
                ],
            },
        ],
    },
    contacto: {
        eyebrow: 'Soporte y contacto',
        title: 'El canal correcto depende del momento operativo en que estés.',
        intro: 'Para que la respuesta sea útil, preferimos que cada necesidad llegue por el punto adecuado del producto. Así reducimos tiempos muertos y evitamos que una consulta comercial termine mezclada con soporte operativo.',
        summary: [
            'El panel es el canal más rápido para cuentas activas.',
            'Publicidad, boosts y publicación tienen rutas operativas distintas.',
            'Las solicitudes bien contextualizadas se resuelven mejor.',
        ],
        primaryCta: { label: 'Ir al panel', href: '/panel' },
        secondaryCta: { label: 'Explorar servicios', href: '/servicios' },
        footerNav,
        sections: [
            {
                title: 'Cuándo escribirnos',
                paragraphs: [
                    'Si necesitas ayuda con publicaciones, planes, publicidad, integración de cuenta o revisión de una incidencia concreta, lo mejor es hacerlo desde una cuenta activa para que podamos ubicar el contexto real.',
                    'Cuando el caso incluye una publicación específica, un plan contratado o una configuración de empresa, la referencia operativa es clave para responder con precisión.',
                ],
            },
            {
                title: 'Cómo ayudarte más rápido',
                paragraphs: [
                    'Mientras más concreta sea la solicitud, más rápida suele ser la resolución. Una buena consulta incluye qué intentabas hacer, en qué vertical estabas, y qué resultado esperabas.',
                ],
                bullets: [
                    'Indica si eres particular, profesional o empresa.',
                    'Aclara si el caso es de publicación, cobro, suscripción o integración.',
                    'Incluye la URL o el identificador de la publicación cuando exista.',
                ],
            },
            {
                title: 'Si operas varias publicaciones',
                paragraphs: [
                    'Para cuentas con varias unidades, renovaciones frecuentes o campañas de visibilidad, la conversación más útil no es solo de soporte, sino de operación. En esos casos priorizamos ordenar flujo, estructura de inventario y visibilidad.',
                ],
            },
        ],
    },
    blog: {
        eyebrow: 'Editorial',
        title: 'Estamos construyendo una biblioteca útil, no un blog de relleno.',
        intro: 'Este espacio está pensado para publicar contenido realmente útil para quienes venden, compran o gestionan inventario automotriz: guías, análisis de mercado, visibilidad, pricing, captación y operación comercial.',
        summary: [
            'Guías prácticas para vender y publicar mejor.',
            'Análisis de producto, distribución y performance.',
            'Contenido editorial con foco en operación real.',
        ],
        primaryCta: { label: 'Ir a Descubre', href: '/descubre' },
        secondaryCta: { label: 'Ver publicaciones', href: '/ventas' },
        footerNav,
        sections: [
            {
                title: 'Qué vas a encontrar',
                paragraphs: [
                    'La línea editorial apunta a decisiones reales: cómo estructurar una publicación, cuándo conviene impulsar, cómo mejorar fotos, qué mirar en la demanda y cómo ordenar procesos de venta.',
                ],
                bullets: [
                    'Buenas prácticas para publicaciones con mejor conversión.',
                    'Lecturas de mercado y comportamiento de demanda.',
                    'Notas sobre herramientas, producto e integraciones.',
                ],
            },
            {
                title: 'Qué no vamos a publicar',
                paragraphs: [
                    'No queremos llenar este espacio con notas vacías o listas genéricas copiadas. Si una pieza editorial no ayuda a operar mejor o a decidir mejor, no tiene sentido publicarla.',
                ],
            },
            {
                title: 'Cómo proponernos temas',
                paragraphs: [
                    'Si detectas una duda recurrente en clientes, equipos comerciales o cuentas empresa, ese tipo de señal sí nos interesa. El foco está en resolver problemas concretos del negocio automotriz.',
                ],
            },
        ],
    },
    terminos: {
        eyebrow: 'Legal',
        title: 'Términos para usar la plataforma de manera clara y responsable.',
        intro: 'Estos términos resumen cómo entendemos el uso de SimpleAutos, qué responsabilidades asume cada parte y qué criterios usamos para moderar, cobrar y operar servicios dentro de la plataforma.',
        summary: [
            'La plataforma facilita publicación y distribución.',
            'Cada usuario responde por el contenido que publica.',
            'Los servicios pagos tienen condiciones comerciales propias.',
        ],
        primaryCta: { label: 'Ver privacidad', href: '/privacidad' },
        secondaryCta: { label: 'Preguntas frecuentes', href: '/faq' },
        footerNav,
        sections: [
            {
                title: 'Uso de la plataforma',
                paragraphs: [
                    'SimpleAutos puede ser utilizada por personas y empresas para publicar, descubrir, promover y gestionar vehículos dentro de las categorías habilitadas. El uso de la cuenta debe corresponder a información real y actualizada.',
                    'Nos reservamos la facultad de suspender o limitar accesos cuando detectamos suplantación, fraude, abuso de sistemas, manipulación de visibilidad o uso contrario a la operación normal del servicio.',
                ],
            },
            {
                title: 'Publicaciones y responsabilidad',
                paragraphs: [
                    'Quien publica es responsable por la veracidad del contenido, las imágenes, el estado informado del vehículo, la disponibilidad y cualquier afirmación comercial incluida en la ficha.',
                    'Podemos moderar, pausar o bajar publicaciones cuando su calidad sea insuficiente, existan inconsistencias evidentes o se infrinjan reglas de la plataforma.',
                ],
            },
            {
                title: 'Servicios pagos',
                paragraphs: [
                    'Boosts, publicidad, suscripciones y otros servicios comerciales se rigen por lo ofrecido al momento de la contratación. Su alcance depende del plan, la vertical y la configuración vigente.',
                    'Un servicio pagado no reemplaza la necesidad de una publicación clara, actualizada y con material visual suficiente.',
                ],
            },
            {
                title: 'Propiedad intelectual y cambios',
                paragraphs: [
                    'La marca, diseño, flujos, software y materiales propios de la plataforma pertenecen a Simple. El usuario conserva titularidad sobre su contenido, pero autoriza el uso necesario para publicar, distribuir y operar el servicio.',
                    'Podemos actualizar producto, precios, reglas de uso y criterios operativos cuando sea necesario para mantener seguridad, calidad o continuidad del servicio.',
                ],
            },
        ],
    },
    privacidad: {
        eyebrow: 'Privacidad',
        title: 'Tratamos datos para operar el servicio, no para inflar la plataforma de ruido.',
        intro: 'La información que recolectamos tiene una función operativa: crear cuentas, administrar publicaciones, ejecutar cobros, mejorar seguridad y permitir el uso de herramientas contratadas dentro del ecosistema Simple.',
        summary: [
            'Datos de cuenta, publicaciones y operación.',
            'Uso acotado a funciones de producto y negocio.',
            'Medidas de seguridad y control de acceso.',
        ],
        primaryCta: { label: 'Ver términos', href: '/terminos' },
        secondaryCta: { label: 'Ir al panel', href: '/panel' },
        footerNav,
        sections: [
            {
                title: 'Qué datos tratamos',
                paragraphs: [
                    'Podemos tratar datos de cuenta como nombre, correo, rol, preferencias y datos necesarios para autenticación. También tratamos información de publicaciones, activos multimedia, campañas, suscripciones e interacciones dentro del producto.',
                    'Cuando se usan integraciones o medios de pago, también procesamos los datos mínimos necesarios para completar ese flujo, siempre dentro del alcance técnico y comercial del servicio.',
                ],
            },
            {
                title: 'Para qué usamos la información',
                paragraphs: [
                    'La información se utiliza para permitir acceso, operar publicaciones, mostrar contenido, ejecutar pagos, prevenir abuso, dar soporte y mejorar estabilidad del producto.',
                ],
                bullets: [
                    'Gestión de cuenta y autenticación.',
                    'Operación de publicaciones, boosts y publicidad.',
                    'Integraciones, analítica operativa y soporte.',
                ],
            },
            {
                title: 'Seguridad y conservación',
                paragraphs: [
                    'Aplicamos controles razonables para proteger sesiones, credenciales y acceso a funciones sensibles. Conservamos la información durante el tiempo necesario para operar el servicio, cumplir obligaciones y atender incidencias o revisiones.',
                    'Cuando una integración o servicio externo participa en el flujo, el tratamiento también puede depender de las condiciones de ese proveedor.',
                ],
            },
            {
                title: 'Tus decisiones',
                paragraphs: [
                    'Puedes revisar y actualizar parte relevante de tu información desde el panel. En materias que requieran revisión adicional, como accesos o integraciones, la gestión puede requerir validación interna.',
                ],
            },
        ],
    },
    faq: {
        eyebrow: 'Preguntas frecuentes',
        title: 'Respuestas cortas para dudas operativas comunes.',
        intro: 'Esta sección resume preguntas que aparecen con frecuencia al publicar, contratar visibilidad o trabajar con cuentas de mayor volumen dentro de SimpleAutos.',
        summary: [
            'Publicación y revisión de avisos.',
            'Planes, boosts y publicidad.',
            'Integraciones y operación desde panel.',
        ],
        primaryCta: { label: 'Publicar vehículo', href: '/panel/publicar' },
        secondaryCta: { label: 'Ver publicidad', href: '/panel/publicidad' },
        footerNav,
        sections: [
            {
                title: '¿Puedo publicar como particular o como empresa?',
                paragraphs: [
                    'Sí. La plataforma está pensada para ambos escenarios. La diferencia práctica está en el volumen, las herramientas comerciales disponibles y el tipo de operación que necesitas gestionar.',
                ],
            },
            {
                title: '¿Qué mejora una publicación?',
                paragraphs: [
                    'Un aviso mejora cuando tiene estructura clara, fotos suficientes, atributos completos y una propuesta comercial coherente. El boost ayuda a visibilidad, pero no compensa una ficha pobre.',
                ],
            },
            {
                title: '¿Los planes cambian lo que puedo hacer?',
                paragraphs: [
                    'Sí. Los planes habilitan distintas herramientas, especialmente cuando se trata de cuentas con más inventario, visibilidad pagada, publicidad o integraciones.',
                ],
            },
            {
                title: '¿Puedo conectar integraciones como Instagram?',
                paragraphs: [
                    'Sí, cuando la integración está disponible para tu plan y el entorno está correctamente configurado. Ese tipo de conexión depende de credenciales, callbacks públicos y permisos válidos del proveedor externo.',
                ],
            },
            {
                title: '¿Qué pasa si una publicación no cumple estándar?',
                paragraphs: [
                    'Puede ser moderada, pausada o pedirse corrección. Preferimos calidad consistente antes que inflar inventario con avisos incompletos o poco confiables.',
                ],
            },
        ],
    },
};

export function getSitePage(key: SitePageKey): SiteInfoPageData {
    return pages[key];
}
