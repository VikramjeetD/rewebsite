import { getListingBySlug, getBuildingAmenities } from "@/lib/firestore";
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
  const sortedPhotos = [...listing.photos].sort((a, b) => a.order - b.order);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    description: listing.description,
    url: absoluteUrl(`/listings/${listing.slug}`),
    image: sortedPhotos.find((p) => p.type !== "video")?.url,
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
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
          <ContactSidebar listingId={listing.id} />
        </div>
      </div>
    </>
  );
}
