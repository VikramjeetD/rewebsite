import { getSiteSettings, getTestimonials } from "@/lib/firestore";
import { Phone, Mail, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about Brandy Culp, licensed real estate agent associated with SPiRALNY.",
};

export default async function AboutPage() {
  const [settings, testimonials] = await Promise.all([
    getSiteSettings(),
    getTestimonials(),
  ]);

  return (
    <div>
      {/* Hero section */}
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Photo */}
          <div className="relative mx-auto aspect-[3/4] w-full max-w-md overflow-hidden border border-white/10">
            <Image
              src="/images/agent.jpeg"
              alt={settings.agentName}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>

          {/* Text */}
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">
              About
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
              {settings.agentName}
            </h1>
            <p className="mt-2 text-lg text-white/50">{settings.agentTitle}</p>
            {settings.license && (
              <p className="mt-1 text-sm text-white/30">
                License: {settings.license}
              </p>
            )}

            <div className="mt-1 h-px w-16 bg-white/20" />

            <div className="mt-8 space-y-4 text-white/60 leading-relaxed">
              <p>
                {settings.agentBio ||
                  "With extensive experience in the New York real estate market, I provide personalized service to help clients find their perfect home. Whether you're buying, selling, or renting, I'm here to guide you through every step of the process."}
              </p>
            </div>

            <p className="mt-6 text-sm text-white/40">
              Associated with{" "}
              <a
                href="https://www.spiralny.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 underline underline-offset-2 hover:text-white"
              >
                SPiRALNY
              </a>
            </p>

            <div className="mt-10 space-y-3">
              <div className="flex items-center gap-3 text-white/60">
                <Phone className="h-4 w-4 text-white/30" />
                <span>{settings.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-white/60">
                <Mail className="h-4 w-4 text-white/30" />
                <span>{settings.email}</span>
              </div>
            </div>

            <Link
              href="/contact"
              className="mt-10 inline-block border border-white px-10 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <p className="text-center text-xs font-medium uppercase tracking-[0.3em] text-white/40">
              Testimonials
            </p>
            <h2 className="mt-3 mb-12 text-center text-2xl font-bold text-white">
              What Clients Say
            </h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="border border-white/10 bg-white/[0.03] p-8"
                >
                  <div className="mb-4 flex gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5 fill-white text-white"
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-white/60">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="mt-6">
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    {t.role && (
                      <p className="text-xs text-white/40">{t.role}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
