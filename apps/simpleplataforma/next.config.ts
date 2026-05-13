import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    transpilePackages: ['@simple/types', '@simple/config', '@simple/ui', '@simple/utils'],
};

export default nextConfig;
