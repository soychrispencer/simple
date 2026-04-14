import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui'],
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
