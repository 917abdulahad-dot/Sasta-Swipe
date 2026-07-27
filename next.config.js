/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js to NOT bundle playwright — it needs to run as native Node.js
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],

  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/playwright-core/browsers.json", "./node_modules/playwright-core/lib/**/*"],
  },

  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
