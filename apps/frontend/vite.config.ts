import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      // Web Push needs a live service worker, so the old self-destroying kill
      // switch is gone. The stale-build ("FINK") problem came from Workbox
      // precaching, NOT from having a SW: src/sw.ts registers no fetch handler
      // and creates no caches (injectionPoint: undefined skips the precache
      // manifest entirely), so every load still goes straight to the network.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      manifest: {
        name: 'TodoAPP',
        short_name: 'TodoAPP',
        theme_color: '#0b0f17',
        background_color: '#0b0f17',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/logo/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia', '@vueuse/core'],
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Em container, `--host` sozinho nao basta: o Vite recusa Host que nao seja
    // localhost e responde "Blocked request". O acesso em dev vem da LAN ou do
    // Tailscale, entao os dois precisam estar ligados.
    host: true,
    allowedHosts: true,
    // Em producao o nginx do proprio front encaminha /api ao backend; em dev
    // nao ha nginx. Rodando na maquina o alvo e localhost, rodando em container
    // e o alias do backend na awl_network — dai a variavel, definida no
    // docker-compose.dev.yml.
    proxy: { '/api': process.env.DEV_API_TARGET || 'http://localhost:3000' },
  },
});
