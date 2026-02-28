import Image from "next/image";
import Link from "next/link";
import {
  formatPrice,
  formatBedrooms,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import type { Listing } from "@/types";
import { MapPin, Bed, Bath, Maximize2 } from "lucide-react";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const primaryPhoto =
    listing.photos.find((p) => p.isPrimary) ?? listing.photos[0];

  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-gray-100">
        {primaryPhoto ? (
          <Image
            src={primaryPhoto.url}
            alt={primaryPhoto.alt ?? listing.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No Photo
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(listing.status)}`}
          >
            {getStatusLabel(listing.status)}
          </span>
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-gray-700">
            {listing.type === "RENTAL" ? "For Rent" : "For Sale"}
          </span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-lg font-bold text-[var(--primary)]">
          {formatPrice(listing.price, listing.priceUnit)}
        </p>
        <h3 className="mt-1 text-sm font-medium text-gray-900 line-clamp-1">
          {listing.title}
        </h3>
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">
            {listing.address}, {listing.neighborhood}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
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
