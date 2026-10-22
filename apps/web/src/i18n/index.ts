import en from './en'
import es from './es'

export const languages = {
  en: 'English',
  es: 'Español',
} as const

export type Language = keyof typeof languages
export type TranslationKey = keyof typeof en

export const defaultLanguage: Language = 'en'

// Typed against the English keys, so a missing or misspelled Spanish key is a
// build error rather than a string that silently falls back.
const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  es,
}

export function useTranslations(language: Language = defaultLanguage) {
  return function t(
    key: TranslationKey,
    params?: Record<string, string | number>,
  ): string {
    let text = translations[language][key] ?? en[key]
    // A key may carry a singular and a plural form separated by "|", chosen by
    // the `count` param: 'Delete {count} item?|Delete {count} items?'.
    if (text.includes('|')) {
      const [singular, plural] = text.split('|')
      text = params?.count === 1 ? singular : plural
    }
    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replace(`{${name}}`, String(value))
      }
    }
    return text
  }
}
