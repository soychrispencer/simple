import type { NextConfig } from "next";
import path from "node:path";

function getHostname(value: string | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).hostname;
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

const SIMPLE_API_HOST = getHostname(process.env.NEXT_PUBLIC_SIMPLE_API_BASE_URL);
const STORAGE_HOST = getHostname(process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL);
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com data:",
              "img-src 'self' data: https:",
              `connect-src 'self'${SIMPLE_API_HOST ? ` https://${SIMPLE_API_HOST}` : ""}`,
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
  images:
    STORAGE_HOST || SIMPLE_API_HOST
      ? {
          remotePatterns: [
            ...(STORAGE_HOST
              ? [{ protocol: "https" as const, hostname: STORAGE_HOST, pathname: "/**" }]
              : []),
            ...(SIMPLE_API_HOST
              ? [{ protocol: "https" as const, hostname: SIMPLE_API_HOST, pathname: "/**" }]
              : [])
          ]
        }
      : undefined,
};

export default nextConfig;
