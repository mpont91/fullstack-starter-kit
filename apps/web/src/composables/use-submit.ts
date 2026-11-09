import { reactive, ref } from 'vue'

// An action the user starts (a form, a button): whether it's running, so
// its button shows it and can't be pressed twice, and the message to show
// when it failed.
export function useSubmit<A extends unknown[]>(
  action: (...args: A) => Promise<unknown>,
  options: {
    // Given what the action was given, to tell one failure from another.
    errorMessage: (error: unknown, ...args: A) => string
    // It leaves the page when it succeeds: the button stays busy until then.
    navigates?: boolean
  },
) {
  const isBusy = ref(false)
  const error = ref('')

  async function run(...args: A): Promise<boolean> {
    if (isBusy.value) return false
    error.value = ''
    isBusy.value = true
    try {
      await action(...args)
      if (!options.navigates) isBusy.value = false
      return true
    } catch (e) {
      error.value = options.errorMessage(e, ...args)
      isBusy.value = false
      return false
    }
  }

  return reactive({ isBusy, error, run })
}
