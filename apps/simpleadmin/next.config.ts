import type { NextConfig } from 'next';
const nextConfig: NextConfig = { transpilePackages: ['@simple/types', '@simple/config', '@simple/utils'] };
export default nextConfig;
