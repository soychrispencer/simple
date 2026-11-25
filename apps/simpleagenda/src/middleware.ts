import { NextResponse, type NextRequest } from 'next/server';

const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

function getPrimaryHost(): string {
    const raw = process.env.NEXT_PUBLIC_APP_URL ?? 'https://simpleagenda.app';
    return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/:\d+$/, '').trim().toLowerCase();
}

function isPrimaryOrLocalHost(host: string): boolean {
    if (!host) return true;
    const primary = getPrimaryHost();
    return (
        host === 'localhost'
        || host === '127.0.0.1'
        || host === primary
        || host === `www.${primary}`
        || host === 'simpleagenda.app'
        || host === 'www.simpleagenda.app'
        || host.endsWith('.simpleagenda.app')
        || host.endsWith('.simpleplataforma.app')
    );
}

function isBypassPath(pathname: string): boolean {
    if (
        pathname.startsWith('/_next')
        || pathname.startsWith('/api')
        || pathname.startsWith('/uploads')
        || pathname.startsWith('/cancelar')
        || pathname.startsWith('/nps')
        || pathname === '/favicon.ico'
        || pathname === '/icon'
        || pathname === '/apple-icon'
        || pathname === '/robots.txt'
        || pathname === '/sitemap.xml'
        || pathname === '/manifest.webmanifest'
    ) {
        return true;
    }
    return /\.[a-z0-9]{1,8}$/i.test(pathname);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (isBypassPath(pathname)) {
        return NextResponse.next();
    }

    const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const host = rawHost.split(',')[0]?.trim().toLowerCase().replace(/:\d+$/, '').replace(/\.+$/, '') ?? '';
    if (isPrimaryOrLocalHost(host)) {
        return NextResponse.next();
    }

    try {
        const res = await fetch(`${API_BASE}/api/public/agenda/by-domain?host=${encodeURIComponent(host)}`, {
            cache: 'no-store',
        });
        if (!res.ok) {
            return NextResponse.next();
        }
        const data = await res.json() as { ok?: boolean; slug?: string };
        if (!data.ok || !data.slug) {
            return NextResponse.next();
        }

        if (pathname === '/') {
            const rewriteUrl = request.nextUrl.clone();
            rewriteUrl.pathname = `/${data.slug}`;
            return NextResponse.rewrite(rewriteUrl);
        }
    } catch {
        // Fall through to normal routing if API lookup fails.
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
