/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  transpilePackages: ["@daily-news/shared"],
  // Allow reading sibling /data dir from monorepo root at build time
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  webpack: (config) => {
    // packages/shared は TS ソースを直接公開しており、内部で `./foo.js` 形式の
    // 再エクスポートを使う（NodeNext 準拠）。Next.js の webpack はデフォルトで
    // workspace の TS ソースに対し .js → .ts のフォールバックをしないので、
    // ここで明示的に extensionAlias を効かせる。
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
