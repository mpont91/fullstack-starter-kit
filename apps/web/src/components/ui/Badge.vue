<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import type { ClassValue } from 'clsx'
import { cn } from '../../helpers/cn-helper'

defineOptions({ inheritAttrs: false })

interface Props {
  variant?: 'neutral' | 'info' | 'success' | 'danger'
}

const { variant = 'neutral' } = defineProps<Props>()

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  neutral: 'bg-surface-raised text-muted',
  info: 'bg-info-900/40 text-info-400',
  success: 'bg-success-900/40 text-success-400',
  danger: 'bg-danger-900/40 text-danger-400',
}

const attributes = useAttrs()

const badgeClasses = computed(() =>
  cn(
    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold',
    variantClasses[variant],
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
  <span v-bind="forwardedAttributes" :class="badgeClasses">
    <slot />
  </span>
</template>
