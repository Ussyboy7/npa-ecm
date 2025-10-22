/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: [],
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost:4646', '172.16.0.46:4646'],
    },
  },
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  env: {
    PORT: process.env.PORT || '3001',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  },

  // Performance optimizations
  swcMinify: true,
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Bundle analysis in development
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config: any) => {
      if (process.env.NODE_ENV === 'production') {
        // Add bundle analyzer
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),

  // Code splitting
  webpack: (config: any) => {
    // Split chunks for better caching
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        chartjs: {
          test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
          name: 'chartjs',
          chunks: 'all',
        },
      },
    };

    return config;
  },

  async rewrites() {
    return []
  },

  ...(process.env.NODE_ENV === 'production' && {
    compress: true,
    poweredByHeader: false,
  }),
};

export default nextConfig;







