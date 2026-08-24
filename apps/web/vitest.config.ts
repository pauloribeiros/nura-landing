import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    // Domain logic and content rules. Nothing here touches React or the DOM:
    // scoring has to be runnable on the server, and the copy checks are static.
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
});
