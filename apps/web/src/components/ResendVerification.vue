<script setup lang="ts">
import { ref } from 'vue'
import { useTranslations } from '../i18n/vue'
import { resendVerification } from '../services/auth.service'
import { errorMessage } from '../helpers/error-helper'
import { useSubmit } from '../composables/use-submit'
import Alert from './ui/Alert.vue'

interface Props {
  email: string
}

const { email } = defineProps<Props>()

const t = useTranslations()

const sent = ref(false)
const resend = useSubmit(
  async () => {
    await resendVerification(email)
    sent.value = true
  },
  {
    errorMessage: (e) =>
      errorMessage(e, {
        server: t('verify.resend.error'),
        byStatus: { 429: t('email.error.tooMany') },
      }),
  },
)
</script>

<template>
  <div class="space-y-1">
    <p class="text-sm text-muted">
      <template v-if="sent">{{ t('verify.resend.sent') }}</template>
      <template v-else>
        {{ t('verify.resend.prompt') }}
        <button
          type="button"
          class="font-medium text-primary-400 hover:text-primary-300 disabled:opacity-50"
          :disabled="resend.isBusy"
          @click="resend.run()"
        >
          {{ t('verify.resend.action') }}
        </button>
      </template>
    </p>
    <Alert v-if="resend.error">{{ resend.error }}</Alert>
  </div>
</template>
