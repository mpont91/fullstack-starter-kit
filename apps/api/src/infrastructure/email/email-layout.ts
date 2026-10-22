import { APP_NAME, UserLanguage } from '@app/shared'

export interface EmailLayoutOptions {
  language: UserLanguage
  logoUrl: string
  preheader: string
  heading: string
  paragraphs: string[]
  cta?: { text: string; url: string }
  footer: string[]
}

// Shared shell for every transactional email: logo + name, heading, body
// copy, an optional button, small-print footer. Table-based with inline
// styles, not a stylesheet: most email clients (Gmail, Outlook) strip <style>
// blocks or a linked one entirely. Colours mirror the web's tokens.
export function renderEmailLayout(options: EmailLayoutOptions): string {
  const { language, logoUrl, preheader, heading, paragraphs, cta, footer } =
    options

  const bodyHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#9aa1ae;">${paragraph}</p>`,
    )
    .join('')

  const ctaHtml = cta
    ? `<tr>
              <td align="center" style="padding:8px 32px 24px;">
                <a href="${cta.url}" style="display:inline-block;background-color:#6366f1;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">${cta.text}</a>
              </td>
            </tr>`
    : ''

  const footerHtml = footer
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#6f7684;">${line}</p>`,
    )
    .join('')

  return `<!doctype html>
<html lang="${language.toLowerCase()}">
  <body style="margin:0;padding:0;background-color:#0b0d12;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;">
    <span style="display:none;font-size:1px;color:#0b0d12;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0d12;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#12151c;border:1px solid #262b36;border-radius:12px;overflow:hidden;">
            <tr>
              <td align="center" style="padding:32px 32px 8px;">
                <img src="${logoUrl}" width="48" height="48" alt="${APP_NAME}" style="display:block;border-radius:8px;" />
                <div style="margin-top:12px;font-size:16px;font-weight:700;color:#e7e9ee;">${APP_NAME}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 8px;">
                <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#e7e9ee;">${heading}</h1>
                ${bodyHtml}
              </td>
            </tr>
            ${ctaHtml}
            <tr>
              <td style="padding:0 32px 32px;">
                ${footerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
