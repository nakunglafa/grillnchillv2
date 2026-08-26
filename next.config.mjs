import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Parent /www/wwwroot/grillnchill.pt also has a lockfile; pin this app as root
  // so Turbopack does not prerender against the wrong Next.js copy.
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
  // Low-CPU hosts (5 workers) hit a Next 16 race on /_global-error; retry helps.
  experimental: {
    staticGenerationRetryCount: 3,
    staticGenerationMaxConcurrency: 2,
  },
  trailingSlash: false,
  async redirects() {
    return [
      {
        source: "/page-sitemap.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/post-sitemap.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/sitemap_index.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
      {
        source: "/category-sitemap.xml",
        destination: "/sitemap.xml",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
