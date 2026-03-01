import Link from "next/link";

interface ContactSidebarProps {
  listingId: string;
}

export function ContactSidebar({ listingId }: ContactSidebarProps) {
  return (
    <div>
      <div className="sticky top-24 border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white">
          Interested in this property?
        </h3>
        <p className="mt-2 text-sm text-white/60">
          Get in touch for a showing or more information.
        </p>
        <Link
          href={`/contact?listing=${listingId}`}
          className="mt-4 block bg-white px-6 py-3 text-center font-semibold uppercase tracking-widest text-black hover:bg-white/90"
        >
          Contact Agent
        </Link>
        <div className="mt-4 text-center text-sm text-white/40">
          or call (212) 555-0100
        </div>
      </div>
    </div>
  );
}
