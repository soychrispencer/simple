import type { NextConfig } from "next";

const SUPABASE_PROJECT = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '') || '';

const nextConfig: NextConfig = {
  // Permite que el build continúe aunque existan errores de ESLint
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Desactivar React StrictMode temporalmente para debug multi-tab
  reactStrictMode: false,
  // Habilitar compresión
  compress: true,
  // Remover header X-Powered-By
  poweredByHeader: false,
  // Headers de seguridad
  async headers() {
    return [
      {
        // Aplicar a todas las rutas
        source: '/(.*)',
        headers: [
          // Prevenir clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Prevenir MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer Policy
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions Policy (restringir APIs sensibles)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          // HSTS (HTTP Strict Transport Security) - solo en producción
          ...(process.env.NODE_ENV === 'production' ? [
            { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }
          ] : []),
          // Content Security Policy básico
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel-analytics.com *.supabase.co",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com data:",
              "img-src 'self' data: https: *.supabase.co",
              "connect-src 'self' *.supabase.co *.vercel-analytics.com wss://*.supabase.co",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          }
        ]
      }
    ];
  },
  images: SUPABASE_PROJECT ? {
    remotePatterns: [
      { protocol: 'https', hostname: SUPABASE_PROJECT, pathname: '/storage/v1/object/public/**' }
    ]
  } : undefined
};

export default nextConfig;