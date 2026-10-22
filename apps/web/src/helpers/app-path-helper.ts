import { pathWithoutLanguage } from './locale-helper'

// Everything behind a session lives under /app, and /app itself is where a
// session lands. The admin area stands apart from it, at /admin. The rest of
// the site is public.
export const APP_HOME = '/app'
const ADMIN_HOME = '/admin'

// Whether a URL (with or without its language prefix or trailing slash) is
// `root` or a page under it.
function isUnder(path: string, root: string): boolean {
  const bare = pathWithoutLanguage(path).replace(/\/+$/, '')
  return bare === root || bare.startsWith(`${root}/`)
}

export function isAppPath(path: string): boolean {
  return isUnder(path, APP_HOME)
}

// The pages a guest is sent to log in from: the app's and the admin's.
export function needsSession(path: string): boolean {
  return isAppPath(path) || isUnder(path, ADMIN_HOME)
}
