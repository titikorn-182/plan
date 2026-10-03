import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    "/api/evidence/budget-adjustment": [
      "./public/branding/ubu-emblem.png",
      "./public/fonts/th-sarabun-new/*.ttf",
    ],
    "/api/projects/*/proposal": [
      "./node_modules/@openfonts/sarabun_all/files/sarabun-all-400.woff",
      "./node_modules/@openfonts/sarabun_all/files/sarabun-all-700.woff",
      "./public/branding/political-science-ubu.png",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2100kb",
    },
  },
};

export default nextConfig;
