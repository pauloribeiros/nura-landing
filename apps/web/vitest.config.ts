import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Domain logic only. Nothing here touches React or the DOM, which is the
    // point: scoring has to be runnable on the server.
    include: ['src/domain/**/*.test.ts'],
    environment: 'node',
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
