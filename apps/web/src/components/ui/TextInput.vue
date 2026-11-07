<script setup lang="ts">
import { useControl, type ControlSize, type ControlTone } from './form-field'

defineOptions({ inheritAttrs: false })

// Any attribute an <input> takes (type, inputmode, placeholder, required…)
// passes through.
interface Props {
  size?: ControlSize
  tone?: ControlTone
}

const { size = 'medium', tone = 'default' } = defineProps<Props>()

const model = defineModel<string>({ default: '' })
const control = useControl(
  () => size,
  () => tone,
)
</script>

<template>
  <input v-model="model" v-bind="control" />
</template>
