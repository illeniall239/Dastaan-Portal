import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // Compiler optimizations for better performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production" ? {
      exclude: ["error", "warn"],
    } : false,
  },

  // Turbopack configuration
  turbopack: {
    // Empty config to acknowledge we're using Turbopack
    // This silences the warning about webpack config
  },

  // Exclude problematic test files from thread-stream package
  serverExternalPackages: ['pino', 'thread-stream'],

  // Experimental features for performance
  experimental: {
    // Enable server actions optimization
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Optimize package imports
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts'],
  },

  // Production optimizations
  productionBrowserSourceMaps: false, // Faster builds

  // Bundle analyzer (comment out after use to speed up builds)
  // To use: npm install @next/bundle-analyzer --save-dev
  // Then uncomment and run: ANALYZE=true npm run build
  // webpack: (config, { isServer }) => {
  //   if (process.env.ANALYZE) {
  //     const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
  //     config.plugins.push(
  //       new BundleAnalyzerPlugin({
  //         analyzerMode: 'static',
  //         reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
  //       })
  //     );
  //   }
  //   return config;
  // },
};

export default nextConfig;
