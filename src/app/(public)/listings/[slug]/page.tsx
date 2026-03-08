import { getListingBySlug, getBuildingAmenities } from "@/lib/firestore";
import { getNearbyStations } from "@/lib/transit";
import { notFound } from "next/navigation";
import {
  formatPrice,
  formatBedrooms,
  formatBathrooms,
  absoluteUrl,
} from "@/lib/utils";
import type { Metadata } from "next";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { ListingDetails } from "@/components/listings/listing-details";
import { ContactSidebar } from "@/components/listings/contact-sidebar";
import { NearbyTransit } from "@/components/listings/nearby-transit";
import { SimilarListings } from "@/components/listings/similar-listings";

interface ListingDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ListingDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: "Listing Not Found" };

  const description = `${formatBedrooms(listing.bedrooms)} ${formatBathrooms(listing.bathrooms)} ${listing.type === "RENTAL" ? "rental" : "for sale"} in ${listing.neighborhood}, ${listing.borough}. ${formatPrice(listing.price, listing.type)}`;

  return {
    title: listing.title,
    description,
    openGraph: {
      title: listing.title,
      description,
      images: listing.photos.find((p) => p.type !== "video")?.url
        ? [listing.photos.find((p) => p.type !== "video")!.url]
        : [],
    },
  };
}

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const buildingInfo = await getBuildingAmenities(listing.address);
  const nearbyStations =
    listing.latitude != null && listing.longitude != null
      ? await getNearbyStations(listing.latitude, listing.longitude, 0.5)
      : [];
  const sortedPhotos = [...listing.photos].sort((a, b) => a.order - b.order);

  const plainDescription = listing.description.replace(/<[^>]*>/g, "");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: plainDescription,
    url: absoluteUrl(`/listings/${listing.slug}`),
    image: sortedPhotos.find((p) => p.type !== "video")?.url,
    address: {
      "@type": "PostalAddress",
      addressLocality: listing.city,
      addressRegion: listing.state,
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
        <PhotoGallery photos={sortedPhotos} title={listing.title} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <ListingDetails listing={listing} buildingInfo={buildingInfo} />
          <ContactSidebar
            listingId={listing.id}
            slug={listing.slug}
            title={listing.title}
            bedrooms={listing.bedrooms}
            bathrooms={listing.bathrooms}
            neighborhood={listing.neighborhood}
            price={formatPrice(listing.price, listing.type)}
          />

          {listing.latitude != null && listing.longitude != null && (
            <div className="col-span-full">
              <NearbyTransit
                stations={nearbyStations}
                listingLat={listing.latitude}
                listingLng={listing.longitude}
                listingId={listing.id}
              />
            </div>
          )}

          <div className="col-span-full">
            <SimilarListings listing={listing} />
          </div>
        </div>
      </div>
    </>
  );
}
