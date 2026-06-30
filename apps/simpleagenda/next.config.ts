import type { NextConfig } from 'next';
import path from 'path';

// Server-only URL for the API backend — used by rewrites (proxy) and SSR fetches.
// In production set API_INTERNAL_URL=https://api.simpleplataforma.app in Coolify.
// NEXT_PUBLIC_API_URL should be empty so client-side code uses same-origin requests
// that go through the rewrite proxy (avoids cross-site cookie issues).
const apiBackendUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui', '@simple/utils', '@simple/auth', '@simple/marketplace-header'],
    experimental: {
        optimizePackageImports: ['@tabler/icons-react', '@simple/ui', '@simple/auth'],
    },
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'http', hostname: '127.0.0.1' },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${apiBackendUrl}/api/:path*`,
            },
            {
                source: '/uploads/:path*',
                destination: `${apiBackendUrl}/uploads/:path*`,
            },
        ];
    },
    async redirects() {
        return [
            { source: '/panel/mi-negocio/contacto', destination: '/panel/mi-negocio', permanent: true },
            { source: '/panel/mi-negocio/cobros', destination: '/panel/mi-negocio/configuraciones', permanent: true },
            { source: '/panel/mi-negocio/disponibilidad', destination: '/panel/mi-negocio/horarios', permanent: true },
        ];
    },
};

export default nextConfig;
