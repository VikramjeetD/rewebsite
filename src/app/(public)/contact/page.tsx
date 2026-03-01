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
          <h1 className="text-3xl font-bold text-white">Get in Touch</h1>
          <p className="mt-4 text-white/60">
            Whether you have a question about a listing or want to discuss your
            real estate needs, I&apos;d love to hear from you.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-white/60">
              <Phone className="h-5 w-5 text-white/40" />
              <span>{settings.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <Mail className="h-5 w-5 text-white/40" />
              <span>{settings.email}</span>
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <MapPin className="h-5 w-5 text-white/40" />
              <span>New York, NY</span>
            </div>
          </div>
        </div>

        <div className="border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <ContactForm listingId={params.listing} />
        </div>
      </div>
    </div>
  );
}
