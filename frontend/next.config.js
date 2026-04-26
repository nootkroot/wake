/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a minimal /app/.next/standalone tree the Docker image ships
  // without node_modules. Safe (and harmless) outside Docker too.
  output: "standalone",
  experimental: { typedRoutes: false },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "api.mapbox.com" },
    ],
  },
};

module.exports = nextConfig;
