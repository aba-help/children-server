/**
 * Mail to the admin (new access requests).
 *
 * Render's free web services cannot open SMTP ports (25/465/587 are blocked since 2025-09), so the
 * mail goes over HTTPS through a mail API. Set ONE of:
 *   RESEND_API_KEY  - resend.com (free 100/day). Without an own domain it sends from
 *                     onboarding@resend.dev and only to the e-mail of the Resend account itself.
 *   BREVO_API_KEY   - brevo.com (free 300/day). MAIL_FROM must be a sender verified in Brevo.
 * plus
 *   ADMIN_EMAIL     - where the requests go (comma separated). Falls back to SUPER_ADMIN_EMAILS.
 *   MAIL_FROM       - optional sender, e.g. "АВАша <noreply@example.com>".
 * Without a key nothing is sent; the requests are still stored and shown on the admin page.
 */

export const adminRecipients = () =>
  (process.env.ADMIN_EMAIL || process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

export const mailConfigured = () =>
  Boolean((process.env.RESEND_API_KEY || process.env.BREVO_API_KEY) && adminRecipients().length);

type Mail = { subject: string; text: string; replyTo?: string };

/** Sends the mail to the admin; throws on an API error. Returns false when mail is not set up. */
export async function sendAdminMail({ subject, text, replyTo }: Mail): Promise<boolean> {
  const to = adminRecipients();
  if (!to.length) return false;

  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "АВАша <onboarding@resend.dev>",
        to,
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
    return true;
  }

  if (process.env.BREVO_API_KEY) {
    const from = parseAddress(process.env.MAIL_FROM || to[0]);
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: from,
        to: to.map((email) => ({ email })),
        subject,
        textContent: text,
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      }),
    });
    if (!response.ok) throw new Error(`Brevo ${response.status}: ${await response.text()}`);
    return true;
  }

  return false;
}

// "Name <mail@x>" or "mail@x"
const parseAddress = (value: string) => {
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return match ? { name: match[1] || undefined, email: match[2] } : { email: value.trim() };
};
