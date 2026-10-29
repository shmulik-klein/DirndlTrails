import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces .next/standalone so the runtime image only ships the server and
  // the modules it actually uses.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
