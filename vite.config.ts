import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { maximumFileSizeToCacheInBytes: 30 * 1024 * 1024 },
      manifest: {
        name: 'CalmStudy', short_name: 'CalmStudy', display: 'standalone',
        background_color: '#12201f', theme_color: '#12201f', start_url: '/',
        // TODO: add 192/512 PNG icons (public/icon-192.png, icon-512.png) for Android install prompts.
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
})
