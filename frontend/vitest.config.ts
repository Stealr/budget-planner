import { mergeConfig, defineConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      env: { VITE_API_BASE_URL: 'http://localhost:3000/api' },
      restoreMocks: true,
    },
  }),
);
