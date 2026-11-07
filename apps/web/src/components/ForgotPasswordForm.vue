<script setup lang="ts">
import { ref } from 'vue'
import { Mail } from 'lucide-vue-next'
import { provideLanguage, useLocalizePath, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { requestPasswordReset } from '../services/auth.service'
import { ApiError } from '../services/api-client'
import Button from './ui/Button.vue'
import FormField from './ui/FormField.vue'
import TextInput from './ui/TextInput.vue'
import Card from './ui/Card.vue'

interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)
const path = useLocalizePath(lang)

const email = ref('')
const error = ref('')
const submitting = ref(false)
const sent = ref(false)

async function handleSubmit() {
  error.value = ''
  submitting.value = true
  try {
    await requestPasswordReset(email.value)
    // The API answers the same way whether or not the email exists, so the
    // UI must too — showing a different message here would defeat the point.
    sent.value = true
  } catch (e) {
    // 429 is the rate limit, the same for any address, so naming it gives
    // nothing away about which accounts exist.
    const tooMany = e instanceof ApiError && e.status === 429
    error.value = tooMany
      ? t('email.error.tooMany')
      : t('forgotPassword.serverError')
    submitting.value = false
  }
}
</script>

<template>
  <Card as="section" class="mx-auto w-full max-w-sm p-7">
    <div class="text-center">
      <h1 class="text-2xl font-bold tracking-tight">
        {{ t('forgotPassword.title') }}
      </h1>
      <p class="mt-1 text-sm text-muted">{{ t('forgotPassword.subtitle') }}</p>
    </div>

    <p v-if="sent" class="mt-7 text-center text-sm text-foreground">
      {{ t('forgotPassword.success') }}
    </p>

    <form v-else class="mt-7 space-y-4" @submit.prevent="handleSubmit">
      <FormField :label="t('forgotPassword.email')">
        <TextInput
          v-model="email"
          type="email"
          autocomplete="email"
          required
          :placeholder="t('forgotPassword.email.placeholder')"
        />
      </FormField>

      <p v-if="error" class="text-sm text-danger-400">{{ error }}</p>

      <Button type="submit" :disabled="submitting" class="w-full">
        <Mail class="size-4" />
        {{
          submitting
            ? t('forgotPassword.submitting')
            : t('forgotPassword.submit')
        }}
      </Button>
    </form>

    <p class="mt-6 text-center text-sm text-muted">
      <a
        :href="path('/login')"
        class="font-medium text-primary-400 hover:text-primary-300"
      >
        {{ t('forgotPassword.backToLogin') }}
      </a>
    </p>
  </Card>
</template>
