export const EMAIL_TEMPLATES = [
    { id: 'custom', label: 'Mensaje personalizado', subject: '', message: '', actionLabel: '', actionUrl: '' },
    {
        id: 'agenda-follow-up',
        label: 'Seguimiento SimpleAgenda',
        subject: '¿Te ayudamos a dejar tu agenda funcionando?',
        message: `Hola {{name}},

Vimos que creaste tu cuenta en SimpleAgenda y queríamos acompañarte en los primeros pasos.

Si te faltó configurar disponibilidad, servicios o pagos, responde este correo y te orientamos directamente.

Saludos,
Equipo SimpleAgenda`,
        actionLabel: 'Entrar a SimpleAgenda',
        actionUrl: 'https://simpleagenda.app/panel',
    },
    {
        id: 'agenda-reactivation',
        label: 'Recuperación SimpleAgenda',
        subject: 'Tu cuenta de SimpleAgenda sigue lista para usar',
        message: `Hola {{name}},

Tu cuenta sigue disponible para continuar configurando tu agenda profesional.

Si algo no te hizo sentido, respóndenos este correo y lo revisamos contigo.

Saludos,
Equipo SimpleAgenda`,
        actionLabel: 'Retomar configuración',
        actionUrl: 'https://simpleagenda.app/panel',
    },
    {
        id: 'welcome-platform',
        label: 'Bienvenida corporativa',
        subject: 'Bienvenido al ecosistema Simple',
        message: `Hola {{name}},

Gracias por crear tu cuenta en el ecosistema Simple.

Si necesitas ayuda para ubicarte o elegir por dónde continuar, responde este correo y te orientamos.

Saludos,
Equipo Simple`,
        actionLabel: 'Ir al ecosistema Simple',
        actionUrl: 'https://simpleplataforma.app',
    },
] as const;
