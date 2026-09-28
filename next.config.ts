import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker runtime image.
  output: "standalone",
  images: {
    // Coach photos are admin-supplied URLs from any HTTPS host.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
