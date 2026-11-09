<script setup lang="ts">
import { PASSWORD_MIN_LENGTH } from '@app/shared'
import { ref } from 'vue'
import { KeyRound } from 'lucide-vue-next'
import { provideLanguage, useLocalizePath, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { getPasswordResetEmail, resetPassword } from '../services/auth.service'
import { errorMessage, InvalidInput } from '../helpers/error-helper'
import { useAsync } from '../composables/use-async'
import { useSubmit } from '../composables/use-submit'
import { APP_HOME } from '../helpers/app-path-helper'
import Alert from './ui/Alert.vue'
import AsyncView from './ui/AsyncView.vue'
import Button from './ui/Button.vue'
import FormField from './ui/FormField.vue'
import TextInput from './ui/TextInput.vue'
import Card from './ui/Card.vue'
import Skeleton from './ui/Skeleton.vue'

interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)
const path = useLocalizePath(lang)

// Read on mount: the page is rendered on the server too, with no URL to read.
let token = ''
const password = ref('')
const confirmPassword = ref('')

// A 400 is the token being invalid, expired or already used: the only 4xx
// these endpoints return. Anything else is on us.
const tokenErrors = () => ({
  server: t('resetPassword.serverError'),
  byStatus: { 400: t('resetPassword.error.invalidToken') },
})

// The email the link is for. A link that fails here gets the invalid-link
// screen rather than a form that would only fail again on submit.
const account = useAsync(
  () => {
    token = new URLSearchParams(window.location.search).get('token') ?? ''
    if (!token) {
      throw new InvalidInput(t('resetPassword.error.invalidToken'))
    }
    return getPasswordResetEmail(token)
  },
  { initial: '', errorMessage: (e) => errorMessage(e, tokenErrors()) },
)

const submit = useSubmit(
  async () => {
    if (password.value.length < PASSWORD_MIN_LENGTH) {
      throw new InvalidInput(t('resetPassword.error.passwordTooShort'))
    }
    if (password.value !== confirmPassword.value) {
      throw new InvalidInput(t('resetPassword.error.passwordMismatch'))
    }
    await resetPassword(token, password.value)
    window.location.assign(path(APP_HOME))
  },
  { navigates: true, errorMessage: (e) => errorMessage(e, tokenErrors()) },
)
</script>

<template>
  <Card as="section" class="mx-auto w-full max-w-sm p-7">
    <div class="text-center">
      <h1 class="text-2xl font-bold tracking-tight">
        {{ t('resetPassword.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted">{{ t('resetPassword.subtitle') }}</p>
    </div>

    <div class="mt-7">
      <AsyncView :state="account">
        <template #loading>
          <div class="space-y-4">
            <div v-for="field in 3" :key="field" class="grid gap-1.5">
              <Skeleton class="h-4 w-32" />
              <Skeleton class="h-10 w-full rounded-lg" />
            </div>
            <Skeleton class="h-10 w-full rounded-lg" />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="submit.run()">
          <FormField :label="t('resetPassword.email')">
            <TextInput :model-value="account.data" type="email" disabled />
          </FormField>

          <FormField :label="t('resetPassword.password')">
            <TextInput
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
              :minlength="PASSWORD_MIN_LENGTH"
              :placeholder="t('resetPassword.password.placeholder')"
            />
          </FormField>

          <FormField :label="t('resetPassword.confirmPassword')">
            <TextInput
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
              :placeholder="t('resetPassword.confirmPassword.placeholder')"
            />
          </FormField>

          <Alert v-if="submit.error">{{ submit.error }}</Alert>

          <Button type="submit" :loading="submit.isBusy" class="w-full">
            <KeyRound class="size-4" />
            {{ t('resetPassword.submit') }}
          </Button>
        </form>
      </AsyncView>
    </div>

    <p v-if="account.error" class="mt-6 text-center text-sm text-muted">
      <a
        :href="path('/forgot-password')"
        class="font-medium text-primary-400 hover:text-primary-300"
      >
        {{ t('resetPassword.requestNewLink') }}
      </a>
    </p>
  </Card>
</template>
