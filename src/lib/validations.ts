import { z } from "zod";

export const listingFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required").max(5000),
  type: z.enum(["RENTAL", "SALE"]),
  status: z.enum([
    "ACTIVE",
    "IN_CONTRACT",
    "RENTED",
    "SOLD",
    "OFF_MARKET",
    "DRAFT",
  ]),
  price: z.coerce
    .number()
    .min(1, "Price must be greater than 0")
    .transform((v) => Math.round(v * 100)),
  freeMonths: z.coerce
    .number()
    .int()
    .min(0, "Free months must be non-negative")
    .nullable(),
  leaseDuration: z.coerce
    .number()
    .int()
    .min(1, "Lease duration must be at least 1")
    .nullable(),
  bedrooms: z.coerce
    .number()
    .int("Bedrooms must be a whole number")
    .min(0)
    .max(20),
  bathrooms: z.coerce.number().min(0).max(20),
  sqft: z.coerce.number().min(0).nullable(),
  address: z.string().min(1, "Address is required").max(300),
  unit: z.string().max(50).nullable(),
  city: z.string().min(1, "City is required").max(100),
  state: z
    .string()
    .regex(/^[A-Z]{2}$/, "State must be a 2-letter code (e.g. NY)"),
  neighborhood: z.string().max(100).default(""),
  borough: z.string().min(1, "Borough is required").max(50),
  zipCode: z.string().regex(/^\d{5}$/, "Zip code must be 5 digits"),
  sourceUrl: z.string().url().nullable().or(z.literal("")),
  op: z.coerce.number().min(0, "OP must be non-negative").nullable(),
  noFee: z.boolean(),
  estimatedUtilities: z.string().max(500).nullable(),
  petPolicy: z
    .enum(["NO_PETS", "CATS_ONLY", "DOGS_ONLY", "CATS_AND_DOGS"])
    .nullable(),
  petPolicyDetails: z.string().max(500).nullable(),
  parking: z.string().max(500).nullable(),
  adminNotes: z.string().max(5000).nullable(),
  featured: z.boolean(),
  amenities: z.string().transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ),
  availableDate: z.string().min(1, "Available date is required"), // "immediately" or a date string (YYYY-MM-DD)
});

export type ListingFormData = z.infer<typeof listingFormSchema>;

export const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  phone: z.string().max(20).optional(),
  message: z.string().min(1, "Message is required").max(2000),
  listingId: z.string().optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export const extractionResultSchema = z.object({
  description: z.string().nullable().optional().default(null),
  type: z.enum(["RENTAL", "SALE"]).nullable().optional().default(null),
  address: z.string().nullable().optional().default(null),
  unit: z.string().nullable().optional().default(null),
  city: z.string().nullable().optional().default(null),
  state: z.string().nullable().optional().default(null),
  zipCode: z.string().nullable().optional().default(null),
  neighborhood: z.string().nullable().optional().default(null),
  borough: z.string().nullable().optional().default(null),
  price: z.number().nullable().optional().default(null),
  bedrooms: z.number().nullable().optional().default(null),
  bathrooms: z.number().nullable().optional().default(null),
  sqft: z.number().nullable().optional().default(null),
  availableDate: z.string().nullable().optional().default(null),
  op: z.number().nullable().optional().default(null),
  freeMonths: z.number().nullable().optional().default(null),
  leaseDuration: z.number().nullable().optional().default(null),
  amenities: z.array(z.string()).optional().default([]),
  yearBuilt: z.number().int().nullable().optional().default(null),
  numFloors: z.number().int().nullable().optional().default(null),
  totalUnits: z.number().int().nullable().optional().default(null),
});

export const buildingUnitSchema = z.object({
  unit: z.string(),
  price: z.number().nullable().optional().default(null),
  bedrooms: z.number().nullable().optional().default(null),
  bathrooms: z.number().nullable().optional().default(null),
  sqft: z.number().nullable().optional().default(null),
  description: z.string().nullable().optional().default(null),
  amenities: z.array(z.string()).optional().default([]),
});

export const buildingExtractionResultSchema = z.object({
  address: z.string(),
  city: z.string().nullable().optional().default(null),
  state: z.string().nullable().optional().default(null),
  neighborhood: z.string().nullable().optional().default(null),
  borough: z.string().nullable().optional().default(null),
  type: z.enum(["RENTAL", "SALE"]).nullable().optional().default(null),
  buildingAmenities: z.array(z.string()).optional().default([]),
  units: z.array(buildingUnitSchema),
  yearBuilt: z.number().int().nullable().optional().default(null),
  numFloors: z.number().int().nullable().optional().default(null),
  totalUnits: z.number().int().nullable().optional().default(null),
});

export const urlSchema = z.string().url("Please enter a valid URL");
