import { getListings } from "@/lib/firestore";
import { ListingsMap, type MapListing } from "@/components/admin/listings-map";

export default async function AdminMapPage() {
  const allListings = await getListings();

  const mapListings: MapListing[] = allListings
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id,
      title: l.title,
      address: l.address,
      unit: l.unit,
      neighborhood: l.neighborhood,
      type: l.type,
      status: l.status,
      price: l.price,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      sqft: l.sqft,
      latitude: l.latitude!,
      longitude: l.longitude!,
      slug: l.slug,
    }));

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Listings Map</h1>
      </div>
      <div className="flex-1 min-h-0">
        <ListingsMap listings={mapListings} />
      </div>
    </div>
  );
}
