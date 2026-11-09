<script setup lang="ts">
import type { AsyncState } from '../../composables/use-async'
import Alert from './Alert.vue'

// What a view shows while its data loads, when it failed, when there is
// none, and once it's there. The skeletons (the `loading` slot) wait before
// showing, so a load that comes back at once doesn't flash them.
interface Props {
  state: AsyncState
  // The data came back with nothing in it: the `empty` slot shows instead.
  empty?: boolean
}

const { state, empty = false } = defineProps<Props>()
</script>

<template>
  <div v-if="state.isLoading" class="loading-late" aria-busy="true">
    <slot name="loading" />
  </div>
  <Alert v-else-if="state.error">{{ state.error }}</Alert>
  <slot v-else-if="empty" name="empty" />
  <slot v-else />
</template>
