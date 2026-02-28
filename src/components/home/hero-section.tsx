import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  title: string;
  subtitle: string;
}

export function HeroSection({ title, subtitle }: HeroSectionProps) {
  return (
    <section className="relative bg-[var(--primary)] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-gray-300">{subtitle}</p>
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
  );
}
