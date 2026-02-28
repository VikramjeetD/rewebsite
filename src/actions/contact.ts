"use server";

import { createContactSubmission } from "@/lib/firestore";
import { sendContactEmail } from "@/lib/email";
import { contactFormSchema } from "@/lib/validations";
import { getListingById } from "@/lib/firestore";

export async function submitContactAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = contactFormSchema.parse(raw);

  let listingTitle: string | undefined;
  if (parsed.listingId) {
    const listing = await getListingById(parsed.listingId);
    if (listing) listingTitle = listing.title;
  }

  await createContactSubmission({
    name: parsed.name,
    email: parsed.email,
    phone: parsed.phone ?? null,
    message: parsed.message,
    listingId: parsed.listingId ?? null,
  });

  await sendContactEmail(
    parsed.name,
    parsed.email,
    parsed.phone ?? null,
    parsed.message,
    listingTitle
  );

  return { success: true };
}
