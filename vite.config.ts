import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.png'],
      manifest: {
        name: 'NoteTag',
        short_name: 'NoteTag',
        description: 'I tuoi appunti veloci e sincronizzati su GitHub in background.',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'logo.png',
            sizes: '192x192 512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'favicon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ],
        shortcuts: [
          {
            name: 'Nuova Nota',
            short_name: 'Nuova',
            description: 'Crea subito una nuova nota',
            url: '/',
            icons: [{ src: 'logo.png', sizes: '192x192' }]
          }
        ]
      }
    })
  ],
})
