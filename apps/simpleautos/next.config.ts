import type { NextConfig } from "next";
import path from "node:path";

const SUPABASE_PROJECT = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '') || '';
const transpiledPackages = [
  "@simple/ui",
  "@simple/panel",
  "@simple/auth",
  "@simple/listings",
  "@simple/shared-types",
  "@simple/config",
  "@simple/instagram",
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Desactivar React StrictMode temporalmente para debug multi-tab
  reactStrictMode: false,
  transpilePackages: transpiledPackages,
  // Habilitar compresión
  compress: true,
  // Remover header X-Powered-By
  poweredByHeader: false,
  async redirects() {
    return [
      { source: '/panel', destination: '/resumen', permanent: false },
      { source: '/panel/perfil', destination: '/panel/mi-perfil', permanent: true },
      { source: '/panel/empresa', destination: '/panel/mi-negocio', permanent: true },
      { source: '/panel/pagina', destination: '/panel/mi-pagina', permanent: true },
      { source: '/panel/suscripcion', destination: '/panel/mis-suscripciones', permanent: true },
      { source: '/panel/nueva-publicacion', destination: '/panel/publicar-vehiculo?new=1', permanent: true },
      { source: '/panel/publicaciones', destination: '/panel/mis-publicaciones', permanent: true },
      { source: '/panel/mensajes', destination: '/panel/mis-mensajes', permanent: true },
      { source: '/panel/favoritos', destination: '/panel/guardados', permanent: true },
      { source: '/panel/marketplaces', destination: '/panel/configuraciones', permanent: true },
      { source: '/panel/planes', destination: '/panel/mis-suscripciones', permanent: true },
      { source: '/panel/facturacion', destination: '/panel/mis-suscripciones', permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: '/resumen', destination: '/panel' },
    ];
  },
  // Headers de seguridad
  async headers() {
    return [
      {
        // Aplicar a rutas públicas (excluye `_next` y `api` para no interferir
        // con assets estáticos y endpoints API que deben mantener su propio
        // Content-Type). Esto evita sobrescribir `Content-Type` de CSS/JS.
        source: '/((?!_next/|api/).*)',
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: *.supabase.co",
              "connect-src 'self' *.supabase.co wss://*.supabase.co",
              "frame-src 'self' https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
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
