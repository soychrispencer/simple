import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    transpilePackages: ['@simple/types', '@simple/config', '@simple/utils', '@simple/ui', '@simple/auth', '@simple/marketplace-header'],
};

export default nextConfig;
