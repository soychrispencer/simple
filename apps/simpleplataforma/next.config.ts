import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui', '@simple/utils'],
};

export default nextConfig;
