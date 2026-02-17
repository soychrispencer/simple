import type { NextConfig } from "next";

const SUPABASE_PROJECT = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") || "";
const transpiledPackages = [
  "@simple/ui",
  "@simple/panel",
  "@simple/auth",
  "@simple/listings",
  "@simple/shared-types",
  "@simple/config",
];

const nextConfig: NextConfig = {
  reactStrictMode: false,
  transpilePackages: transpiledPackages,
  compress: true,
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/panel", destination: "/resumen", permanent: false }
    ];
  },
  async rewrites() {
    return [
      { source: "/resumen", destination: "/panel" }
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.supabase.co",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com data:",
              "img-src 'self' data: https: *.supabase.co",
              "connect-src 'self' *.supabase.co wss://*.supabase.co",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join("; ")
          }
        ]
      }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_PROJECT,
        pathname: "/storage/v1/object/public/**"
      }
    ]
  }
};

export default nextConfig;
