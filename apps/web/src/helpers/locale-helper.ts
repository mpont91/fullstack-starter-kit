import type { UserLanguage } from '@app/shared'
import { defaultLanguage, languages, type Language } from '../i18n'

// English lives at the root and every other language under its own prefix
// (/es/app).
export function localizePath(path: string, language: Language): string {
  if (language === defaultLanguage) return path
  return path === '/' ? `/${language}` : `/${language}${path}`
}

// The language a URL is asking for, defaulting to English when the first
// segment isn't a known prefix.
export function languageFromPath(path: string): Language {
  const segment = path.split('/')[1]
  return segment in languages && segment !== defaultLanguage
    ? (segment as Language)
    : defaultLanguage
}

// The same page with its language prefix removed, so it can be re-localized.
export function pathWithoutLanguage(path: string): string {
  const language = languageFromPath(path)
  if (language === defaultLanguage) return path
  const stripped = path.slice(`/${language}`.length)
  return stripped === '' ? '/' : stripped
}

// A user's language (`UserLanguage`, EN/ES) is not the site's locale
// (`Language`, en/es, which comes from the URL) — this is the one place the two
// representations meet.
export function siteLanguageFromApi(language: UserLanguage): Language {
  return language === 'ES' ? 'es' : 'en'
}

export function apiLanguageFromSite(language: Language): UserLanguage {
  return language === 'es' ? 'ES' : 'EN'
}

// Every page is written once under src/pages/[...lang]/ and built twice: the
// default language keeps the bare path (lang undefined) and each other one gets
// its prefix. Adding a language to `languages` adds its routes here.
export function getLanguagePaths(): { params: { lang: string | undefined } }[] {
  return Object.keys(languages).map((code) => ({
    params: { lang: code === defaultLanguage ? undefined : code },
  }))
}
