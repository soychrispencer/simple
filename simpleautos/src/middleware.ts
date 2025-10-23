import { NextRequest, NextResponse } from 'next/server';

// Rate limiting simple (en producción usar Redis o similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX = 100; // 100 requests por minuto

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const userData = rateLimitMap.get(ip);

  if (!userData || now > userData.resetTime) {
    // Reset o primera vez
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }

  if (userData.count >= RATE_LIMIT_MAX) {
    return true;
  }

  userData.count++;
  return false;
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Obtener IP del cliente
  const ip = req.headers.get('x-forwarded-for') ||
             req.headers.get('x-real-ip') ||
             'unknown';

  // Rate limiting para APIs
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (isRateLimited(ip)) {
      return new NextResponse(JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      });
    }
  }

  // Configurar CORS para permitir credenciales
  res.headers.set('Access-Control-Allow-Origin', req.headers.get('origin') || '*');
  res.headers.set('Access-Control-Allow-Credentials', 'true');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return res;
}

export const config = {
  matcher: '/api/:path*',
};
