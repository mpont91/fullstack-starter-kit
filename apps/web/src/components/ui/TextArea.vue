<script setup lang="ts">
import { useControl, type ControlSize, type ControlTone } from './form-field'

defineOptions({ inheritAttrs: false })

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
  <textarea v-model="model" v-bind="control" />
</template>
