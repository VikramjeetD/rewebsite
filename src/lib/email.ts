import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendStatusChangeEmail(
  listingTitle: string,
  oldStatus: string,
  newStatus: string,
  confidence: number,
  reasoning: string
) {
  const agentEmail = process.env.ADMIN_EMAIL;
  if (!agentEmail) return;

  await getResend().emails.send({
    from: "RE Website <onboarding@resend.dev>",
    to: agentEmail,
    subject: `Listing Status Change: ${listingTitle} → ${newStatus}`,
    html: `
      <h2>Listing Status Change Detected</h2>
      <p><strong>Listing:</strong> ${listingTitle}</p>
      <p><strong>Previous Status:</strong> ${oldStatus}</p>
      <p><strong>New Status:</strong> ${newStatus}</p>
      <p><strong>Confidence:</strong> ${Math.round(confidence * 100)}%</p>
      <p><strong>Reasoning:</strong> ${reasoning}</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/listings">View in Admin Panel</a></p>
    `,
  });
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

  await getResend().emails.send({
    from: "RE Website <onboarding@resend.dev>",
    to: agentEmail,
    subject: `New Contact: ${name}${listingTitle ? ` re: ${listingTitle}` : ""}`,
    html: `
      <h2>New Contact Inquiry</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
      ${listingTitle ? `<p><strong>Regarding:</strong> ${listingTitle}</p>` : ""}
      <p><strong>Message:</strong></p>
      <p>${message}</p>
    `,
  });
}
