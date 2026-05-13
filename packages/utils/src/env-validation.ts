export type ClientEnvValidationResult = {
    valid: boolean;
    errors: string[];
};

export type ClientEnvVar = {
    key: string;
    value: string | undefined;
    name: string;
};

export function validateClientEnvVars(
    appName: string,
    options: {
        required?: ClientEnvVar[];
        recommended?: ClientEnvVar[];
    } = {}
): ClientEnvValidationResult {
    const errors: string[] = [];
    const required = options.required ?? [
        {
            key: 'NEXT_PUBLIC_API_URL',
            value: process.env.NEXT_PUBLIC_API_URL,
            name: 'URL de la API',
        },
        {
            key: 'NEXT_PUBLIC_APP_URL',
            value: process.env.NEXT_PUBLIC_APP_URL,
            name: 'URL de la aplicación',
        },
    ];

    for (const { key, value, name } of required) {
        if (!value) {
            errors.push(`${name} (${key}) no está configurada. Por favor configura esta variable en tu archivo .env.local.`);
        }
    }

    if (process.env.NODE_ENV === 'development') {
        for (const { key, value, name } of options.recommended ?? []) {
            if (!value) {
                console.warn(`[${appName}] ${name} (${key}) no está configurada. Algunas funciones pueden no estar disponibles.`);
            }
        }
    }

    if (errors.length > 0) {
        console.error(`[${appName}] Errores de configuración:`, errors);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
