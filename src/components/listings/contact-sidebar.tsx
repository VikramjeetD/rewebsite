import Link from "next/link";
import { ShareButtons } from "./share-buttons";

interface ContactSidebarProps {
  listingId: string;
  slug: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  neighborhood: string;
  price: string;
}

export function ContactSidebar({
  listingId,
  slug,
  address,
  bedrooms,
  bathrooms,
  neighborhood,
  price,
}: ContactSidebarProps) {
  return (
    <div className="self-start">
      <div className="sticky top-24 border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-white">
          Interested in this property?
        </h3>
        <Link
          href={`/contact?listing=${listingId}`}
          className="mt-4 block bg-white px-6 py-3 text-center font-semibold uppercase tracking-widest text-black hover:bg-white/90"
        >
          Get in Touch
        </Link>
        <a
          href="tel:+18306583246"
          className="mt-2 block border border-white/20 px-6 py-3 text-center font-semibold uppercase tracking-widest text-white hover:bg-white/10"
        >
          (830) 658-3246
        </a>
        <p className="mt-3 text-center text-sm text-white/40">
          for a showing or more information
        </p>

        <div className="mt-5 border-t border-white/10 pt-4">
          <ShareButtons
            slug={slug}
            address={address}
            bedrooms={bedrooms}
            bathrooms={bathrooms}
            neighborhood={neighborhood}
            price={price}
          />
        </div>
      </div>
    </div>
  );
}
