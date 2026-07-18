import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Resolve @sidesa/crypto to its TypeScript source (no dist build needed for tests).
const cryptoSrc = fileURLToPath(new URL('../crypto/src/index.ts', import.meta.url));

export default defineConfig({
  // e2e/integration tests share one Postgres, so run files serially to avoid
  // cross-file races (e.g. concurrent registry.approve colliding on leafIndex).
  test: { include: ['test/**/*.test.ts'], globals: true, root: './', setupFiles: ['./vitest.setup.ts'], fileParallelism: false },
  plugins: [swc.vite()],
  resolve: { alias: { '@sidesa/crypto': cryptoSrc } },
});
