<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'
import type { ClassValue } from 'clsx'
import { cn } from '../../helpers/cn-helper'

defineOptions({ inheritAttrs: false })

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'small' | 'medium'
  type?: 'button' | 'submit' | 'reset'
  href?: string
  disabled?: boolean
  // An action under way: it can't be pressed again, and a spinner stands in
  // for its content, keeping its width.
  loading?: boolean
}

const {
  variant = 'primary',
  size = 'medium',
  type = 'button',
  href = undefined,
  disabled = false,
  loading = false,
} = defineProps<Props>()

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-primary-600 text-primary-50 hover:bg-primary-500',
  secondary:
    'border border-border bg-surface text-foreground hover:bg-surface-raised',
  ghost: 'text-muted hover:bg-surface hover:text-foreground',
}

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  small: 'gap-1.5 rounded-md px-3 py-1.5 text-xs',
  medium: 'gap-2 rounded-lg px-5 py-2.5 text-sm',
}

const attributes = useAttrs()

const buttonClasses = computed(() =>
  cn(
    'relative inline-flex items-center justify-center font-semibold transition disabled:cursor-not-allowed disabled:opacity-40',
    variantClasses[variant],
    sizeClasses[size],
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
  <component
    :is="href ? 'a' : 'button'"
    v-bind="forwardedAttributes"
    :href="href"
    :type="href ? undefined : type"
    :disabled="href ? undefined : disabled || loading"
    :aria-busy="loading || undefined"
    :class="buttonClasses"
  >
    <span class="contents" :class="{ invisible: loading }"><slot /></span>
    <LoaderCircle
      v-if="loading"
      class="absolute inset-0 m-auto size-4 animate-spin"
      aria-hidden="true"
    />
  </component>
</template>
