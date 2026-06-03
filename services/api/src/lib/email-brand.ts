import {
    getSimpleAppBrand,
    getSimpleBrandIconDataUri,
    type SimpleAppId,
} from '@simple/config';

/** Branding por vertical para correos transaccionales (auth, agenda, etc.). */

export type EmailBrandProfile = {
    appId: SimpleAppId;
    appName: string;
    productName: string;
    accent: string;
    accentSoft: string;
    surface: string;
    onSurface: string;
    title: string;
    tagline: string;
    /** Segunda parte del wordmark (p. ej. "Serenatas" en SimpleSerenatas). */
    wordmarkSecondary: string;
    supportLabel: string;
    supportEmail: string;
    /** Ícono incrustado (mismo arte que `/icon` de cada app). */
    logoDataUri: string;
    /** URL pública del ícono (`{origin}/icon`) cuando el origin es HTTPS. */
    logoUrl: string;
    siteUrl: string;
};

function wordmarkSecondaryFrom(shortName: string): string {
    return shortName.replace(/^Simple/, '') || shortName;
}

function enrichBrand(
    appId: SimpleAppId,
    origin: string,
    overrides: Pick<EmailBrandProfile, 'surface' | 'onSurface' | 'tagline' | 'supportLabel' | 'supportEmail'> &
        Partial<Pick<EmailBrandProfile, 'accent' | 'accentSoft'>>,
): EmailBrandProfile {
    const configBrand = getSimpleAppBrand(appId);
    const siteUrl = origin.replace(/\/$/, '');
    const logoUrl = `${siteUrl}/icon`;
    return {
        appId,
        appName: configBrand.name,
        productName: 'Simple',
        accent: overrides.accent ?? configBrand.accentLight,
        accentSoft: overrides.accentSoft ?? '#f8fafc',
        surface: overrides.surface,
        onSurface: overrides.onSurface,
        title: configBrand.name,
        tagline: overrides.tagline,
        wordmarkSecondary: wordmarkSecondaryFrom(configBrand.shortName),
        supportLabel: overrides.supportLabel,
        supportEmail: overrides.supportEmail,
        logoDataUri: getSimpleBrandIconDataUri(appId),
        logoUrl,
        siteUrl,
    };
}

export function getEmailBrandProfile(origin: string): EmailBrandProfile {
    try {
        const url = new URL(origin);
        const host = url.hostname.toLowerCase();
        const port = url.port;
        const base = origin;

        if (host.includes('simpleserenatas') || port === '3005') {
            return enrichBrand('simpleserenatas', base, {
                accent: '#E11D48',
                accentSoft: '#fff1f2',
                surface: '#9f1239',
                onSurface: 'rgba(255,255,255,0.9)',
                tagline: 'Serenatas y mariachis, cuando las necesites',
                supportLabel: 'equipo SimpleSerenatas',
                supportEmail: 'soporte@simpleplataforma.app',
            });
        }
        if (host.includes('simpleautos') || port === '3002') {
            return enrichBrand('simpleautos', base, {
                surface: '#10141d',
                onSurface: 'rgba(255,255,255,0.88)',
                tagline: 'Compra y vende autos con confianza',
                supportLabel: 'equipo SimpleAutos',
                supportEmail: 'soporte@simpleplataforma.app',
            });
        }
        if (host.includes('simplepropiedades') || port === '3003') {
            return enrichBrand('simplepropiedades', base, {
                surface: '#0f172a',
                onSurface: 'rgba(255,255,255,0.88)',
                tagline: 'Propiedades claras, decisiones seguras',
                supportLabel: 'equipo SimplePropiedades',
                supportEmail: 'soporte@simpleplataforma.app',
            });
        }
        if (host.includes('simpleagenda') || port === '3004') {
            return getAgendaEmailBrand(base);
        }
        if (host.includes('admin.simpleplataforma.app') || port === '3000') {
            return enrichBrand('simpleplataforma', base, {
                surface: '#0f172a',
                onSurface: 'rgba(255,255,255,0.88)',
                tagline: 'Tu ecosistema digital en un solo lugar',
                supportLabel: 'equipo Simple',
                supportEmail: 'hola@simpleplataforma.app',
            });
        }
        if (host.includes('simpleplataforma') || port === '3001') {
            return enrichBrand('simpleplataforma', base, {
                surface: '#0f172a',
                onSurface: 'rgba(255,255,255,0.88)',
                tagline: 'Tu ecosistema digital en un solo lugar',
                supportLabel: 'equipo Simple',
                supportEmail: 'soporte@simpleplataforma.app',
            });
        }
    } catch {
        /* origin inválido */
    }
    return enrichBrand('simpleplataforma', 'https://simpleplataforma.app', {
        surface: '#0f172a',
        onSurface: 'rgba(255,255,255,0.88)',
        tagline: 'Tu ecosistema digital en un solo lugar',
        supportLabel: 'equipo Simple',
        supportEmail: 'soporte@simpleplataforma.app',
    });
}

export function getAgendaEmailBrand(origin = 'https://simpleagenda.app'): EmailBrandProfile {
    return enrichBrand('simpleagenda', origin, {
        surface: '#0f766e',
        onSurface: 'rgba(255,255,255,0.9)',
        tagline: 'Agenda profesional sin fricción',
        supportLabel: 'SimpleAgenda',
        supportEmail: 'hola@simpleplataforma.app',
    });
}
