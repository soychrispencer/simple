import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
};

export default nextConfig;
