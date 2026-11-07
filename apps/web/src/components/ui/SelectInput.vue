<script setup lang="ts" generic="T extends string">
import { useControl, type ControlSize, type ControlTone } from './form-field'

defineOptions({ inheritAttrs: false })

// Its <option>s are the default slot.
interface Props {
  size?: ControlSize
  tone?: ControlTone
}

const { size = 'medium', tone = 'default' } = defineProps<Props>()

const model = defineModel<T>({ required: true })
const control = useControl(
  () => size,
  () => tone,
)
</script>

<template>
  <select v-model="model" v-bind="control">
    <slot />
  </select>
</template>
