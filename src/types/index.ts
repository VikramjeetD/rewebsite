export type ListingType = "RENTAL" | "SALE";

export type ListingStatus =
  | "ACTIVE"
  | "IN_CONTRACT"
  | "RENTED"
  | "SOLD"
  | "OFF_MARKET"
  | "DRAFT";

export type StatusChangeSource = "MANUAL" | "AUTO_DETECTED" | "IMPORT";

export interface ListingPhoto {
  url: string;
  alt: string | null;
  order: number;
  isPrimary: boolean;
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ListingType;
  status: ListingStatus;
  price: number;
  priceUnit: string | null;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  address: string;
  unit: string | null;
  neighborhood: string;
  borough: string;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string | null;
  featured: boolean;
  amenities: string[];
  photos: ListingPhoto[];
  availableDate: Date | null;
  listedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusChange {
  id: string;
  listingId: string;
  fromStatus: string | null;
  toStatus: string;
  source: StatusChangeSource;
  notes: string | null;
  createdAt: Date;
}

export interface Testimonial {
  id: string;
  name: string;
  text: string;
  role: string | null;
  rating: number;
  featured: boolean;
  order: number;
  createdAt: Date;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  listingId: string | null;
  read: boolean;
  createdAt: Date;
}

export interface SiteSettings {
  agentName: string;
  agentTitle: string;
  agentBio: string;
  agentPhoto: string | null;
  phone: string;
  email: string;
  license: string | null;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string | null;
  updatedAt: Date;
}

export interface ExtractionResult {
  title: string | null;
  description: string | null;
  price: number | null;
  priceUnit: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  address: string | null;
  unit: string | null;
  neighborhood: string | null;
  borough: string | null;
  type: ListingType | null;
  status: ListingStatus | null;
  amenities: string[];
  photoUrls: string[];
}

export interface BuildingUnit {
  unit: string;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  description: string | null;
  amenities: string[];
}

export interface BuildingExtractionResult {
  address: string;
  neighborhood: string | null;
  borough: string | null;
  type: ListingType | null;
  buildingAmenities: string[];
  units: BuildingUnit[];
}

export interface BuildingSyncComparison {
  address: string;
  removed: { listing: Listing; unit: string }[];
  added: { unit: BuildingUnit }[];
  unchanged: { listing: Listing; unit: BuildingUnit }[];
}
