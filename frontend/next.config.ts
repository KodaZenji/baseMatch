import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Force compatibility for Next.js 16
  turbopack: {}, 
  
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },

  // 2. Critical Headers for Base App verification
  async headers() {
    return [
      {
        source: '/.well-known/farcaster.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },

  // Redirect short link to full whitelist page
async redirects() {
  return [
    {
      source: '/apply',
      destination: '/apply-whitelist',
      permanent: true,
    },
  ]
},

  // 3. Webpack Fallbacks (Used when you run next build --webpack)
  serverExternalPackages: ['pino', 'thread-stream', 'pino-pretty', 'lokijs', 'encoding'],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
