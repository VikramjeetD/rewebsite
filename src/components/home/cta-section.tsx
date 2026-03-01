import Link from "next/link";

export function CtaSection() {
  return (
    <section className="bg-black px-4 py-24 text-center sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold uppercase tracking-tight text-white sm:text-4xl">
          Ready to Find Your Next Home?
        </h2>
        <p className="mt-4 text-lg text-white/60">
          Get in touch today for a personalized consultation.
        </p>
        <Link
          href="/contact"
          className="mt-8 inline-flex bg-white px-10 py-4 font-semibold uppercase tracking-widest text-black hover:bg-white/90"
        >
          Contact Me
        </Link>
      </div>
    </section>
  );
}
