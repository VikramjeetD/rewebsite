import Link from "next/link";
import { ArrowRight, Phone, Mail, Star } from "lucide-react";
import type { SiteSettings, Testimonial } from "@/types";

interface TestimonialsSectionProps {
  settings: SiteSettings;
  testimonials: Testimonial[];
}

export function TestimonialsSection({
  settings,
  testimonials,
}: TestimonialsSectionProps) {
  return (
    <section className="bg-black px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {settings.agentName}
            </h2>
            <p className="mt-1 text-white/60">{settings.agentTitle}</p>
            <p className="mt-4 text-white/60 leading-relaxed">
              {settings.agentBio ||
                "I help clients find their perfect home. Whether you're buying, selling, or renting, I provide personalized guidance every step of the way."}
            </p>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Phone className="h-4 w-4 text-white/40" />
                {settings.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Mail className="h-4 w-4 text-white/40" />
                {settings.email}
              </div>
            </div>
            <Link
              href="/about"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-white/60 hover:text-white"
            >
              Learn More <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {testimonials.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">
                Client Reviews
              </h3>
              {testimonials.slice(0, 3).map((t) => (
                <div
                  key={t.id}
                  className="border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="mb-2 flex gap-1">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-white text-white" />
                    ))}
                  </div>
                  <p className="text-sm text-white/60">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <p className="mt-2 text-xs font-medium text-white">
                    {t.name}
                    {t.role && (
                      <span className="text-white/40"> &middot; {t.role}</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
