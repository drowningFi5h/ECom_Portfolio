import type { NextConfig } from "next";
import path from "path";

// Turbopack dev server forwards requests with x-forwarded-host: localhost (no port),
// but the browser Origin header includes the port (localhost:3000). This one-character
// mismatch fails Next.js's built-in CSRF check for every Server Action POST in dev.
const devOrigins = process.env.NODE_ENV === 'development'
  ? ['localhost:3000', 'localhost:3001', '127.0.0.1:3000']
  : [];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverActions: {
    allowedOrigins: devOrigins,
  },
};

export default nextConfig;
