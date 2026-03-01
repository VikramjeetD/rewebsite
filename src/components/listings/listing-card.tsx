import Image from "next/image";
import Link from "next/link";
import { formatPrice, formatBedrooms } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Listing } from "@/types";
import { MapPin, Bed, Bath, Maximize2 } from "lucide-react";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const primaryPhoto =
    listing.photos.find((p) => p.isPrimary && p.type !== "video") ??
    listing.photos.find((p) => p.type !== "video") ??
    listing.photos[0];

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
      <div className="absolute left-3 top-3 flex gap-2">
        <StatusBadge status={listing.status} />
        <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {listing.type === "RENTAL" ? "For Rent" : "For Sale"}
        </span>
      </div>

      {/* Bottom content */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-lg font-bold text-white">
          {formatPrice(listing.price, listing.type)}
        </p>
        <h3 className="mt-1 text-sm font-medium text-white/90 line-clamp-1">
          {listing.title}
        </h3>
        <div className="mt-2 flex items-center gap-1 text-xs text-white/60">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">
            {listing.address}, {listing.neighborhood}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-white/60">
          <span className="flex items-center gap-1">
            <Bed className="h-3.5 w-3.5" />
            {formatBedrooms(listing.bedrooms)}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" />
            {listing.bathrooms} Bath
          </span>
          {listing.sqft && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3.5 w-3.5" />
              {listing.sqft.toLocaleString()} sqft
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
