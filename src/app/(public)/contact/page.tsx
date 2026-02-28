import { ContactForm } from "@/components/home/contact-form";
import { getSiteSettings } from "@/lib/firestore";
import { Phone, Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch for a consultation about buying, selling, or renting in NYC.",
};

interface ContactPageProps {
  searchParams: Promise<{ listing?: string }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const params = await searchParams;
  const settings = await getSiteSettings();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold text-[var(--primary)]">
            Get in Touch
          </h1>
          <p className="mt-4 text-gray-600">
            Whether you have a question about a listing or want to discuss your
            real estate needs, I&apos;d love to hear from you.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Phone className="h-5 w-5 text-[var(--accent)]" />
              <span>{settings.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="h-5 w-5 text-[var(--accent)]" />
              <span>{settings.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <MapPin className="h-5 w-5 text-[var(--accent)]" />
              <span>New York, NY</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <ContactForm listingId={params.listing} />
        </div>
      </div>
    </div>
  );
}
