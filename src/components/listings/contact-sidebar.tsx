import Link from "next/link";

interface ContactSidebarProps {
  listingId: string;
}

export function ContactSidebar({ listingId }: ContactSidebarProps) {
  return (
    <div>
      <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[var(--primary)]">
          Interested in this property?
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Get in touch for a showing or more information.
        </p>
        <Link
          href={`/contact?listing=${listingId}`}
          className="mt-4 block rounded-lg bg-[var(--primary)] px-6 py-3 text-center font-semibold text-white hover:opacity-90"
        >
          Contact Agent
        </Link>
        <div className="mt-4 text-center text-sm text-gray-500">
          or call (212) 555-0100
        </div>
      </div>
    </div>
  );
}
