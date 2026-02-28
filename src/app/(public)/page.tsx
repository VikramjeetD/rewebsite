import Link from "next/link";
import { getListings, getSiteSettings, getTestimonials } from "@/lib/firestore";
import { ListingCard } from "@/components/listings/listing-card";
import { ArrowRight, Phone, Mail, Star } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NYC Real Estate Agent | Find Your Dream Home",
  description:
    "Expert guidance for buying, selling, and renting in New York City. Browse our curated listings.",
};

export default async function HomePage() {
  const [featured, settings, testimonials] = await Promise.all([
    getListings({ status: "ACTIVE", featured: true, limit: 6 }),
    getSiteSettings(),
    getTestimonials(true),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative bg-[var(--primary)] px-4 py-24 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {settings.heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-gray-300">
            {settings.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-3 font-semibold text-[var(--primary)] hover:opacity-90"
            >
              Browse Listings
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--primary)]">
              Featured Listings
            </h2>
            <Link
              href="/listings"
              className="flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* About Preview */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-[var(--primary)]">
                {settings.agentName}
              </h2>
              <p className="mt-1 text-[var(--accent)]">{settings.agentTitle}</p>
              <p className="mt-4 text-gray-600 leading-relaxed">
                {settings.agentBio ||
                  "With years of experience in the NYC real estate market, I help clients find their perfect home. Whether you're buying, selling, or renting, I provide personalized guidance every step of the way."}
              </p>
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4 text-[var(--accent)]" />
                  {settings.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4 text-[var(--accent)]" />
                  {settings.email}
                </div>
              </div>
              <Link
                href="/about"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Learn More <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Testimonials */}
            {testimonials.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-[var(--primary)]">
                  Client Reviews
                </h3>
                {testimonials.slice(0, 3).map((t) => (
                  <div key={t.id} className="rounded-lg bg-white p-4 shadow-sm">
                    <div className="mb-2 flex gap-1">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-[var(--accent)] text-[var(--accent)]"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      &ldquo;{t.text}&rdquo;
                    </p>
                    <p className="mt-2 text-xs font-medium text-gray-900">
                      {t.name}
                      {t.role && (
                        <span className="text-gray-500">
                          {" "}
                          &middot; {t.role}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-[var(--primary)]">
          Ready to Find Your Next Home?
        </h2>
        <p className="mt-2 text-gray-600">
          Get in touch today for a personalized consultation.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex rounded-lg bg-[var(--primary)] px-8 py-3 font-semibold text-white hover:opacity-90"
        >
          Contact Me
        </Link>
      </section>
    </>
  );
}
