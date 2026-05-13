import type { NextConfig } from 'next';
import path from 'path';

const apiBackendUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui', '@simple/utils', '@simple/auth', '@simple/marketplace-header'],
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
