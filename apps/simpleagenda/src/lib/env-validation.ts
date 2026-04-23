/**
 * Validación de variables de entorno al inicio de la aplicación
 * Esta función se ejecuta en el lado del cliente para verificar que las variables críticas estén configuradas
 */

export function validateEnvVars(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Variables críticas requeridas
    const requiredVars: Array<{ key: string; value: string | undefined; name: string }> = [
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

    for (const { key, value, name } of requiredVars) {
        if (!value) {
            errors.push(`${name} (${key}) no está configurada. Por favor configura esta variable en tu archivo .env.local.`);
        }
    }

    if (errors.length > 0) {
        console.error('[SimpleAgenda] Errores de configuración:', errors);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
