import type { NextConfig } from 'next';
import path from 'path';

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
                source: '/api/public/:path*',
                destination: `${apiBackendUrl}/api/public/:path*`,
            },
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
            { source: '/panel/mi-negocio/redes', destination: '/panel/mi-negocio', permanent: true },
            { source: '/panel/mi-negocio/cobros', destination: '/panel/mi-negocio/configuraciones', permanent: true },
            { source: '/panel/mi-negocio/integraciones', destination: '/panel/mi-cuenta/integraciones', permanent: true },
        ];
    },
};

export default nextConfig;
