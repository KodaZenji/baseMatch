import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Move to top-level (removed from experimental)
  serverExternalPackages: ['pino', 'thread-stream', 'pino-pretty'],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // Tell Next.js to use webpack instead of Turbopack
  turbopack: undefined,
};

export default nextConfig;