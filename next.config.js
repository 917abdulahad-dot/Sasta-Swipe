/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js to NOT bundle playwright — it needs to run as native Node.js
  serverExternalPackages: ["playwright", "playwright-core"],

  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
