import {
  formatPrice,
  formatBedrooms,
  formatBathrooms,
  formatEffectiveRent,
} from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  ExternalLink,
  Building2,
  Layers,
  Hash,
} from "lucide-react";
import { format } from "date-fns";
import type { Listing, BuildingAmenities } from "@/types";

interface ListingDetailsProps {
  listing: Listing;
  buildingInfo?: BuildingAmenities | null;
}

export function ListingDetails({ listing, buildingInfo }: ListingDetailsProps) {
  return (
    <div className="lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={listing.status} size="md" />
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {listing.type === "RENTAL" ? "For Rent" : "For Sale"}
        </span>
      </div>

      <h1 className="text-3xl font-bold text-[var(--primary)]">
        {listing.title}
      </h1>

      <div className="mt-2 flex items-center gap-1 text-gray-600">
        <MapPin className="h-4 w-4" />
        {listing.address}
        {listing.unit ? `, Unit ${listing.unit}` : ""}, {listing.neighborhood},{" "}
        {listing.borough}
      </div>

      <p className="mt-2 text-2xl font-bold text-[var(--primary)]">
        {formatPrice(listing.price, listing.type)}
      </p>
      {listing.type === "RENTAL" &&
        (() => {
          const effective = formatEffectiveRent(
            listing.price,
            listing.leaseDuration,
            listing.freeMonths
          );
          return effective ? (
            <p className="mt-1 text-sm text-gray-500">
              Effective rent: {effective} ({listing.freeMonths} month
              {listing.freeMonths !== 1 ? "s" : ""} free on{" "}
              {listing.leaseDuration}-month lease)
            </p>
          ) : null;
        })()}

      <div className="mt-4 flex flex-wrap gap-6 text-gray-600">
        <span className="flex items-center gap-2">
          <Bed className="h-5 w-5" />
          {formatBedrooms(listing.bedrooms)}
        </span>
        <span className="flex items-center gap-2">
          <Bath className="h-5 w-5" />
          {formatBathrooms(listing.bathrooms)}
        </span>
        {listing.sqft && (
          <span className="flex items-center gap-2">
            <Maximize2 className="h-5 w-5" />
            {listing.sqft.toLocaleString()} sqft
          </span>
        )}
        {listing.availableDate && (
          <span className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {listing.availableDate <= new Date()
              ? "Available Now"
              : `Available ${format(listing.availableDate, "MMM d, yyyy")}`}
          </span>
        )}
      </div>

      <hr className="my-6" />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Description</h2>
        <p className="whitespace-pre-line text-gray-600 leading-relaxed">
          {listing.description}
        </p>
      </div>

      {listing.amenities.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Amenities</h2>
          <div className="flex flex-wrap gap-2">
            {listing.amenities.map((amenity) => (
              <span
                key={amenity}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      )}

      {buildingInfo &&
        (buildingInfo.yearBuilt ||
          buildingInfo.numFloors ||
          buildingInfo.totalUnits) && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Building Details</h2>
            <div className="flex flex-wrap gap-6 text-gray-600">
              {buildingInfo.yearBuilt && (
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Built in {buildingInfo.yearBuilt}
                </span>
              )}
              {buildingInfo.numFloors && (
                <span className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {buildingInfo.numFloors} Floors
                </span>
              )}
              {buildingInfo.totalUnits && (
                <span className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  {buildingInfo.totalUnits} Units
                </span>
              )}
            </div>
          </div>
        )}

      {listing.floorPlans.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Floor Plans</h2>
          <div className="space-y-4">
            {listing.floorPlans.map((fp) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={fp.url}
                src={fp.url}
                alt={fp.alt ?? "Floor plan"}
                className="w-full rounded-lg border border-gray-200"
              />
            ))}
          </div>
        </div>
      )}

      {listing.sourceUrl && (
        <div className="mt-8">
          <a
            href={listing.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View Original Listing <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
