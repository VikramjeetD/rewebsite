import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendContactEmail(
  name: string,
  email: string,
  phone: string | null,
  message: string,
  listingTitle?: string
) {
  const agentEmail = process.env.ADMIN_EMAIL;
  if (!agentEmail) return;

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = phone ? escapeHtml(phone) : null;
  const safeMessage = escapeHtml(message);
  const safeListingTitle = listingTitle ? escapeHtml(listingTitle) : undefined;

  await getResend().emails.send({
    from: "RE Website <onboarding@resend.dev>",
    to: agentEmail,
    subject: `New Contact: ${safeName}${safeListingTitle ? ` re: ${safeListingTitle}` : ""}`,
    html: `
      <h2>New Contact Inquiry</h2>
      <p><strong>Name:</strong> ${safeName}</p>
      <p><strong>Email:</strong> ${safeEmail}</p>
      ${safePhone ? `<p><strong>Phone:</strong> ${safePhone}</p>` : ""}
      ${safeListingTitle ? `<p><strong>Regarding:</strong> ${safeListingTitle}</p>` : ""}
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
    `,
  });
}
