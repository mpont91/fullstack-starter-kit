<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { ClassValue } from 'clsx'
import { cn } from '../../helpers/cn-helper'

defineOptions({ inheritAttrs: false })

const attributes = useAttrs()

// A placeholder shaped like the thing it stands in for. Sizes come from the
// caller so the skeleton occupies the same space the real content will, which
// is the whole point: no reflow when the data lands.
const skeletonClasses = computed(() =>
  cn(
    'animate-pulse rounded-md bg-surface-raised',
    attributes.class as ClassValue,
  ),
)

const forwardedAttributes = computed(() => {
  const rest = { ...attributes }
  delete rest.class
  return rest
})
</script>

<template>
  <div v-bind="forwardedAttributes" :class="skeletonClasses" aria-hidden="true">
    <slot />
  </div>
</template>
