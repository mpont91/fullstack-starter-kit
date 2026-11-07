<script setup lang="ts">
import { computed, provide, useId } from 'vue'
import { fieldKey } from './form-field'

// One field of a form: its label, the control (the default slot: TextInput,
// TextArea, SelectInput, or anything built on them), a hint and an error.
// The spacing, the label's link to the control and what a screen reader
// reads with it are decided here, never by the form.
interface Props {
  label: string
  hint?: string
  error?: string
}

const { label, hint, error } = defineProps<Props>()

const id = useId()
const hintId = `${id}-hint`
const errorId = `${id}-error`

provide(fieldKey, {
  id,
  describedBy: computed(
    () =>
      [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined,
  ),
  invalid: computed(() => !!error),
})
</script>

<template>
  <div class="grid gap-1.5">
    <!-- `aside` sits on the label's line: a button that fills the field. -->
    <div class="flex min-h-5 items-center justify-between gap-3">
      <label :for="id" class="text-sm font-medium">{{ label }}</label>
      <slot name="aside" />
    </div>
    <slot />
    <p v-if="hint" :id="hintId" class="text-xs text-muted">{{ hint }}</p>
    <p v-if="error" :id="errorId" role="alert" class="text-sm text-danger-400">
      {{ error }}
    </p>
  </div>
</template>
