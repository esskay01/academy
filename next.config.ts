import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runtime image.
  output: "standalone",
  images: {
    // Coach photos are admin-supplied URLs from any HTTPS host.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    serverActions: {
      // Photo uploads are capped at 2 MB (src/lib/media.ts) plus form fields.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
