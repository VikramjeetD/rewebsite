export const ListingType = {
  RENTAL: "RENTAL",
  SALE: "SALE",
} as const;
export type ListingType = (typeof ListingType)[keyof typeof ListingType];

export const ListingStatus = {
  ACTIVE: "ACTIVE",
  IN_CONTRACT: "IN_CONTRACT",
  RENTED: "RENTED",
  SOLD: "SOLD",
  OFF_MARKET: "OFF_MARKET",
  DRAFT: "DRAFT",
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

export const StatusChangeSource = {
  MANUAL: "MANUAL",
  AUTO_DETECTED: "AUTO_DETECTED",
  IMPORT: "IMPORT",
} as const;
export type StatusChangeSource =
  (typeof StatusChangeSource)[keyof typeof StatusChangeSource];

export interface ListingPhoto {
  url: string;
  alt: string | null;
  order: number;
  isPrimary: boolean;
  type?: "image" | "video";
}

export interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: ListingType;
  status: ListingStatus;
  price: number;
  freeMonths: number | null;
  leaseDuration: number | null;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  address: string;
  unit: string | null;
  city: string;
  state: string;
  neighborhood: string;
  borough: string;
  zipCode: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string | null;
  op: number | null;
  noFee: boolean;
  estimatedUtilities: string | null;
  petPolicy: string | null;
  petPolicyDetails: string | null;
  parking: string | null;
  featured: boolean;
  amenities: string[];
  photos: ListingPhoto[];
  floorPlans: ListingPhoto[];
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
  description: string | null;
  type: ListingType | null;
  address: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  neighborhood: string | null;
  borough: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  availableDate: string | null;
  op: number | null;
  freeMonths: number | null;
  leaseDuration: number | null;
  amenities: string[];
  yearBuilt: number | null;
  numFloors: number | null;
  totalUnits: number | null;
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
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  borough: string | null;
  type: ListingType | null;
  buildingAmenities: string[];
  units: BuildingUnit[];
  yearBuilt: number | null;
  numFloors: number | null;
  totalUnits: number | null;
}

export interface BuildingAmenities {
  id: string;
  address: string;
  amenities: string[];
  yearBuilt: number | null;
  numFloors: number | null;
  totalUnits: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuildingSyncComparison {
  address: string;
  removed: { listing: Listing; unit: string }[];
  added: { unit: BuildingUnit }[];
  unchanged: { listing: Listing; unit: BuildingUnit }[];
}
