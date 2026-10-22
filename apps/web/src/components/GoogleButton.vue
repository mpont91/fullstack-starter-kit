<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { GOOGLE_CLIENT_ID } from '../constants'
import { useLanguage, useTranslations } from '../i18n/vue'
import Skeleton from './ui/Skeleton.vue'

// Google's own button, from Google Identity Services. It hands back an ID
// token, which goes to the API untouched: the API verifies it, never the web.

interface Props {
  text?: 'signin_with' | 'signup_with' | 'continue_with'
}

const { text = 'continue_with' } = defineProps<Props>()

const emit = defineEmits<{ credential: [credential: string] }>()

const lang = useLanguage()
const t = useTranslations()

const container = ref<HTMLElement>()
const unavailable = ref(false)
const isLoading = ref(true)

onMounted(async () => {
  try {
    const google = await loadGoogleIdentity()
    // One button per page, so the global callback is always this one's.
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: ({ credential }) => emit('credential', credential),
    })
    if (container.value) {
      google.accounts.id.renderButton(container.value, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text,
        locale: lang,
        width: Math.min(container.value.offsetWidth, 400),
      })
    }
  } catch {
    // Blocked (an ad blocker, a strict network) or Google is down: say so,
    // rather than leave an empty gap where the button should be.
    unavailable.value = true
  } finally {
    isLoading.value = false
  }
})
</script>

<script lang="ts">
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(options: {
        client_id: string
        callback: (response: { credential: string }) => void
      }): void
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleIdentity
  }
}

let loading: Promise<GoogleIdentity> | undefined

// Loaded on demand, once per page, and only where a button is shown.
function loadGoogleIdentity(): Promise<GoogleIdentity> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () =>
      window.google ? resolve(window.google) : reject(new Error('No GIS'))
    script.onerror = () => {
      loading = undefined
      reject(new Error('Google Identity Services failed to load'))
    }
    document.head.append(script)
  })
  return loading
}
</script>

<template>
  <div class="relative">
    <!-- Stands in for the button until Google's script has drawn it. -->
    <Skeleton
      v-if="isLoading"
      class="absolute inset-x-0 top-0 mx-auto h-10 max-w-[400px] rounded-full"
    />
    <!-- Google's iframe paints an opaque white box behind the button on a
         page whose color scheme differs from its own; the site is dark. -->
    <div
      v-show="!unavailable"
      ref="container"
      class="flex min-h-10 justify-center [color-scheme:light]"
    />
    <p v-if="unavailable" class="text-center text-sm text-muted">
      {{ t('google.unavailable') }}
    </p>
  </div>
</template>
