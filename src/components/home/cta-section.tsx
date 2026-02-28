import Link from "next/link";

export function CtaSection() {
  return (
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
  );
}
