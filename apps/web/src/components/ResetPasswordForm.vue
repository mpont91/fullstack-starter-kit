<script setup lang="ts">
import { PASSWORD_MIN_LENGTH } from '@app/shared'
import { onMounted, ref } from 'vue'
import { KeyRound } from 'lucide-vue-next'
import { provideLanguage, useLocalizePath, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { getPasswordResetEmail, resetPassword } from '../services/auth.service'
import { ApiError } from '../services/api-client'
import { APP_HOME } from '../helpers/app-path-helper'
import Button from './ui/Button.vue'
import Card from './ui/Card.vue'
import Skeleton from './ui/Skeleton.vue'

interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)
const path = useLocalizePath(lang)

const token = ref('')
const email = ref('')
const loadingEmail = ref(true)
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const submitting = ref(false)

onMounted(async () => {
  token.value = new URLSearchParams(window.location.search).get('token') ?? ''
  if (!token.value) {
    error.value = t('resetPassword.error.invalidToken')
    loadingEmail.value = false
    return
  }

  try {
    email.value = await getPasswordResetEmail(token.value)
  } catch (e) {
    // Same failure as a bad token at submit time: invalid, expired or
    // already used. Fold it into the existing invalid-link screen rather
    // than showing a form that would only fail again on submit.
    error.value =
      e instanceof ApiError && e.status === 400
        ? t('resetPassword.error.invalidToken')
        : t('resetPassword.serverError')
    token.value = ''
  } finally {
    loadingEmail.value = false
  }
})

async function handleSubmit() {
  if (password.value.length < PASSWORD_MIN_LENGTH) {
    error.value = t('resetPassword.error.passwordTooShort')
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = t('resetPassword.error.passwordMismatch')
    return
  }

  error.value = ''
  submitting.value = true
  try {
    await resetPassword(token.value, password.value)
    window.location.assign(path(APP_HOME))
  } catch (e) {
    // A 400 here specifically means the token is invalid/expired/used — the
    // only 4xx this endpoint returns. Anything else is on us.
    error.value =
      e instanceof ApiError && e.status === 400
        ? t('resetPassword.error.invalidToken')
        : t('resetPassword.serverError')
    submitting.value = false
  }
}
</script>

<template>
  <Card as="section" class="mx-auto w-full max-w-sm p-7">
    <div class="text-center">
      <h1 class="text-2xl font-bold tracking-tight">
        {{ t('resetPassword.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted">{{ t('resetPassword.subtitle') }}</p>
    </div>

    <div v-if="loadingEmail" class="mt-7 space-y-4">
      <div v-for="field in 3" :key="field" class="space-y-1.5">
        <Skeleton class="h-4 w-32" />
        <Skeleton class="h-10 w-full rounded-lg" />
      </div>
      <Skeleton class="h-10 w-full rounded-lg" />
    </div>

    <form
      v-else-if="token"
      class="mt-7 space-y-4"
      @submit.prevent="handleSubmit"
    >
      <div class="space-y-1.5">
        <label for="email" class="text-sm font-medium">
          {{ t('resetPassword.email') }}
        </label>
        <input
          id="email"
          :value="email"
          type="email"
          disabled
          class="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-muted"
        />
      </div>

      <div class="space-y-1.5">
        <label for="password" class="text-sm font-medium">
          {{ t('resetPassword.password') }}
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
          :minlength="PASSWORD_MIN_LENGTH"
          :placeholder="t('resetPassword.password.placeholder')"
          class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <div class="space-y-1.5">
        <label for="confirmPassword" class="text-sm font-medium">
          {{ t('resetPassword.confirmPassword') }}
        </label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          required
          :placeholder="t('resetPassword.confirmPassword.placeholder')"
          class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <p v-if="error" class="text-sm text-danger-400">{{ error }}</p>

      <Button type="submit" :disabled="submitting" class="w-full">
        <KeyRound class="size-4" />
        {{
          submitting ? t('resetPassword.submitting') : t('resetPassword.submit')
        }}
      </Button>
    </form>

    <template v-else>
      <p class="mt-7 text-center text-sm text-danger-400">{{ error }}</p>
      <p class="mt-6 text-center text-sm text-muted">
        <a
          :href="path('/forgot-password')"
          class="font-medium text-primary-400 hover:text-primary-300"
        >
          {{ t('resetPassword.requestNewLink') }}
        </a>
      </p>
    </template>
  </Card>
</template>
