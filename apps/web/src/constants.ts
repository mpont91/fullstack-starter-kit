// Where the contact page points. Emptying it switches the page's links off:
// the UI leaves out whatever it can't link to rather than shipping a dead link.
export const CONTACT_EMAIL = 'mpont91@gmail.com'

// The product's code, when it's public: the landing and the first screen link
// to it. Emptying it leaves those links out, as with the contact address.
export const REPOSITORY_URL = 'https://github.com/mpont91/unagistart'

// The OAuth client behind the "Sign in with Google" button: the same value as
// GOOGLE_CLIENT_ID in the API's .env. Not a secret: it's in every page that
// shows the button, and the API checks Google's tokens were issued to it. The
// same client serves production and localhost.
export const GOOGLE_CLIENT_ID = 'REPLACE_ME.apps.googleusercontent.com'
