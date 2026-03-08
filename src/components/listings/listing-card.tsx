import Image from "next/image";
import Link from "next/link";
import { formatPrice, formatBedrooms } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Listing } from "@/types";
import { formatBathrooms } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const visiblePhotos = listing.photos.filter((p) => !p.hidden);
  const primaryPhoto =
    visiblePhotos.find((p) => p.isPrimary && p.type !== "video") ??
    visiblePhotos.find((p) => p.type !== "video") ??
    visiblePhotos[0];

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group relative block overflow-hidden aspect-[3/4]"
    >
      {/* Full-bleed image */}
      <div className="absolute inset-0 bg-white/5">
        {primaryPhoto ? (
          <Image
            src={primaryPhoto.url}
            alt={primaryPhoto.alt ?? listing.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-white/40">
            No Photo
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      {/* Top badges */}
      <div className="absolute left-3 top-3 flex items-center gap-2">
        {listing.status !== "ACTIVE" && <StatusBadge status={listing.status} />}
        {listing.noFee && listing.type === "RENTAL" && (
          <span className="bg-emerald-500/90 text-white text-xs font-medium px-2 py-0.5 rounded">
            No Fee
          </span>
        )}
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        {/* Mobile: address + neighborhood side by side */}
        <div className="flex items-baseline justify-between gap-2 sm:block">
          <h3 className="text-base font-semibold text-white truncate">
            {listing.title}
          </h3>
          <span className="shrink-0 text-sm text-white/60">
            {listing.neighborhood}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className="shrink-0 text-xl font-bold text-white">
            {formatPrice(listing.price, listing.type)}
          </p>
          <div className="flex shrink-0 items-center gap-2 text-sm text-white/70">
            <span>{formatBedrooms(listing.bedrooms)}</span>
            <span className="text-white/30">|</span>
            <span>{formatBathrooms(listing.bathrooms)}</span>
            {listing.sqft && (
              <>
                <span className="text-white/30">|</span>
                <span>{listing.sqft.toLocaleString()} sqft</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
