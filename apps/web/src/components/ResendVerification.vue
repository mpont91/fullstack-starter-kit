<script setup lang="ts">
import { ref } from 'vue'
import { useTranslations } from '../i18n/vue'
import { resendVerification } from '../services/auth.service'
import { ApiError } from '../services/api-client'

interface Props {
  email: string
}

const { email } = defineProps<Props>()

const t = useTranslations()

const state = ref<'idle' | 'sending' | 'sent' | 'error' | 'tooMany'>('idle')

async function handleResend() {
  if (state.value === 'sending') return
  state.value = 'sending'
  try {
    await resendVerification(email)
    state.value = 'sent'
  } catch (e) {
    const tooMany = e instanceof ApiError && e.status === 429
    state.value = tooMany ? 'tooMany' : 'error'
  }
}
</script>

<template>
  <p class="text-sm text-muted">
    <template v-if="state === 'sent'">{{ t('verify.resend.sent') }}</template>
    <template v-else>
      {{ t('verify.resend.prompt') }}
      <button
        type="button"
        class="font-medium text-primary-400 hover:text-primary-300 disabled:opacity-50"
        :disabled="state === 'sending'"
        @click="handleResend"
      >
        {{ t('verify.resend.action') }}
      </button>
    </template>
    <span v-if="state === 'error'" class="block text-danger-400">
      {{ t('verify.resend.error') }}
    </span>
    <span v-if="state === 'tooMany'" class="block text-danger-400">
      {{ t('email.error.tooMany') }}
    </span>
  </p>
</template>
