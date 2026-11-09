<script setup lang="ts">
// A message about what just happened: a load or an action that failed, or
// one that worked. A failure is announced at once by a screen reader; the
// rest, when it's free.
interface Props {
  tone?: 'danger' | 'success' | 'warning'
}

const { tone = 'danger' } = defineProps<Props>()

const TONES = {
  danger: 'text-danger-400',
  success: 'text-success-400',
  warning: 'text-warning-400',
}
</script>

<template>
  <p
    :role="tone === 'danger' ? 'alert' : 'status'"
    class="text-sm"
    :class="TONES[tone]"
  >
    <slot />
  </p>
</template>
