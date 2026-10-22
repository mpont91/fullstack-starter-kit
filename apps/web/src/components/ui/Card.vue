<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { ClassValue } from 'clsx'
import { cn } from '../../helpers/cn-helper'

defineOptions({ inheritAttrs: false })

interface Props {
  as?: string
}

const { as = 'div' } = defineProps<Props>()

const attributes = useAttrs()

const cardClasses = computed(() =>
  cn(
    'rounded-xl border border-border bg-surface p-5',
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
  <component :is="as" v-bind="forwardedAttributes" :class="cardClasses">
    <slot />
  </component>
</template>
