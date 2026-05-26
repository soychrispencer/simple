import type { NextConfig } from 'next';
import path from 'path';

// API_INTERNAL_URL: proxy /api/* y SSR. NEXT_PUBLIC_API_URL vacío en cliente → same-origin (cookies).
const apiBackendUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui', '@simple/utils', '@simple/auth', '@simple/marketplace-header'],
    async redirects() {
        return [
            {
                source: '/panel/grupos',
                destination: '/mariachis',
                permanent: false,
            },
            {
                source: '/panel/contratar',
                destination: '/mariachis',
                permanent: false,
            },
            {
                source: '/panel/mariachis',
                destination: '/mariachis',
                permanent: false,
            },
            {
                source: '/mariachis/guardados',
                destination: '/panel/guardados',
                permanent: false,
            },
        ];
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
};

export default nextConfig;
