<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useTranslations } from '../../i18n/vue'
import Button from './Button.vue'

interface Props {
  open: boolean
  title: string
  confirmLabel: string
  // For dialogs that open only to explain why nothing will happen.
  confirmDisabled?: boolean
}

const { open, confirmDisabled = false } = defineProps<Props>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()

const t = useTranslations()

// <body> has no counterpart in the static HTML Astro renders, so the teleport
// only exists once the island is mounted.
const isMounted = ref(false)

onMounted(() => {
  isMounted.value = true
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('cancel')
}

watch(
  () => open,
  (isOpen) => {
    document.body.classList.toggle('overflow-hidden', isOpen)
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
)

onBeforeUnmount(() => {
  document.body.classList.remove('overflow-hidden')
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport v-if="isMounted" to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-70 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="emit('cancel')"
      >
        <div
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          class="w-full max-w-md space-y-4 rounded-xl border border-border bg-surface p-6 shadow-2xl"
        >
          <h2 class="text-lg font-bold tracking-tight">{{ title }}</h2>

          <div class="space-y-2 text-sm text-muted">
            <slot />
          </div>

          <div class="flex justify-end gap-2 pt-1">
            <Button variant="secondary" size="small" @click="emit('cancel')">
              {{ confirmDisabled ? t('confirm.close') : t('confirm.cancel') }}
            </Button>
            <Button
              v-if="!confirmDisabled"
              size="small"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
