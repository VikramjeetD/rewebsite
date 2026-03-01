import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  title: string;
  subtitle: string;
}

export function HeroSection({ title, subtitle }: HeroSectionProps) {
  return (
    <section className="relative flex min-h-screen items-center justify-center -mt-16 bg-black px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-5xl font-bold uppercase tracking-tight text-white sm:text-6xl lg:text-7xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white/60">
          {subtitle}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/listings"
            className="inline-flex items-center gap-2 bg-white px-8 py-3 font-semibold uppercase tracking-widest text-black hover:bg-white/90"
          >
            Browse Listings
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 border border-white/20 bg-white/10 px-8 py-3 font-semibold uppercase tracking-widest text-white backdrop-blur-sm hover:bg-white/20"
          >
            Get in Touch
          </Link>
        </div>
      </div>
    </section>
  );
}
