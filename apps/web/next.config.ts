import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs/config';

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

/**
 * O Sentry entra por fora de tudo.
 *
 * SOURCEMAP: sem `SENTRY_AUTH_TOKEN` nao ha upload, e um stack trace do
 * navegador chega minificado — legivel a duras penas, mas chega. Por o token na
 * Vercel liga o upload sozinho no proximo build. Nao deixar isso obrigatorio e
 * proposital: uma variavel faltando NAO pode derrubar um deploy por causa de
 * monitoramento.
 *
 * Org e projeto ficam escritos aqui em vez de virarem variavel de ambiente
 * porque nao sao segredo, nao mudam, e cada variavel a mais e mais uma chance
 * de o upload falhar em silencio por causa de um nome errado. O segredo e um
 * so, e e o token.
 *
 * Os arquivos .map sao apagados depois do upload — e o padrao do plugin, e o
 * certo: servir sourcemap publicamente entrega o codigo-fonte inteiro do
 * cliente, comentarios inclusive.
 *
 * `silent` fora de CI porque, sem token, o plugin avisa a cada build local que
 * nao vai subir mapa — um aviso correto que ninguem precisa ler cem vezes.
 */
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG || 'aec-az',
  project: process.env.SENTRY_PROJECT || 'nura-web',
  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Tira do bundle o logger interno do SDK, que so serve para depurar o Sentry.
  webpack: { treeshake: { removeDebugLogging: true } },
  telemetry: false,
});
