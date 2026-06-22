import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [],
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8002',
        pathname: '/media/**',
      },
    ],
  },
  experimental: {
    // React Compiler (memoization) — enable when stable; currently opt-in experimental
    // reactCompiler: true,
  },
};

const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

export default withAnalyzer(nextConfig);

