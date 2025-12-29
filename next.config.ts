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
  // Enable source maps for GlitchTip error tracking (readable stack traces)
  productionBrowserSourceMaps: true,

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

const { withSentryConfig } = require("@sentry/nextjs");

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,

  org: "nextjs",
  project: "javascript-nextjs",

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Transpiles SDK to be compatible with IE11 (increases bundle size)
  transpileClientSDK: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // [DEPRECATED] These options cause warnings.
  // disableLogger: true,
  // automaticVercelMonitors: true,
});
