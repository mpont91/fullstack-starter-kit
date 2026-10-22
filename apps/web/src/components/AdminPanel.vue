<script setup lang="ts">
import type { AdminUserSummary } from '@app/shared'
import { computed, onMounted, ref } from 'vue'
import { Search, Trash2, UserX } from 'lucide-vue-next'
import { provideLanguage, useTranslations } from '../i18n/vue'
import { defaultLanguage, type Language } from '../i18n'
import { deleteUser, listUsers } from '../services/admin.service'
import { ApiError } from '../services/api-client'
import { getUser } from '../services/auth.service'
import Badge from './ui/Badge.vue'
import Button from './ui/Button.vue'
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

const users = ref<AdminUserSummary[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const isLoading = ref(true)
// A 403 isn't a failure to load: it's someone without the role who found the
// URL. Telling the two apart keeps "try again" off a page that never will work.
const forbidden = ref(false)
const loadError = ref(false)
const actionError = ref(false)

const pageCount = computed(() =>
  Math.max(1, Math.ceil(total.value / PAGE_SIZE)),
)

const dateFormat = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' })
const formatDate = (value: string | null) =>
  value ? dateFormat.format(new Date(value)) : '—'

async function loadUsers() {
  const result = await listUsers({
    search: search.value.trim() || undefined,
    page: page.value,
    pageSize: PAGE_SIZE,
  })
  users.value = result.items
  total.value = result.total
}

async function load() {
  isLoading.value = true
  loadError.value = false
  try {
    await loadUsers()
  } catch (e) {
    if (e instanceof ApiError && e.status === 403) {
      forbidden.value = true
    } else {
      loadError.value = true
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const requested = new URLSearchParams(window.location.search).get('tab')
  if (TABS.includes(requested as Tab)) tab.value = requested as Tab
  load()
})

function applySearch() {
  page.value = 1
  load()
}

function goToPage(next: number) {
  page.value = next
  load()
}

// Goes through a confirmation: it changes someone else's account.
const pending = ref<{ userId: string; email: string } | null>(null)
const isWorking = ref(false)

async function confirmPending() {
  const action = pending.value
  pending.value = null
  if (!action || isWorking.value) return
  isWorking.value = true
  actionError.value = false
  try {
    await deleteUser(action.userId)
    await load()
    // Deleting the last user on a page would leave it empty.
    if (users.value.length === 0 && page.value > 1) goToPage(page.value - 1)
  } catch {
    actionError.value = true
  } finally {
    isWorking.value = false
  }
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

    <Card v-if="forbidden" as="section" class="text-center text-muted">
      {{ t('admin.forbidden') }}
    </Card>

    <Card v-else-if="loadError" as="section" class="space-y-3 text-center">
      <p class="text-muted">{{ t('admin.loadError') }}</p>
      <Button variant="secondary" size="small" @click="load">
        {{ t('admin.retry') }}
      </Button>
    </Card>

    <template v-else>
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

      <p
        v-if="tab === 'users' && actionError"
        class="rounded-lg border border-danger-500/40 bg-danger-900/20 px-4 py-2.5 text-sm text-danger-400"
      >
        {{ t('admin.actionError') }}
      </p>

      <!-- Users -->
      <section v-if="tab === 'users'" class="space-y-3">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <h2 class="text-xs font-medium text-muted uppercase">
            {{ t('admin.users.title', { count: total }) }}
          </h2>
          <form class="flex gap-2" @submit.prevent="applySearch">
            <input
              v-model="search"
              type="search"
              :placeholder="t('admin.users.search')"
              :aria-label="t('admin.users.search')"
              class="w-56 rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
            />
            <Button type="submit" variant="secondary" size="small">
              <Search class="size-4" />
            </Button>
          </form>
        </div>

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
              <tbody v-if="isLoading">
                <tr v-for="row in 5" :key="row" class="border-t border-border">
                  <td colspan="4" class="px-4 py-3">
                    <Skeleton class="h-4 w-full" />
                  </td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr v-if="users.length === 0">
                  <td colspan="4">
                    <EmptyState
                      compact
                      :icon="UserX"
                      :title="t('admin.users.empty')"
                    />
                  </td>
                </tr>
                <tr
                  v-for="user in users"
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
                      :disabled="isWorking"
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

        <div
          v-if="pageCount > 1"
          class="flex items-center justify-end gap-2 text-sm"
        >
          <Button
            variant="secondary"
            size="small"
            :disabled="page <= 1 || isLoading"
            @click="goToPage(page - 1)"
          >
            {{ t('pagination.prev') }}
          </Button>
          <span class="text-muted">{{ page }} / {{ pageCount }}</span>
          <Button
            variant="secondary"
            size="small"
            :disabled="page >= pageCount || isLoading"
            @click="goToPage(page + 1)"
          >
            {{ t('pagination.next') }}
          </Button>
        </div>
      </section>
    </template>

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
