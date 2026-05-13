import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui', '@simple/utils', '@simple/auth', '@simple/marketplace-header', '@simple/listings-core'],
    images: {
        remotePatterns: [{ protocol: 'https', hostname: '**' }],
        unoptimized: true,
    },
};

export default nextConfig;
