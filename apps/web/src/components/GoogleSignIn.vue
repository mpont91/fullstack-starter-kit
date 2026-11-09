<script setup lang="ts">
import { ref } from 'vue'
import { useLanguage, useTranslations } from '../i18n/vue'
import { signInWithGoogle } from '../services/auth.service'
import { errorMessage } from '../helpers/error-helper'
import { siteLanguageFromApi } from '../helpers/locale-helper'
import { afterLoginPath } from '../helpers/redirect-helper'
import GoogleButton from './GoogleButton.vue'
import Alert from './ui/Alert.vue'

// The Google half of the login and register pages: the same call on both, since
// the API logs in, links or registers, whichever applies.

interface Props {
  text?: 'signin_with' | 'signup_with'
}

const { text = 'signin_with' } = defineProps<Props>()

const lang = useLanguage()
const t = useTranslations()

const error = ref('')

async function handleCredential(credential: string) {
  error.value = ''
  try {
    const user = await signInWithGoogle(credential, lang)
    window.location.assign(
      afterLoginPath(
        window.location.search,
        lang,
        siteLanguageFromApi(user.language),
      ),
    )
  } catch (e) {
    // 429 is the rate limit. Any other 4xx is Google's answer not holding up:
    // a stale token, or an address Google hasn't verified. Anything else is on
    // us.
    error.value = errorMessage(e, {
      server: t('google.serverError'),
      rejected: t('google.error'),
      byStatus: { 429: t('login.error.tooMany') },
    })
  }
}
</script>

<template>
  <div class="space-y-2">
    <GoogleButton :text="text" @credential="handleCredential" />
    <Alert v-if="error" class="text-center">{{ error }}</Alert>
  </div>
</template>
