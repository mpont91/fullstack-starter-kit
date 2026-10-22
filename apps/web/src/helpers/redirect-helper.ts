import type { Language } from '../i18n'
import { localizePath, pathWithoutLanguage } from './locale-helper'
import { APP_HOME } from './app-path-helper'

// Where a fresh session lands: the page that sent the visitor to log in
// (`?redirect=`), or the app's home. The user's saved language is
// authoritative, so if it differs from the one they were browsing in as a
// guest, the same page in their own language.
export function afterLoginPath(
  search: string,
  pageLanguage: Language,
  userLanguage: Language,
): string {
  const param = new URLSearchParams(search).get('redirect')
  // The ?redirect= already carries the language it came from; only the default
  // needs localizing.
  const target = param
    ? decodeURIComponent(param)
    : localizePath(APP_HOME, pageLanguage)
  return userLanguage === pageLanguage
    ? target
    : localizePath(pathWithoutLanguage(target), userLanguage)
}
