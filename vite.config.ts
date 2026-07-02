import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // modulePreload:false drops Vite's ~850B __vitePreload chunk-preloading wrapper from the
  // entry bundle; the native app is the only consumer of the dynamic capacitor.ts import and
  // it doesn't need preload hints, so this keeps the web bundle at its pre-native-bridge size.
  build: { target: 'es2022', modulePreload: false },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
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
