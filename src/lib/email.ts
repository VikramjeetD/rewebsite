import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
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
