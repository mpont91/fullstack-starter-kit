<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  icon: Component
  title: string
  hint?: string
  // Inside a section of a page rather than standing for the whole page.
  compact?: boolean
}

const { icon, title, hint, compact = false } = defineProps<Props>()
</script>

<template>
  <div
    class="flex flex-col items-center gap-3 px-4 text-center"
    :class="compact ? 'py-6' : 'py-12'"
  >
    <span
      class="flex items-center justify-center rounded-full bg-tile text-primary-300"
      :class="compact ? 'size-12' : 'size-16'"
    >
      <component :is="icon" :class="compact ? 'size-6' : 'size-8'" />
    </span>
    <div class="space-y-1">
      <p class="font-semibold text-foreground">{{ title }}</p>
      <p v-if="hint" class="mx-auto max-w-md text-sm text-muted">{{ hint }}</p>
    </div>
    <div v-if="$slots.default" class="mt-1 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
