<script setup lang="ts">
import { ref } from 'vue'
import { LogIn } from 'lucide-vue-next'
import { provideLanguage, useLocalizePath, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { login } from '../services/auth.service'
import { ApiError } from '../services/api-client'
import { siteLanguageFromApi } from '../helpers/locale-helper'
import { afterLoginPath } from '../helpers/redirect-helper'
import Button from './ui/Button.vue'
import Card from './ui/Card.vue'
import ResendVerification from './ResendVerification.vue'
import GoogleSignIn from './GoogleSignIn.vue'

interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)
const path = useLocalizePath(lang)

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)
// The email that logged in with the right password but was never confirmed.
const unverifiedEmail = ref('')

async function handleSubmit() {
  error.value = ''
  unverifiedEmail.value = ''
  submitting.value = true
  try {
    const user = await login(email.value, password.value)
    window.location.assign(
      afterLoginPath(
        window.location.search,
        lang,
        siteLanguageFromApi(user.language),
      ),
    )
  } catch (e) {
    // 403 is the right password on an unconfirmed account, where resending
    // the link helps; 429 is the rate limit; any other 4xx is a credential
    // rejection; a 5xx or network failure is on us, not on the user.
    const status = e instanceof ApiError ? e.status : 0
    if (status === 403) {
      unverifiedEmail.value = email.value
      error.value = t('login.error.notVerified')
    } else if (status === 429) {
      error.value = t('login.error.tooMany')
    } else if (status >= 400 && status < 500) {
      error.value = t('login.error')
    } else {
      error.value = t('login.serverError')
    }
    submitting.value = false
  }
}
</script>

<template>
  <Card as="section" class="mx-auto w-full max-w-sm p-7">
    <div class="text-center">
      <h1 class="text-2xl font-bold tracking-tight">{{ t('login.title') }}</h1>
      <p class="mt-1 text-sm text-muted">{{ t('login.subtitle') }}</p>
    </div>

    <GoogleSignIn class="mt-7" text="signin_with" />

    <div class="my-6 flex items-center gap-3 text-xs text-muted uppercase">
      <span class="h-px flex-1 bg-border" />
      {{ t('auth.or') }}
      <span class="h-px flex-1 bg-border" />
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-1.5">
        <label for="email" class="text-sm font-medium">
          {{ t('login.email') }}
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          :placeholder="t('login.email.placeholder')"
          class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <div class="space-y-1.5">
        <div class="flex items-center justify-between">
          <label for="password" class="text-sm font-medium">
            {{ t('login.password') }}
          </label>
          <a
            :href="path('/forgot-password')"
            class="text-sm font-medium text-primary-400 hover:text-primary-300"
          >
            {{ t('login.forgotPassword') }}
          </a>
        </div>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          :placeholder="t('login.password.placeholder')"
          class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <p v-if="error" class="text-sm text-danger-400">{{ error }}</p>
      <ResendVerification v-if="unverifiedEmail" :email="unverifiedEmail" />

      <Button type="submit" :disabled="submitting" class="w-full">
        <LogIn class="size-4" />
        {{ submitting ? t('login.submitting') : t('login.submit') }}
      </Button>
    </form>

    <p class="mt-6 text-center text-sm text-muted">
      {{ t('login.noAccount') }}
      <a
        :href="path('/register')"
        class="font-medium text-primary-400 hover:text-primary-300"
      >
        {{ t('login.signup') }}
      </a>
    </p>
  </Card>
</template>
