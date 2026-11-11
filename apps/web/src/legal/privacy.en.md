---
updated: 2026-11-11
---

<!--
Filled in for Unagi Start, which stores the account and nothing else. A
project changes the product's name, the controller and the contact address,
and adds what it stores: under "What data we process", as a purpose, in what
error reports never include, and in how long it's kept. The providers listed
are the ones Unagi Start ships with: remove any you drop and add any you take
on. Have it reviewed before opening to real users.
-->

This policy explains what personal data Unagi Start ("we") processes, why, for
how long, and what rights you have over it. It applies to the Unagi Start
website and app.

## 1. Data controller

The data controller is Marc Pont, owner of Unagi Start. For any privacy
question, or to exercise your rights, write to **mpont91@gmail.com**.

## 2. What data we process

- **Account data:** your email address, your password if you set one (stored
  only as a bcrypt hash, never in plain text), your preferred language, your
  sign-up date and the date you confirmed your email.
- **If you sign in with Google:** the email address of your Google account and
  its identifier, which Google sends us once you choose to sign in with it. We
  don't receive or keep your name, your picture or anything else from your
  Google account.
- **Email confirmation and password reset:** single-use links, stored as a hash,
  that expire.
- **Technical data:** the IP address and request details that the servers log
  when serving your visit.
- **Error reports:** when something fails, on our servers or in your browser,
  the error, the page or address where it happened and, if you are logged in,
  your user id. Never your email or your session.

We do not ask for or process special categories of data.

## 3. Why we use it and on what legal basis

| Purpose                                                    | Legal basis (GDPR)                       |
| ---------------------------------------------------------- | ---------------------------------------- |
| Create and maintain your account                           | Performance of a contract (Art. 6(1)(b)) |
| Send you service emails (email confirmation, password)     | Performance of a contract (Art. 6(1)(b)) |
| Keep the service secure and prevent abuse                  | Legitimate interests (Art. 6(1)(f))      |
| Detect and fix errors and outages                          | Legitimate interests (Art. 6(1)(f))      |
| Aggregated, anonymous visit statistics to improve the site | Legitimate interests (Art. 6(1)(f))      |

We do not send advertising, we do not sell your data and we do not use it to
build marketing profiles.

## 4. Who we share it with

Only with the providers we need to run the service, acting as processors and
solely on our instructions:

- **Hosting provider (European Union):** the server and database where your
  account is stored.
- **Backblaze (B2, European Union region):** stores the nightly backups of the
  database. They are encrypted on our server before they leave it, with a key
  Backblaze does not have, so it can't read them.
- **Google (Sign in with Google):** only if you use it, confirms who you are and
  sends us the email and identifier described above. The login and sign-up pages
  load Google's button from Google's servers, so Google receives the usual
  technical data of that request (such as your IP address) even if you don't use
  it. Your Google account is governed by Google's own privacy policy.
- **Resend:** sends the service emails, so it processes your email address and
  the message content.
- **Vercel:** hosts the website and provides visit statistics, which are
  aggregated and cookie-free.
- **Sentry (European Union region):** receives the error reports described
  above, so we hear about a failure before you have to tell us. It does not
  store your IP address.

We do not disclose your data to anyone else unless required by law.

## 5. International transfers

Google, Resend and Vercel may process data in the United States, and Sentry,
which stores the error reports in the European Union, is a US company. These
transfers rely on appropriate safeguards: the EU-US Data Privacy Framework where
the provider is certified, or the Standard Contractual Clauses approved by the
European Commission.

## 6. How long we keep it

- Your account is kept for as long as it is active.
- **If you delete your account, it is erased immediately** from our database
  together with everything linked to it. It can survive for **up to 30 days** in
  the encrypted backups, which are deleted automatically on that schedule and
  used only to recover the service after a failure.
- Email confirmation links expire after 24 hours, and password reset links after
  one hour.
- Server logs are kept only as long as needed for security and troubleshooting.
- Error reports are deleted by Sentry after 30 days.

## 7. Storage in your browser

We do not use cookies. The app stores your session token, a copy of your basic
account details and your preferred language in your browser's local storage
(`localStorage`). These are strictly necessary for the app to work and are
cleared when you log out (except the language). The Google sign-in button on the
login and sign-up pages is served by Google, which may use its own cookies in it
under Google's policy.

## 8. Your rights

You can exercise your rights of **access, rectification, erasure, objection,
restriction of processing and data portability** at any time by writing to
mpont91@gmail.com. We will reply within one month.

You can **delete your account and all your data** yourself from your profile,
without writing to us.

If you believe we have not handled your data properly, you can lodge a complaint
with the Spanish Data Protection Agency ([aepd.es](https://www.aepd.es)) or with
the supervisory authority where you live.

## 9. Security

Traffic is encrypted (HTTPS), passwords are stored hashed and each user can only
access their own data. No system is completely secure, but we take reasonable
measures to protect your data.

## 10. Minors

Unagi Start is intended only for people aged 16 or over. We do not knowingly
process data from minors; if we find an account belonging to a minor, we will
delete it.

## 11. Changes to this policy

If we change this policy, we will update the date on this page and, if the
change is significant, let you know by email or in the app.
