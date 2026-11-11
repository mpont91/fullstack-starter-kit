<script setup lang="ts">
import type { User } from '@app/shared'
import { ExternalLink, Sprout } from 'lucide-vue-next'
import { provideLanguage, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { localizePath } from '../helpers/locale-helper'
import { REPOSITORY_URL } from '../constants'
import { me } from '../services/auth.service'
import { errorMessage } from '../helpers/error-helper'
import { useAsync } from '../composables/use-async'
import AsyncView from './ui/AsyncView.vue'
import Button from './ui/Button.vue'
import Card from './ui/Card.vue'
import EmptyState from './ui/EmptyState.vue'
import Skeleton from './ui/Skeleton.vue'

// Where a session lands, and where a project puts its first screen. It keeps
// the pattern every island follows: its language as a prop, its data through a
// service and `useAsync`, a skeleton shaped like the content and an empty
// state.
interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)

const user = useAsync<User | null>(me, {
  initial: null,
  errorMessage: (e) => errorMessage(e, { server: t('home.app.loadError') }),
})
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
        {{ t('home.app.title') }}
      </h1>
      <AsyncView :state="user">
        <template #loading>
          <Skeleton class="mt-2 h-5 w-64" />
        </template>
        <p v-if="user.data" class="mt-1 text-muted">
          {{ t('home.app.signedInAs', { email: user.data.email }) }}
        </p>
      </AsyncView>
    </div>

    <Card as="section">
      <EmptyState
        :icon="Sprout"
        :title="t('home.app.ready.title')"
        :hint="t('home.app.ready.hint')"
      >
        <Button :href="localizePath('/app/profile', lang)">
          {{ t('home.app.ready.profile') }}
        </Button>
        <Button
          v-if="REPOSITORY_URL"
          :href="REPOSITORY_URL"
          variant="secondary"
          target="_blank"
          rel="noopener"
        >
          {{ t('home.app.ready.code') }}
          <ExternalLink class="size-4" />
        </Button>
      </EmptyState>
    </Card>
  </div>
</template>
