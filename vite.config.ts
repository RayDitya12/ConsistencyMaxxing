import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// HTTPS=1 npm run preview -- --host  ->  kamera + OPFS bisa diuji dari HP, karena
// http://<ip-laptop> bukan secure context dan kedua API itu diblokir di sana.
const https = process.env.HTTPS === '1'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(https ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/app-icon.svg'],
      manifest: {
        id: '/',
        name: 'ConsistencyMaxxing',
        short_name: 'Consistency',
        description:
          'Catat konsistensi terhadap rencanamu sendiri. Satu foto per hari sebagai bukti.',
        lang: 'id',
        dir: 'ltr',
        display: 'standalone',
        orientation: 'any',
        background_color: '#F2F2F0',
        theme_color: '#F2F2F0',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          {
            src: '/icons/app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
  },
})
