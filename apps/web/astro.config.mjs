// @ts-check
import { defineConfig } from 'astro/config'
import { loadEnv } from 'vite'

import tailwindcss from '@tailwindcss/vite'

import vue from '@astrojs/vue'

const { WEB_PORT } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
)

// https://astro.build/config
export default defineConfig({
  server: {
    port: Number(WEB_PORT ?? 4321),
  },

  // English keeps the bare paths; Spanish lives under /es. Pages are written
  // once, in src/pages/[...lang], and built for both.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [vue({ appEntrypoint: '/src/monitoring/vue-app' })],
})
