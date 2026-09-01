import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // GitHub Pages : /abel/ — domaine mimom.be (VPS) : VITE_BASE_PATH=/
  base: process.env.VITE_BASE_PATH || '/abel/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon-32.png', 'favicon-192.png', 'favicon.svg', 'logo.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mimom',
        short_name: 'Mimom',
        description:
          'Suivi du bébé : tétées, couches, biberons, tire-lait, croissance. Un appui, une donnée.',
        lang: 'fr',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#C45C4A',
        background_color: '#F6F1EA',
        start_url: './',
        scope: './',
        categories: ['lifestyle', 'health'],
        icons: [
          { src: 'favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'logo.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json,webmanifest,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/api/') ||
              url.hostname === 'accounts.google.com' ||
              url.hostname.endsWith('.google.com') ||
              url.hostname.endsWith('.gstatic.com') ||
              url.hostname.endsWith('.googleapis.com'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
