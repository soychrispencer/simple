import { validateClientEnvVars } from '@simple/utils';

export function validateEnvVars() {
    return validateClientEnvVars('SimpleAutos', {
        recommended: [
            { key: 'GOOGLE_AI_API_KEY', value: process.env.GOOGLE_AI_API_KEY, name: 'Google AI API Key' },
            { key: 'NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY', value: process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY, name: 'Google Maps Browser Key' },
        ],
    });
}
