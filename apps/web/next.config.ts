import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three.js ships untranspiled ESM; keep it in the client bundle graph only.
  transpilePackages: ['three'],
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  // Testing on a phone means loading the dev server by LAN address, which Next
  // treats as a foreign origin for /_next/* assets. Today that is a warning;
  // in a future major it blocks, and a blocked chunk looks exactly like the
  // app being broken. Dev only — it has no effect on a build.
  allowedDevOrigins: ['192.168.1.4', '*.local'],
};

export default withNextIntl(nextConfig);
