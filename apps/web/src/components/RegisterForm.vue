<script setup lang="ts">
import { PASSWORD_MIN_LENGTH } from '@app/shared'
import { ref } from 'vue'
import { MailCheck, UserPlus } from 'lucide-vue-next'
import { provideLanguage, useLocalizePath, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { register } from '../services/auth.service'
import { errorMessage, InvalidInput } from '../helpers/error-helper'
import { useSubmit } from '../composables/use-submit'
import Alert from './ui/Alert.vue'
import Button from './ui/Button.vue'
import FormField from './ui/FormField.vue'
import TextInput from './ui/TextInput.vue'
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
// Set once the account exists: the form gives way to "check your inbox".
const sentTo = ref('')

const submit = useSubmit(
  async () => {
    if (password.value.length < PASSWORD_MIN_LENGTH) {
      throw new InvalidInput(t('register.error.passwordTooShort'))
    }
    if (password.value !== confirmPassword.value) {
      throw new InvalidInput(t('register.error.passwordMismatch'))
    }
    sentTo.value = await register(email.value, password.value, lang)
  },
  {
    // 409 and 429 have precise causes worth naming.
    errorMessage: (e) =>
      errorMessage(e, {
        server: t('register.serverError'),
        rejected: t('register.error.invalid'),
        byStatus: {
          409: t('register.error.emailTaken'),
          429: t('register.error.tooMany'),
        },
      }),
  },
)
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

    <form class="space-y-4" @submit.prevent="submit.run()">
      <FormField :label="t('register.email')">
        <TextInput
          v-model="email"
          type="email"
          autocomplete="email"
          required
          :placeholder="t('register.email.placeholder')"
        />
      </FormField>

      <FormField :label="t('register.password')">
        <TextInput
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
          :minlength="PASSWORD_MIN_LENGTH"
          :placeholder="t('register.password.placeholder')"
        />
      </FormField>

      <FormField :label="t('register.confirmPassword')">
        <TextInput
          v-model="confirmPassword"
          type="password"
          autocomplete="new-password"
          required
          :placeholder="t('register.confirmPassword.placeholder')"
        />
      </FormField>

      <Alert v-if="submit.error">{{ submit.error }}</Alert>

      <Button type="submit" :loading="submit.isBusy" class="w-full">
        <UserPlus class="size-4" />
        {{ t('register.submit') }}
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
        {{ t('legal.privacy.title') }}</a>.
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
