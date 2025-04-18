/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        missingSuspenseWithCSRBailout: false,
      },    
    typescript: {
      ignoreBuildErrors: true, //  This skips TypeScript errors during build
    },
    eslint: {
      ignoreDuringBuilds: true, // This skips ESLint errors during build
    },
  };
  
  module.exports = nextConfig;