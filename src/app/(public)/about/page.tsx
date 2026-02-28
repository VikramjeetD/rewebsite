import { getSiteSettings, getTestimonials } from "@/lib/firestore";
import { Phone, Mail, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about your trusted NYC real estate agent.",
};

export default async function AboutPage() {
  const [settings, testimonials] = await Promise.all([
    getSiteSettings(),
    getTestimonials(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          {settings.agentPhoto && (
            <div className="relative mb-6 aspect-[3/4] max-w-md overflow-hidden rounded-xl">
              <Image
                src={settings.agentPhoto}
                alt={settings.agentName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-[var(--primary)]">
            {settings.agentName}
          </h1>
          <p className="mt-1 text-lg text-[var(--accent)]">
            {settings.agentTitle}
          </p>
          {settings.license && (
            <p className="mt-1 text-sm text-gray-500">
              License: {settings.license}
            </p>
          )}

          <div className="mt-6 space-y-4 text-gray-600 leading-relaxed">
            <p>
              {settings.agentBio ||
                "With extensive experience in the NYC real estate market, I provide personalized service to help clients find their perfect home. Whether you're buying, selling, or renting, I'm here to guide you through every step of the process."}
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-gray-600">
              <Phone className="h-5 w-5 text-[var(--accent)]" />
              <span>{settings.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="h-5 w-5 text-[var(--accent)]" />
              <span>{settings.email}</span>
            </div>
          </div>

          <Link
            href="/contact"
            className="mt-8 inline-block rounded-lg bg-[var(--primary)] px-8 py-3 font-semibold text-white hover:opacity-90"
          >
            Get in Touch
          </Link>
        </div>
      </div>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 text-center text-2xl font-bold text-[var(--primary)]">
            What Clients Say
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-[var(--accent)] text-[var(--accent)]"
                    />
                  ))}
                </div>
                <p className="text-gray-600">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-4">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  {t.role && <p className="text-sm text-gray-500">{t.role}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
