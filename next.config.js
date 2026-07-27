/** @type {import('next').NextConfig} */
const nextConfig = {
  // playwright is still used in dev — keep it external so it's not bundled
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],

  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
