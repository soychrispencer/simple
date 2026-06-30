import type { NextConfig } from 'next';

const apiBackendUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
    output: 'standalone',
    transpilePackages: ['@simple/types', '@simple/config', '@simple/utils', '@simple/ui', '@simple/auth', '@simple/marketplace-header'],
    experimental: {
        optimizePackageImports: ['@tabler/icons-react', '@simple/ui', '@simple/auth'],
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
