import type { NextConfig } from 'next';
const nextConfig: NextConfig = { transpilePackages: ['@simple/types', '@simple/config', '@simple/utils', '@simple/ui', '@simple/auth'] };
export default nextConfig;
