/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // Allow reading sibling /data dir from monorepo root at build time
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
};

export default nextConfig;
