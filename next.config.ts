import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Turbopack strips the port from x-forwarded-host, causing a host mismatch
  // in Next.js's CSRF check for Server Actions in dev. This allowlist fixes it.
  allowedDevOrigins: ['localhost:3000', 'localhost:3001', '127.0.0.1:3000'],
};

export default nextConfig;
