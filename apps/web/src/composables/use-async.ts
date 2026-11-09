import { onMounted, reactive, ref, type Ref } from 'vue'

export interface AsyncState {
  isLoading: boolean
  error: string
}

// What a view loads on mount: the data, whether it's still coming, and the
// message to show when it failed. `<AsyncView :state>` renders the three.
export function useAsync<T>(
  load: () => Promise<T>,
  options: { initial: T; errorMessage: (error: unknown) => string },
) {
  const data = ref(options.initial) as Ref<T>
  const isLoading = ref(true)
  const error = ref('')

  // A `quiet` reload (polling, after an action) keeps what is on screen if
  // it fails.
  async function reload({ quiet = false } = {}) {
    if (!quiet) error.value = ''
    try {
      data.value = await load()
    } catch (e) {
      if (!quiet) error.value = options.errorMessage(e)
    } finally {
      isLoading.value = false
    }
  }

  onMounted(() => reload())

  return reactive({ data, isLoading, error, reload })
}
