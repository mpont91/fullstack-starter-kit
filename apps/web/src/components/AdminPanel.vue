<script setup lang="ts">
import type { AdminUserPage } from '@app/shared'
import { computed, onMounted, ref } from 'vue'
import { Search, Trash2, UserX } from 'lucide-vue-next'
import { provideLanguage, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { deleteUser, listUsers } from '../services/admin.service'
import { errorMessage } from '../helpers/error-helper'
import { useAsync } from '../composables/use-async'
import { useSubmit } from '../composables/use-submit'
import { getUser } from '../services/auth.service'
import Alert from './ui/Alert.vue'
import AsyncView from './ui/AsyncView.vue'
import Badge from './ui/Badge.vue'
import Button from './ui/Button.vue'
import TextInput from './ui/TextInput.vue'
import Card from './ui/Card.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'
import Skeleton from './ui/Skeleton.vue'
import EmptyState from './ui/EmptyState.vue'
import AdminMetrics from './AdminMetrics.vue'

interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)

const PAGE_SIZE = 20
const me = getUser()

// Kept in the URL so a reload, or a link, lands on the same tab.
const TABS = ['users', 'metrics'] as const
type Tab = (typeof TABS)[number]
const tab = ref<Tab>('users')

function selectTab(next: Tab) {
  tab.value = next
  const url = new URL(window.location.href)
  url.searchParams.set('tab', next)
  window.history.replaceState(null, '', url)
}

const page = ref(1)
const search = ref('')

// A 403 is someone without the role who found the URL: told as such, not as
// a failure to load.
const listing = useAsync<AdminUserPage>(
  () =>
    listUsers({
      search: search.value.trim() || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    }),
  {
    initial: { items: [], total: 0 },
    errorMessage: (e) =>
      errorMessage(e, {
        server: t('admin.loadError'),
        byStatus: { 403: t('admin.forbidden') },
      }),
  },
)

const pageCount = computed(() =>
  Math.max(1, Math.ceil(listing.data.total / PAGE_SIZE)),
)

const dateFormat = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' })
const formatDate = (value: string | null) =>
  value ? dateFormat.format(new Date(value)) : '—'

onMounted(() => {
  const requested = new URLSearchParams(window.location.search).get('tab')
  if (TABS.includes(requested as Tab)) tab.value = requested as Tab
})

function applySearch() {
  page.value = 1
  void listing.reload()
}

function goToPage(next: number) {
  page.value = next
  void listing.reload()
}

// Goes through a confirmation: it changes someone else's account.
const pending = ref<{ userId: string; email: string } | null>(null)

const deletion = useSubmit(
  async (userId: string) => {
    await deleteUser(userId)
    await listing.reload({ quiet: true })
    // Deleting the last user on a page would leave it empty.
    if (listing.data.items.length === 0 && page.value > 1) {
      goToPage(page.value - 1)
    }
  },
  {
    errorMessage: (e) => errorMessage(e, { server: t('admin.actionError') }),
  },
)

function confirmPending() {
  const action = pending.value
  pending.value = null
  if (action) void deletion.run(action.userId)
}
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
        {{ t('admin.title') }}
      </h1>
      <p class="mt-1 text-muted">{{ t('admin.subtitle') }}</p>
    </div>

    <nav class="flex gap-1 border-b border-border" role="tablist">
      <button
        v-for="name in TABS"
        :key="name"
        type="button"
        role="tab"
        :aria-selected="tab === name"
        class="-mb-px border-b-2 px-3 py-2 text-sm font-medium transition"
        :class="
          tab === name
            ? 'border-primary-500 text-foreground'
            : 'border-transparent text-muted hover:text-foreground'
        "
        @click="selectTab(name)"
      >
        {{ t(`admin.tabs.${name}`) }}
      </button>
    </nav>

    <AdminMetrics v-if="tab === 'metrics'" />

    <Alert v-if="tab === 'users' && deletion.error">
      {{ deletion.error }}
    </Alert>

    <!-- Users -->
    <section v-if="tab === 'users'" class="space-y-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 class="text-xs font-medium text-muted uppercase">
          {{ t('admin.users.title', { count: listing.data.total }) }}
        </h2>
        <form class="flex gap-2" @submit.prevent="applySearch">
          <TextInput
            v-model="search"
            type="search"
            :placeholder="t('admin.users.search')"
            :aria-label="t('admin.users.search')"
            size="small"
            class="w-56"
          />
          <Button type="submit" variant="secondary" size="small">
            <Search class="size-4" />
          </Button>
        </form>
      </div>

      <AsyncView :state="listing" :empty="listing.data.items.length === 0">
        <template #loading>
          <Card as="div" class="space-y-3">
            <Skeleton v-for="row in 5" :key="row" class="h-4 w-full" />
          </Card>
        </template>
        <template #empty>
          <Card as="div">
            <EmptyState compact :icon="UserX" :title="t('admin.users.empty')" />
          </Card>
        </template>
        <Card as="div" class="overflow-hidden p-0">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr
                  class="border-b border-border text-left text-xs text-muted uppercase"
                >
                  <th class="px-4 py-3 font-medium">
                    {{ t('admin.users.email') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ t('admin.users.joined') }}
                  </th>
                  <th class="px-4 py-3 font-medium">
                    {{ t('admin.users.signIn') }}
                  </th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="user in listing.data.items"
                  :key="user.id"
                  class="border-t border-border align-middle"
                >
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span class="font-medium">{{ user.email }}</span>
                      <Badge v-if="user.role === 'ADMIN'" variant="info">
                        {{ t('admin.users.admin') }}
                      </Badge>
                      <Badge v-if="!user.emailVerifiedAt" variant="danger">
                        {{ t('admin.users.unverified') }}
                      </Badge>
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-muted">
                    {{ formatDate(user.createdAt) }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap gap-1.5">
                      <Badge v-if="user.hasPassword">
                        {{ t('admin.users.password') }}
                      </Badge>
                      <Badge v-if="user.hasGoogle">Google</Badge>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <Button
                      v-if="user.id !== me?.id"
                      variant="ghost"
                      size="small"
                      class="text-danger-400 hover:text-danger-300"
                      :disabled="deletion.isBusy"
                      :aria-label="t('admin.users.delete')"
                      @click="pending = { userId: user.id, email: user.email }"
                    >
                      <Trash2 class="size-4" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </AsyncView>

      <div
        v-if="pageCount > 1"
        class="flex items-center justify-end gap-2 text-sm"
      >
        <Button
          variant="secondary"
          size="small"
          :disabled="page <= 1 || listing.isLoading"
          @click="goToPage(page - 1)"
        >
          {{ t('pagination.prev') }}
        </Button>
        <span class="text-muted">{{ page }} / {{ pageCount }}</span>
        <Button
          variant="secondary"
          size="small"
          :disabled="page >= pageCount || listing.isLoading"
          @click="goToPage(page + 1)"
        >
          {{ t('pagination.next') }}
        </Button>
      </div>
    </section>

    <ConfirmDialog
      :open="pending !== null"
      :title="t('admin.confirm.delete.title')"
      :confirm-label="t('admin.confirm.delete.action')"
      @cancel="pending = null"
      @confirm="confirmPending"
    >
      <p v-if="pending" class="text-danger-400">
        {{ t('admin.confirm.delete.body', { email: pending.email }) }}
      </p>
    </ConfirmDialog>
  </div>
</template>
