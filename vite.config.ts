import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // GitHub Pages : /abel/ — domaine mimom.be (VPS) : VITE_BASE_PATH=/
  base: process.env.VITE_BASE_PATH || '/abel/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
