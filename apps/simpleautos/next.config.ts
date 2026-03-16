import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    transpilePackages: ['@simple/types', '@simple/config', '@simple/utils', '@simple/ui'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
    },
};

export default nextConfig;
