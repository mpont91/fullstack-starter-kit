import { inject, provide, type InjectionKey } from 'vue'
import {
  defaultLanguage,
  useTranslations as translationsFor,
  type Language,
} from './index'
import { localizePath } from '../helpers/locale-helper'

// Islands are handed their language by the page that mounts them — reading it
// from the URL at runtime would render English on the server and Spanish in the
// browser, and hydration would mismatch. The root provides it once and every
// component below asks for it without threading a prop through the tree.
export const languageKey: InjectionKey<Language> = Symbol('language')

export function provideLanguage(language: Language): void {
  provide(languageKey, language)
}

export function useLanguage(): Language {
  return inject(languageKey, defaultLanguage)
}

// An island root passes its own language in: Vue's inject only reaches
// ancestors, so the component doing the providing can't read it back.
export function useTranslations(language?: Language) {
  return translationsFor(language ?? useLanguage())
}

// Internal links have to stay inside the language the visitor is reading, or a
// Spanish page quietly drops them back into English.
export function useLocalizePath(language?: Language) {
  const resolved = language ?? useLanguage()
  return (path: string) => localizePath(path, resolved)
}
