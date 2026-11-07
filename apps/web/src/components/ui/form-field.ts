import {
  computed,
  inject,
  useAttrs,
  type ComputedRef,
  type InjectionKey,
} from 'vue'
import type { ClassValue } from 'clsx'
import { cn } from '../../helpers/cn-helper'

// What a FormField tells the control inside it: the id its label points at,
// and what describes it (the hint, the error) for a screen reader.
export interface FieldContext {
  id: string
  describedBy: ComputedRef<string | undefined>
  invalid: ComputedRef<boolean>
}

export const fieldKey: InjectionKey<FieldContext> = Symbol('field')

export type ControlSize = 'medium' | 'small'
export type ControlTone = 'default' | 'danger'

// Every text control's look, in one place.
const BASE =
  'w-full rounded-lg border border-border bg-background text-sm text-foreground outline-none transition placeholder:text-muted disabled:opacity-60 aria-invalid:border-danger-400'

const SIZES: Record<ControlSize, string> = {
  medium: 'px-3.5 py-2.5',
  // Inline, inside a row of the page: renaming, editing a quantity.
  small: 'px-3 py-1.5',
}

const TONES: Record<ControlTone, string> = {
  default: 'focus:border-primary-600 focus:ring-1 focus:ring-primary-600',
  // A field that confirms something destructive.
  danger: 'focus:border-danger-400 focus:ring-1 focus:ring-danger-400',
}

// The attributes a control takes from its field and its props, merged with
// whatever the caller passes. Outside a FormField, a control is on its own:
// it needs an `aria-label`.
export function useControl(size: () => ControlSize, tone: () => ControlTone) {
  const field = inject(fieldKey, null)
  const attributes = useAttrs()
  return computed(() => {
    const { class: extra, ...rest } = attributes
    return {
      id: field?.id,
      'aria-describedby': field?.describedBy.value,
      'aria-invalid': field?.invalid.value || undefined,
      ...rest,
      class: cn(BASE, SIZES[size()], TONES[tone()], extra as ClassValue),
    }
  })
}
