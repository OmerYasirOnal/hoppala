import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    target: 'es2022',
    modulePreload: false,
    manifest: true, // emits dist/.vite/manifest.json for the size guard's static-closure walk
    rollupOptions: {
      output: {
        manualChunks(id) {
          // One lazy 'firebase' chunk: the vendor SDK, its `idb` dependency (only firebase uses it),
          // and our adapter. `tslib` is intentionally NOT forced here — it is shared with the native
          // capacitor chunk, and coupling them would pull firebase into the native path.
          if (
            id.includes('node_modules/firebase') ||
            id.includes('node_modules/@firebase') ||
            id.includes('node_modules/idb')
          ) return 'firebase';
          if (id.includes('/src/online/firebase')) return 'firebase';
          return undefined;
        },
      },
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        // Never precache the Firebase chunk — it must stay lazy and out of the install payload.
        globIgnores: ['**/firebase-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/firebase-') && url.pathname.endsWith('.js'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'firebase-chunk' },
          },
          {
            urlPattern: ({ url }) => url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('firebaseio.com'),
            handler: 'NetworkFirst',
            options: { cacheName: 'firebase-api', networkTimeoutSeconds: 5 },
          },
        ],
      },
      manifest: {
        name: 'Hoppala',
        short_name: 'Hoppala',
        description: 'Endless vertical jumper — drag to steer, climb the sky.',
        theme_color: '#0b1220',
        background_color: '#0b1220',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
