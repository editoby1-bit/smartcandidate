/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverComponentsExternalPackages: ['bullmq', 'ioredis'] },
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  typescript: {
    // Allow production builds to complete even with type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to complete even with lint errors
    ignoreDuringBuilds: true,
  },
}
module.exports = nextConfig
