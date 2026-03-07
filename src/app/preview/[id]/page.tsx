import { getListingById, getBuildingAmenities } from "@/lib/firestore";
import { notFound } from "next/navigation";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { ListingDetails } from "@/components/listings/listing-details";
import { ContactSidebar } from "@/components/listings/contact-sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingPreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const buildingInfo = await getBuildingAmenities(listing.address);
  const sortedPhotos = [...listing.photos].sort((a, b) => a.order - b.order);

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Preview banner */}
      <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between bg-yellow-500 px-4 py-2 text-sm font-medium text-black">
        <span>Preview Mode — This listing is not published</span>
        <Link
          href={`/admin/listings/${id}/edit`}
          className="rounded bg-black px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-black/80"
        >
          Back to Editor
        </Link>
      </div>

      <div className="pt-10">
        <Header />
      </div>

      <main className="flex-1 pt-16">
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
              price={`$${(listing.price / 100).toLocaleString()}`}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
