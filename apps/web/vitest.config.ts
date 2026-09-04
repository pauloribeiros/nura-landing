import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Domain logic and content rules. Nothing here touches React or the DOM:
    // scoring has to be runnable on the server, and the copy checks are static.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // `server-only` existe para quebrar o BUILD quando um modulo de servidor
      // e importado por um componente de cliente. Fora do bundler do Next ele
      // so lanca, e a regra que ele protege ja foi verificada na compilacao —
      // entao aqui ele vira um modulo vazio, para que a logica de servidor
      // possa ser testada como qualquer outra.
      'server-only': path.resolve(import.meta.dirname, 'src/test/server-only.ts'),
    },
  },
});
