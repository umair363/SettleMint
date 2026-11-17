import type { NextConfig } from "next";

// The app ships as static files (output: "export") so it can be hosted for
// free on any static host. The build fails if a page uses anything that needs
// a server per request (proxy, server actions, cookies, dynamic routes
// without generateStaticParams). Entity pages therefore take ids as query
// parameters, e.g. /group?id=...
const nextConfig: NextConfig = {
  output: "export",
  reactCompiler: true,
  images: { unoptimized: true },
  transpilePackages: ["@settlemint/shared", "@settlemint/client"],
};

export default nextConfig;
