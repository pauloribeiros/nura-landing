import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

/**
 * Replaces %SITE_URL% in index.html so canonical, og:url, og:image and JSON-LD
 * carry absolute URLs. Set SITE_URL to the production origin (no trailing
 * slash) at build time; when unset the tags fall back to site-relative URLs,
 * which are valid but weaker for crawlers and social previews.
 */
function siteUrlPlugin() {
  const siteUrl = (process.env.SITE_URL ?? '').replace(/\/$/, '');

  // One entry per indexable route. Assessment landings join this list as they
  // ship — keep it derived from the content module once that exists.
  const routes = ['/'];

  return {
    name: 'nura-site-url',
    transformIndexHtml(html: string) {
      if (!siteUrl && process.env.NODE_ENV === 'production') {
        console.warn(
          '[nura] SITE_URL is not set — canonical, og:url and og:image will be site-relative.',
        );
      }
      return html.replaceAll('%SITE_URL%', siteUrl);
    },
    generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
      const urls = routes
        .map((route) => `  <url>\n    <loc>${siteUrl}${route}</loc>\n  </url>`)
        .join('\n');

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source:
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          `${urls}\n</urlset>\n`,
      });

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      });
    },
  };
}

// The Replit artifact runner provides PORT and BASE_PATH. Local runs fall back
// to sane defaults so `pnpm dev` works outside Replit without extra setup.
const DEFAULT_PORT = 5173;

const rawPort = process.env.PORT ?? String(DEFAULT_PORT);
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    siteUrlPlugin(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
