<script setup lang="ts">
import { PASSWORD_MIN_LENGTH } from '@app/shared'
import { ref } from 'vue'
import { MailCheck, UserPlus } from 'lucide-vue-next'
import { provideLanguage, useLocalizePath, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { register } from '../services/auth.service'
import { ApiError } from '../services/api-client'
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
const confirmPassword = ref('')
const error = ref('')
const submitting = ref(false)
// Set once the account exists: the form gives way to "check your inbox".
const sentTo = ref('')

async function handleSubmit() {
  if (password.value.length < PASSWORD_MIN_LENGTH) {
    error.value = t('register.error.passwordTooShort')
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = t('register.error.passwordMismatch')
    return
  }

  error.value = ''
  submitting.value = true
  try {
    sentTo.value = await register(email.value, password.value, lang)
  } catch (e) {
    // 409 and 429 have precise causes worth naming. Other 4xx means the
    // payload was refused; 5xx or a network failure is on us.
    const status = e instanceof ApiError ? e.status : 0
    if (status === 429) {
      error.value = t('register.error.tooMany')
    } else if (status === 409) {
      error.value = t('register.error.emailTaken')
    } else if (status >= 400 && status < 500) {
      error.value = t('register.error.invalid')
    } else {
      error.value = t('register.serverError')
    }
    submitting.value = false
  }
}
</script>

<template>
  <Card v-if="sentTo" as="section" class="mx-auto w-full max-w-sm p-7">
    <div class="space-y-3 text-center">
      <MailCheck class="mx-auto size-10 text-primary-400" />
      <h1 class="text-2xl font-bold tracking-tight">
        {{ t('register.sent.title') }}
      </h1>
      <p class="text-sm text-muted">
        {{ t('register.sent.body', { email: sentTo }) }}
      </p>
      <ResendVerification :email="sentTo" />
    </div>
  </Card>

  <Card v-else as="section" class="mx-auto w-full max-w-sm p-7">
    <div class="text-center">
      <h1 class="text-2xl font-bold tracking-tight">
        {{ t('register.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted">{{ t('register.subtitle') }}</p>
    </div>

    <GoogleSignIn class="mt-7" text="signup_with" />

    <div class="my-6 flex items-center gap-3 text-xs text-muted uppercase">
      <span class="h-px flex-1 bg-border" />
      {{ t('auth.or') }}
      <span class="h-px flex-1 bg-border" />
    </div>

    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-1.5">
        <label for="email" class="text-sm font-medium">
          {{ t('register.email') }}
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          required
          :placeholder="t('register.email.placeholder')"
          class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <div class="space-y-1.5">
        <label for="password" class="text-sm font-medium">
          {{ t('register.password') }}
        </label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
          :minlength="PASSWORD_MIN_LENGTH"
          :placeholder="t('register.password.placeholder')"
          class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <div class="space-y-1.5">
        <label for="confirmPassword" class="text-sm font-medium">
          {{ t('register.confirmPassword') }}
        </label>
        <input
          id="confirmPassword"
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          required
          :placeholder="t('register.confirmPassword.placeholder')"
          class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
        />
      </div>

      <p v-if="error" class="text-sm text-danger-400">{{ error }}</p>

      <Button type="submit" :disabled="submitting" class="w-full">
        <UserPlus class="size-4" />
        {{ submitting ? t('register.submitting') : t('register.submit') }}
      </Button>
    </form>

    <!-- After both ways in, since it applies to either. -->
    <p class="mt-4 text-xs text-muted">
      {{ t('register.legal.before') }}
      <a :href="path('/terms')" class="text-primary-400 hover:text-primary-300">
        {{ t('legal.terms.title') }}
      </a>
      {{ t('register.legal.and') }}
      <a
        :href="path('/privacy')"
        class="text-primary-400 hover:text-primary-300"
      >
        {{ t('legal.privacy.title') }}</a
      >.
    </p>

    <p class="mt-6 text-center text-sm text-muted">
      {{ t('register.hasAccount') }}
      <a
        :href="path('/login')"
        class="font-medium text-primary-400 hover:text-primary-300"
      >
        {{ t('register.login') }}
      </a>
    </p>
  </Card>
</template>
