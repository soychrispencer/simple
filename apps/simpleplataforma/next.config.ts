import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    output: 'standalone',
    outputFileTracingRoot: path.join(process.cwd(), '../..'),
    transpilePackages: ['@simple/types', '@simple/ui', '@simple/utils', '@simple/auth'],
    experimental: {
        optimizePackageImports: ['@tabler/icons-react', '@simple/ui', '@simple/auth'],
    },
};

export default nextConfig;
