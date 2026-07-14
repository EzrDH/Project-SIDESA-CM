import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Resolve @sidesa/crypto to its TypeScript source (no dist build needed for tests).
const cryptoSrc = fileURLToPath(new URL('../crypto/src/index.ts', import.meta.url));

export default defineConfig({
  test: { include: ['test/**/*.test.ts'], globals: true, root: './', setupFiles: ['./vitest.setup.ts'] },
  plugins: [swc.vite()],
  resolve: { alias: { '@sidesa/crypto': cryptoSrc } },
});
