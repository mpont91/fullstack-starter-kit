import { APP_DOMAIN } from '@app/shared'

// Where the contact page points. Emptying it switches the page's links off:
// the UI leaves out whatever it can't link to rather than shipping a dead link.
export const CONTACT_EMAIL = `support@${APP_DOMAIN}`

// The OAuth client behind the "Sign in with Google" button: the same value as
// GOOGLE_CLIENT_ID in the API's .env. Not a secret: it's in every page that
// shows the button, and the API checks Google's tokens were issued to it. The
// same client serves production and localhost.
export const GOOGLE_CLIENT_ID = 'REPLACE_ME.apps.googleusercontent.com'
