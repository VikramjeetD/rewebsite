import { getListings, getSiteSettings, getTestimonials } from "@/lib/firestore";
import { HeroSection } from "@/components/home/hero-section";
import { FeaturedListings } from "@/components/home/featured-listings";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { CtaSection } from "@/components/home/cta-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NYC Real Estate Agent | Find Your Dream Home",
  description:
    "Expert guidance for buying, selling, and renting in New York City. Browse our curated listings.",
};

export default async function HomePage() {
  const [featured, settings, testimonials] = await Promise.all([
    getListings({ status: "ACTIVE", featured: true, limit: 20 }),
    getSiteSettings(),
    getTestimonials(true),
  ]);

  return (
    <>
      <HeroSection
        title={settings.heroTitle}
        subtitle={settings.heroSubtitle}
      />
      <FeaturedListings listings={featured} />
      <TestimonialsSection settings={settings} testimonials={testimonials} />
      <CtaSection />
    </>
  );
}
