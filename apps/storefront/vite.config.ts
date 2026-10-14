import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_DEMO=1 builds a self-contained preview: relative paths, one script,
// images inlined, so the output can be opened as a single file.
const demo = process.env.VITE_DEMO === '1';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  ...(demo && {
    base: './',
    build: {
      assetsInlineLimit: 100_000_000,
      cssCodeSplit: false,
      rollupOptions: { output: { inlineDynamicImports: true } },
    },
  }),
});
