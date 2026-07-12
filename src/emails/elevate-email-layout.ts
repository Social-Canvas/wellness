import { ELEVATE_BRAND } from "@/lib/constants/elevate-brand"

type ElevateEmailLayoutOptions = {
  preheader: string
  heading: string
  intro: string
  bodyLines?: string[]
  cta?: {
    label: string
    href: string
  }
  outro?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function renderBodyLines(lines: string[]): string {
  return lines
    .map((line) => `<p style="margin:0 0 12px;color:#1f3a43;line-height:1.6;">${escapeHtml(line)}</p>`)
    .join("")
}

export function renderElevateEmailLayout({
  preheader,
  heading,
  intro,
  bodyLines = [],
  cta,
  outro,
}: ElevateEmailLayoutOptions): string {
  const safeHeading = escapeHtml(heading)
  const safeIntro = escapeHtml(intro)
  const safePreheader = escapeHtml(preheader)
  const safeOutro = outro ? escapeHtml(outro) : null
  const ctaMarkup = cta
    ? `<p style="margin:20px 0 28px;"><a href="${escapeHtml(
        cta.href
      )}" style="display:inline-block;background:#2f7e96;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${escapeHtml(
        cta.label
      )}</a></p>`
    : ""

  return `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeHeading}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6faf9;font-family:Arial,sans-serif;">
    <span style="display:none !important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${safePreheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6faf9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #d8e8e4;">
            <tr>
              <td style="background:#1f3a43;padding:20px 24px;">
                <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${escapeHtml(ELEVATE_BRAND.name)}</p>
                <p style="margin:4px 0 0;color:#d8e8e4;font-size:13px;">${escapeHtml(ELEVATE_BRAND.philosophy)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 18px;">
                <h1 style="margin:0 0 12px;color:#1f3a43;font-size:24px;line-height:1.25;">${safeHeading}</h1>
                <p style="margin:0 0 16px;color:#1f3a43;line-height:1.6;">${safeIntro}</p>
                ${renderBodyLines(bodyLines)}
                ${ctaMarkup}
                ${
                  safeOutro
                    ? `<p style="margin:0;color:#1f3a43;line-height:1.6;">${safeOutro}</p>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#edf6f3;border-top:1px solid #d8e8e4;">
                <p style="margin:0;color:#46616a;font-size:12px;line-height:1.5;">
                  You are receiving this transactional email because of recent activity on your Elevate account.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function renderPlainTextEmail(
  heading: string,
  intro: string,
  bodyLines: string[],
  cta?: { label: string; href: string }
): string {
  const lines = [heading, "", intro, ...bodyLines]

  if (cta) {
    lines.push("", `${cta.label}: ${cta.href}`)
  }

  lines.push("", `- ${ELEVATE_BRAND.name}`)
  return lines.join("\n")
}
