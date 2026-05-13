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
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui', '@simple/utils', '@simple/auth'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${apiBackendUrl}/api/:path*`,
            },
        ];
    },
};

export default nextConfig;
