import { getListingBySlug, getListings } from "@/lib/firestore";
import { isFirebaseConfigured } from "@/lib/firebase";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  formatPrice,
  formatBedrooms,
  formatBathrooms,
  getStatusColor,
  getStatusLabel,
  absoluteUrl,
} from "@/lib/utils";
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import type { Metadata } from "next";

export const revalidate = 300;

interface ListingDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ListingDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "Listing Not Found" };

  const description = `${formatBedrooms(listing.bedrooms)} ${formatBathrooms(listing.bathrooms)} ${listing.type === "RENTAL" ? "rental" : "for sale"} in ${listing.neighborhood}, ${listing.borough}. ${formatPrice(listing.price, listing.priceUnit)}`;

  return {
    title: listing.title,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: listing.photos[0]?.url ? [listing.photos[0].url] : [],
    },
  };
}

export async function generateStaticParams() {
  if (!isFirebaseConfigured()) return [];
  const listings = await getListings({ status: "ACTIVE" });
  return listings.map((l) => ({ slug: l.slug }));
}

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const sortedPhotos = [...listing.photos].sort((a, b) => a.order - b.order);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description,
    url: absoluteUrl(`/listings/${listing.slug}`),
    image: sortedPhotos[0]?.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.neighborhood,
      addressRegion: "NY",
      postalCode: listing.zipCode,
    },
    offers: {
      "@type": "Offer",
      price: listing.price / 100,
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Photo Gallery */}
        {sortedPhotos.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="relative aspect-[4/3] overflow-hidden rounded-l-xl">
              <Image
                src={sortedPhotos[0].url}
                alt={sortedPhotos[0].alt ?? listing.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            {sortedPhotos.length > 1 && (
              <div className="grid grid-cols-2 gap-2">
                {sortedPhotos.slice(1, 5).map((photo, i) => (
                  <div
                    key={photo.url}
                    className={`relative aspect-[4/3] overflow-hidden ${
                      i === 1 ? "rounded-tr-xl" : ""
                    } ${i === 3 ? "rounded-br-xl" : ""}`}
                  >
                    <Image
                      src={photo.url}
                      alt={photo.alt ?? `Photo ${i + 2}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(listing.status)}`}
              >
                {getStatusLabel(listing.status)}
              </span>
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
              {listing.unit ? `, Unit ${listing.unit}` : ""},{" "}
              {listing.neighborhood}, {listing.borough}
            </div>

            <p className="mt-2 text-2xl font-bold text-[var(--primary)]">
              {formatPrice(listing.price, listing.priceUnit)}
            </p>

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
                  Available {format(listing.availableDate, "MMM d, yyyy")}
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

          {/* Sidebar / Contact CTA */}
          <div>
            <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[var(--primary)]">
                Interested in this property?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Get in touch for a showing or more information.
              </p>
              <Link
                href={`/contact?listing=${listing.id}`}
                className="mt-4 block rounded-lg bg-[var(--primary)] px-6 py-3 text-center font-semibold text-white hover:opacity-90"
              >
                Contact Agent
              </Link>
              <div className="mt-4 text-center text-sm text-gray-500">
                or call (212) 555-0100
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
