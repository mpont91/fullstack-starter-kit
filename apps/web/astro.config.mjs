// @ts-check
import { defineConfig, envField } from 'astro/config'
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

  // Every variable the app reads, declared once. A missing or malformed one
  // stops the build with its name, instead of shipping a site whose requests
  // all fail. The code imports them from `astro:env/client`. WEB_PORT isn't
  // here: the config reads it, and Astro validates `server.port` itself.
  env: {
    schema: {
      PUBLIC_API_URL: envField.string({
        context: 'client',
        access: 'public',
        url: true,
      }),
      // Optional: without it nothing is reported.
      PUBLIC_SENTRY_DSN: envField.string({
        context: 'client',
        access: 'public',
        url: true,
        optional: true,
      }),
    },
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
