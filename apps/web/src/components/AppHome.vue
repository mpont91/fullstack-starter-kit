<script setup lang="ts">
import type { User } from '@app/shared'
import { onMounted, ref } from 'vue'
import { Sprout } from 'lucide-vue-next'
import { provideLanguage, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { me } from '../services/auth.service'
import Button from './ui/Button.vue'
import Card from './ui/Card.vue'
import EmptyState from './ui/EmptyState.vue'
import Skeleton from './ui/Skeleton.vue'

// Where a session lands. A placeholder for the product's first screen, kept as
// the pattern every island follows: its language as a prop, its data through a
// service, the explicit isLoading / loadError pair, a skeleton shaped like the
// content and an empty state.
interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)

const user = ref<User | null>(null)
const isLoading = ref(true)
const loadError = ref(false)

async function load() {
  isLoading.value = true
  loadError.value = false
  try {
    user.value = await me()
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
        {{ t('home.app.title') }}
      </h1>
      <Skeleton v-if="isLoading" class="mt-2 h-5 w-64" />
      <p v-else-if="user" class="mt-1 text-muted">
        {{ t('home.app.signedInAs', { email: user.email }) }}
      </p>
    </div>

    <Card v-if="loadError" as="section" class="space-y-3 text-center">
      <p class="text-muted">{{ t('home.app.loadError') }}</p>
      <Button variant="secondary" size="small" @click="load">
        {{ t('admin.retry') }}
      </Button>
    </Card>

    <Card v-else as="section">
      <EmptyState
        :icon="Sprout"
        :title="t('home.app.empty.title')"
        :hint="t('home.app.empty.hint')"
      />
    </Card>
  </div>
</template>
