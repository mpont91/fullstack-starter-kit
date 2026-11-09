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
import { errorMessage, InvalidInput } from '../helpers/error-helper'
import { useSubmit } from '../composables/use-submit'
import {
  localizePath,
  pathWithoutLanguage,
  siteLanguageFromApi,
} from '../helpers/locale-helper'
import Alert from './ui/Alert.vue'
import Button from './ui/Button.vue'
import FormField from './ui/FormField.vue'
import TextInput from './ui/TextInput.vue'
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

const server = (e: unknown) =>
  errorMessage(e, { server: t('profile.serverError') })

const logoutAction = useSubmit(
  async () => {
    await logout()
    window.location.assign(path('/'))
  },
  { navigates: true, errorMessage: server },
)

const currentPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const passwordChanged = ref(false)

const passwordChange = useSubmit(
  async () => {
    passwordChanged.value = false
    if (newPassword.value.length < PASSWORD_MIN_LENGTH) {
      throw new InvalidInput(
        t('profile.password.error.tooShort', { min: PASSWORD_MIN_LENGTH }),
      )
    }
    if (newPassword.value !== confirmNewPassword.value) {
      throw new InvalidInput(t('profile.password.error.mismatch'))
    }
    await changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = ''
    newPassword.value = ''
    confirmNewPassword.value = ''
    passwordChanged.value = true
  },
  {
    // Same split as deleting the account: 403 is a wrong current password,
    // anything else is on us.
    errorMessage: (e) =>
      errorMessage(e, {
        server: t('profile.password.serverError'),
        byStatus: { 403: t('profile.password.error.current') },
      }),
  },
)

const passwordLinkSent = ref(false)

// Setting a first password goes through the forgotten-password email, which
// is what proves the inbox is theirs; once it's set, both ways in work.
const passwordLink = useSubmit(
  async () => {
    if (!user.value) return
    await requestPasswordReset(user.value.email)
    passwordLinkSent.value = true
  },
  {
    errorMessage: (e) =>
      errorMessage(e, {
        server: t('profile.password.linkError'),
        byStatus: { 429: t('email.error.tooMany') },
      }),
  },
)

const deleteOpen = ref(false)
const deletePassword = ref('')

type Confirmation = { password: string } | { googleCredential: string }

// 403 is the only answer that means the confirmation was wrong (the
// password, or a Google account that isn't this one); anything else leaves
// the account in place and is ours to own.
const deletion = useSubmit(
  async (confirmation: Confirmation) => {
    await deleteAccount(confirmation)
    window.location.assign(path('/'))
  },
  {
    navigates: true,
    errorMessage: (e, confirmation) =>
      errorMessage(e, {
        server: t('profile.delete.serverError'),
        byStatus: {
          403:
            'password' in confirmation
              ? t('profile.delete.error.password')
              : t('profile.delete.error.google'),
        },
      }),
  },
)

function openDelete() {
  deletePassword.value = ''
  deletion.error = ''
  deleteOpen.value = true
}

function handleDelete() {
  if (deletePassword.value) {
    void deletion.run({ password: deletePassword.value })
  }
}

const currentLanguage = computed<Language>(() =>
  user.value ? siteLanguageFromApi(user.value.language) : lang,
)

// Changing it here is the same field the Navbar edits — updating it navigates
// to the equivalent page under the new language, same as picking it there.
const languageChange = useSubmit(
  async (code: Language) => {
    await updateLanguage(code)
    window.location.assign(
      localizePath(pathWithoutLanguage(window.location.pathname), code),
    )
  },
  { navigates: true, errorMessage: server },
)

function handleLanguageChange(code: Language) {
  if (code !== currentLanguage.value) void languageChange.run(code)
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
              :disabled="languageChange.isBusy"
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
      <Alert v-if="languageChange.error" class="px-6 pb-4">
        {{ languageChange.error }}
      </Alert>
    </Card>

    <Card as="section" class="space-y-4">
      <h2 class="text-xs font-medium text-muted uppercase">
        {{ t('profile.password') }}
      </h2>
      <div v-if="!hasPassword" class="space-y-4">
        <p class="text-sm text-muted">{{ t('profile.password.none') }}</p>
        <Alert v-if="passwordLink.error">{{ passwordLink.error }}</Alert>
        <Alert v-else-if="passwordLinkSent" tone="success">
          {{ t('profile.password.linkSent', { email: user?.email ?? '' }) }}
        </Alert>
        <Button
          size="small"
          :loading="passwordLink.isBusy"
          :disabled="passwordLinkSent"
          @click="passwordLink.run()"
        >
          <Mail class="size-4" />
          {{ t('profile.password.sendLink') }}
        </Button>
      </div>
      <form v-else class="space-y-4" @submit.prevent="passwordChange.run()">
        <FormField :label="t('profile.password.current')">
          <TextInput
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
          />
        </FormField>
        <FormField :label="t('profile.password.new')">
          <TextInput
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            required
          />
        </FormField>
        <FormField :label="t('profile.password.confirm')">
          <TextInput
            v-model="confirmNewPassword"
            type="password"
            autocomplete="new-password"
            required
          />
        </FormField>
        <Alert v-if="passwordChange.error">{{ passwordChange.error }}</Alert>
        <Alert v-else-if="passwordChanged" tone="success">
          {{ t('profile.password.changed') }}
        </Alert>
        <Button type="submit" size="small" :loading="passwordChange.isBusy">
          <KeyRound class="size-4" />
          {{ t('profile.password.submit') }}
        </Button>
      </form>
    </Card>

    <div class="space-y-2">
      <Button
        variant="secondary"
        :loading="logoutAction.isBusy"
        @click="logoutAction.run()"
      >
        <LogOut class="size-4" />
        {{ t('profile.logout') }}
      </Button>
      <Alert v-if="logoutAction.error">{{ logoutAction.error }}</Alert>
    </div>

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
      :confirm-disabled="!hasPassword || deletion.isBusy"
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
          v-if="!deletion.isBusy"
          @credential="deletion.run({ googleCredential: $event })"
        />
        <Alert v-if="deletion.error">{{ deletion.error }}</Alert>
      </div>
      <form v-else class="pt-2" @submit.prevent="handleDelete">
        <FormField
          :label="t('profile.delete.password')"
          :error="deletion.error || undefined"
        >
          <TextInput
            v-model="deletePassword"
            type="password"
            tone="danger"
            autocomplete="current-password"
            required
            :disabled="deletion.isBusy"
          />
        </FormField>
      </form>
    </ConfirmDialog>
  </div>
</template>
