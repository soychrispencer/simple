import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui'],
    images: {
        remotePatterns: [{ protocol: 'https', hostname: '**' }],
    },
    async rewrites() {
        return [
            {
                source: '/api/public/:path*',
                destination: 'http://localhost:4000/api/public/:path*',
            },
            {
                source: '/api/:path*',
                destination: 'http://localhost:4000/api/:path*',
            },
        ];
    },
};

export default nextConfig;
