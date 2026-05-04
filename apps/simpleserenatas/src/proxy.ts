import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = [
    '/',
    '/auth/login',
    '/auth/registro',
    '/auth/recuperar',
    '/auth/restablecer',
    '/auth/verificar-correo',
    '/auth/confirmar-correo',
    '/api',
    '/_next',        // Next.js static files (JS, CSS, chunks)
    '/manifest',     // PWA manifest
    '/icon',         // Favicon
    '/apple-icon',   // Apple touch icon
    '/favicon',      // Favicon fallback
    '/robots.txt',   // SEO
    '/sitemap',      // SEO
];

// File extensions that should always be public
const publicExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.ico', '.json', '.webmanifest'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if path is public
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Check if file extension is public
  const hasPublicExtension = publicExtensions.some(ext => pathname.endsWith(ext));
  if (hasPublicExtension) {
    return NextResponse.next();
  }

  // Check for auth cookie (backend uses 'simple_session')
  const authCookie = request.cookies.get('simple_session') || request.cookies.get('session') || request.cookies.get('auth');
  
  if (!authCookie) {
    // Redirect to login if not authenticated
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const proxyConfig = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest|manifest\.webmanifest|robots\.txt|sitemap|.*\.js|.*\.css|.*\.png|.*\.jpg|.*\.jpeg|.*\.gif|.*\.svg|.*\.woff|.*\.woff2|.*\.ttf|.*\.ico|.*\.json|.*\.webmanifest).*)',
    ],
};
