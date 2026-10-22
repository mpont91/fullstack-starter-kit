<script setup lang="ts">
import { PASSWORD_MIN_LENGTH } from '@app/shared'
import { computed, onMounted, ref } from 'vue'
import { KeyRound, LogOut, Mail, Trash2 } from 'lucide-vue-next'
import { provideLanguage, useLocalizePath, useTranslations } from '../i18n/vue'
import { defaultLanguage, languages, type Language } from '../i18n'
import {
  changePassword,
  deleteAccount,
  getUser,
  logout,
  me,
  requestPasswordReset,
  updateLanguage,
} from '../services/auth.service'
import { ApiError } from '../services/api-client'
import {
  localizePath,
  pathWithoutLanguage,
  siteLanguageFromApi,
} from '../helpers/locale-helper'
import Button from './ui/Button.vue'
import Card from './ui/Card.vue'
import ConfirmDialog from './ui/ConfirmDialog.vue'
import GoogleButton from './GoogleButton.vue'

interface Props {
  lang?: Language
}

const { lang = defaultLanguage } = defineProps<Props>()

provideLanguage(lang)

const t = useTranslations(lang)
const path = useLocalizePath(lang)

const user = ref(getUser())

// The stored copy is from the last login, so a role granted since then
// wouldn't show; refreshing it is what puts the Admin link in the navbar.
onMounted(async () => {
  try {
    user.value = await me()
  } catch {
    // Keep the stored copy; a dead session is already redirected to login.
  }
})

// An account created with Google has no password until it sets one by email,
// so its sensitive actions are confirmed with Google instead. A copy stored
// before the field existed has no value: those accounts all had a password.
const hasPassword = computed(() => user.value?.hasPassword !== false)

const memberSince = user.value
  ? new Intl.DateTimeFormat(lang, { dateStyle: 'medium' }).format(
      new Date(user.value.createdAt),
    )
  : ''

const loggingOut = ref(false)

async function handleLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  await logout()
  window.location.assign(path('/'))
}

const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const changingPassword = ref(false)
const passwordError = ref('')
const passwordChanged = ref(false)

async function handleChangePassword() {
  if (changingPassword.value) return
  passwordError.value = ''
  passwordChanged.value = false
  if (newPassword.value.length < PASSWORD_MIN_LENGTH) {
    passwordError.value = t('profile.password.error.tooShort', {
      min: PASSWORD_MIN_LENGTH,
    })
    return
  }
  if (newPassword.value !== confirmNewPassword.value) {
    passwordError.value = t('profile.password.error.mismatch')
    return
  }
  changingPassword.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    passwordChanged.value = true
  } catch (e) {
    // Same split as deleting the account: 403 is a wrong current password,
    // anything else is on us.
    passwordError.value =
      e instanceof ApiError && e.status === 403
        ? t('profile.password.error.current')
        : t('profile.password.serverError')
  } finally {
    changingPassword.value = false
  }
}

const sendingPasswordLink = ref(false)
const passwordLinkSent = ref(false)
const passwordLinkError = ref('')

// Setting a first password goes through the forgotten-password email, which
// is what proves the inbox is theirs; once it's set, both ways in work.
async function handleSendPasswordLink() {
  if (sendingPasswordLink.value || !user.value) return
  sendingPasswordLink.value = true
  passwordLinkError.value = ''
  try {
    await requestPasswordReset(user.value.email)
    passwordLinkSent.value = true
  } catch (e) {
    const tooMany = e instanceof ApiError && e.status === 429
    passwordLinkError.value = tooMany
      ? t('email.error.tooMany')
      : t('profile.password.linkError')
  } finally {
    sendingPasswordLink.value = false
  }
}

const deleteOpen = ref(false)
const deletePassword = ref('')
const deleting = ref(false)
const deleteError = ref('')

function openDelete() {
  deletePassword.value = ''
  deleteError.value = ''
  deleteOpen.value = true
}

async function handleDelete() {
  if (deleting.value || !deletePassword.value) return
  await confirmDelete({ password: deletePassword.value })
}

async function confirmDelete(
  confirmation: { password: string } | { googleCredential: string },
) {
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteAccount(confirmation)
    window.location.assign(path('/'))
  } catch (e) {
    // 403 is the only answer that means the confirmation was wrong (the
    // password, or a Google account that isn't this one); anything else
    // leaves the account in place and is ours to own.
    deleteError.value =
      e instanceof ApiError && e.status === 403
        ? 'password' in confirmation
          ? t('profile.delete.error.password')
          : t('profile.delete.error.google')
        : t('profile.delete.serverError')
    deleting.value = false
  }
}

const currentLanguage = computed<Language>(() =>
  user.value ? siteLanguageFromApi(user.value.language) : lang,
)
const changingLanguage = ref(false)

// Changing it here is the same field the Navbar edits — updating it navigates
// to the equivalent page under the new language, same as picking it there.
async function handleLanguageChange(code: Language) {
  if (code === currentLanguage.value || changingLanguage.value) return
  changingLanguage.value = true
  try {
    await updateLanguage(code)
    window.location.assign(
      localizePath(pathWithoutLanguage(window.location.pathname), code),
    )
  } catch {
    changingLanguage.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-8">
    <div>
      <h1 class="text-2xl font-bold tracking-tight sm:text-3xl">
        {{ t('profile.title') }}
      </h1>
      <p class="mt-1 text-muted">{{ t('profile.subtitle') }}</p>
    </div>

    <Card as="section" class="p-0">
      <div class="flex items-center gap-4 border-b border-border p-6">
        <span
          class="flex size-14 items-center justify-center rounded-full bg-primary-800 text-xl font-bold text-primary-100 ring-2 ring-primary-600/40"
        >
          {{ (user?.email ?? '?').charAt(0).toUpperCase() }}
        </span>
        <div>
          <p class="font-semibold">{{ user?.email }}</p>
        </div>
      </div>

      <dl class="divide-y divide-border">
        <div class="flex items-center justify-between px-6 py-4">
          <dt class="text-sm text-muted">{{ t('profile.email') }}</dt>
          <dd class="text-sm font-medium">{{ user?.email }}</dd>
        </div>
        <div class="flex items-center justify-between px-6 py-4">
          <dt class="text-sm text-muted">{{ t('profile.memberSince') }}</dt>
          <dd class="text-sm font-medium">{{ memberSince }}</dd>
        </div>
        <div class="flex items-center justify-between px-6 py-4">
          <dt class="text-sm text-muted">{{ t('profile.language') }}</dt>
          <dd class="flex gap-1">
            <button
              v-for="code in Object.keys(languages) as Language[]"
              :key="code"
              type="button"
              :disabled="changingLanguage"
              :aria-current="code === currentLanguage ? 'true' : undefined"
              class="rounded-md px-2.5 py-1 text-sm font-medium transition-colors disabled:opacity-50"
              :class="
                code === currentLanguage
                  ? 'bg-surface-raised text-foreground'
                  : 'text-muted hover:bg-surface hover:text-foreground'
              "
              @click="handleLanguageChange(code)"
            >
              {{ languages[code] }}
            </button>
          </dd>
        </div>
      </dl>
    </Card>

    <Card as="section" class="space-y-4">
      <h2 class="text-xs font-medium text-muted uppercase">
        {{ t('profile.password') }}
      </h2>
      <div v-if="!hasPassword" class="space-y-4">
        <p class="text-sm text-muted">{{ t('profile.password.none') }}</p>
        <p v-if="passwordLinkError" class="text-sm text-danger-400">
          {{ passwordLinkError }}
        </p>
        <p v-else-if="passwordLinkSent" class="text-sm text-success-400">
          {{ t('profile.password.linkSent', { email: user?.email ?? '' }) }}
        </p>
        <Button
          size="small"
          :disabled="sendingPasswordLink || passwordLinkSent"
          @click="handleSendPasswordLink"
        >
          <Mail class="size-4" />
          {{ t('profile.password.sendLink') }}
        </Button>
      </div>
      <form v-else class="space-y-4" @submit.prevent="handleChangePassword">
        <div class="space-y-1.5">
          <label for="currentPassword" class="text-sm font-medium">
            {{ t('profile.password.current') }}
          </label>
          <input
            id="currentPassword"
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          />
        </div>
        <div class="space-y-1.5">
          <label for="newPassword" class="text-sm font-medium">
            {{ t('profile.password.new') }}
          </label>
          <input
            id="newPassword"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            required
            class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          />
        </div>
        <div class="space-y-1.5">
          <label for="confirmNewPassword" class="text-sm font-medium">
            {{ t('profile.password.confirm') }}
          </label>
          <input
            id="confirmNewPassword"
            v-model="confirmNewPassword"
            type="password"
            autocomplete="new-password"
            required
            class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
          />
        </div>
        <p v-if="passwordError" class="text-sm text-danger-400">
          {{ passwordError }}
        </p>
        <p v-else-if="passwordChanged" class="text-sm text-success-400">
          {{ t('profile.password.changed') }}
        </p>
        <Button type="submit" size="small" :disabled="changingPassword">
          <KeyRound class="size-4" />
          {{
            changingPassword
              ? t('profile.password.saving')
              : t('profile.password.submit')
          }}
        </Button>
      </form>
    </Card>

    <Button variant="secondary" :disabled="loggingOut" @click="handleLogout">
      <LogOut class="size-4" />
      {{ t('profile.logout') }}
    </Button>

    <section class="space-y-3 border-t border-border pt-8">
      <h2 class="text-xs font-medium text-muted uppercase">
        {{ t('profile.delete') }}
      </h2>
      <p class="text-sm text-muted">{{ t('profile.delete.description') }}</p>
      <Button
        variant="ghost"
        class="text-danger-400 hover:text-danger-300"
        @click="openDelete"
      >
        <Trash2 class="size-4" />
        {{ t('profile.delete') }}
      </Button>
    </section>

    <ConfirmDialog
      :open="deleteOpen"
      :title="t('profile.delete.confirmTitle')"
      :confirm-label="t('profile.delete.confirm')"
      :confirm-disabled="!hasPassword"
      @confirm="handleDelete"
      @cancel="deleteOpen = false"
    >
      <p>
        {{
          hasPassword
            ? t('profile.delete.confirmBody')
            : t('profile.delete.confirmBody.google')
        }}
      </p>
      <!-- Without a password, signing in with Google again is the confirmation,
           and the button is what deletes. -->
      <div v-if="!hasPassword" class="space-y-2 pt-2">
        <p class="text-foreground">{{ t('profile.delete.google') }}</p>
        <GoogleButton
          v-if="!deleting"
          @credential="confirmDelete({ googleCredential: $event })"
        />
        <p v-if="deleteError" class="text-sm text-danger-400">
          {{ deleteError }}
        </p>
      </div>
      <form v-else class="space-y-1.5 pt-2" @submit.prevent="handleDelete">
        <label for="deletePassword" class="text-sm font-medium text-foreground">
          {{ t('profile.delete.password') }}
        </label>
        <input
          id="deletePassword"
          v-model="deletePassword"
          type="password"
          autocomplete="current-password"
          required
          :disabled="deleting"
          class="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-danger-400 focus:ring-1 focus:ring-danger-400"
        />
        <p v-if="deleteError" class="text-sm text-danger-400">
          {{ deleteError }}
        </p>
      </form>
    </ConfirmDialog>
  </div>
</template>
