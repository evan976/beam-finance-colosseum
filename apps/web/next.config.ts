import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@beam/ui'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    instantInsights: {
      validationLevel: 'manual-warning',
    },
  },
}

export default nextConfig
