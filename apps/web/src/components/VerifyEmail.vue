<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { provideLanguage, useLocalizePath, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { verifyEmail } from '../services/auth.service'
import { ApiError } from '../services/api-client'
import { localizePath, siteLanguageFromApi } from '../helpers/locale-helper'
import { APP_HOME } from '../helpers/app-path-helper'
import Card from './ui/Card.vue'
import Skeleton from './ui/Skeleton.vue'

interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)
const path = useLocalizePath(lang)

const error = ref('')

// The link logs the user in, so a good token goes straight to the dashboard —
// in their own language, which the API knows and this URL doesn't.
onMounted(async () => {
  const token = new URLSearchParams(window.location.search).get('token')
  if (!token) {
    error.value = t('verify.error.invalid')
    return
  }
  try {
    const user = await verifyEmail(token)
    window.location.replace(
      localizePath(APP_HOME, siteLanguageFromApi(user.language)),
    )
  } catch (e) {
    // 400 is the only rejection: invalid, expired or already used. A link
    // that was already used most likely means the account is confirmed, so
    // the way out is the login page either way.
    error.value =
      e instanceof ApiError && e.status === 400
        ? t('verify.error.invalid')
        : t('verify.serverError')
  }
})
</script>

<template>
  <Card as="section" class="mx-auto w-full max-w-sm space-y-4 p-7 text-center">
    <h1 class="text-2xl font-bold tracking-tight">{{ t('verify.title') }}</h1>
    <div v-if="!error" class="space-y-2">
      <Skeleton class="mx-auto h-4 w-48" />
      <Skeleton class="mx-auto h-4 w-32" />
      <span class="sr-only">{{ t('verify.checking') }}</span>
    </div>
    <template v-else>
      <p class="text-sm text-danger-400">{{ error }}</p>
      <a
        :href="path('/login')"
        class="inline-block text-sm font-medium text-primary-400 hover:text-primary-300"
      >
        {{ t('verify.toLogin') }}
      </a>
    </template>
  </Card>
</template>
