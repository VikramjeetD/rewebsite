import { z } from "zod";

export const listingFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
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
    .min(1, "Price is required")
    .transform((v) => Math.round(v * 100)),
  priceUnit: z.string().nullable(),
  bedrooms: z.coerce.number().min(0).max(20),
  bathrooms: z.coerce.number().min(0).max(20),
  sqft: z.coerce.number().min(0).nullable(),
  address: z.string().min(1, "Address is required").max(300),
  unit: z.string().max(50).nullable(),
  neighborhood: z.string().min(1, "Neighborhood is required").max(100),
  borough: z.string().min(1, "Borough is required").max(50),
  zipCode: z.string().max(10).nullable(),
  sourceUrl: z.string().url().nullable().or(z.literal("")),
  featured: z.boolean(),
  amenities: z.string().transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  ),
  availableDate: z.string().nullable(),
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
  title: z.string().nullable().optional().default(null),
  description: z.string().nullable().optional().default(null),
  price: z.number().nullable().optional().default(null),
  priceUnit: z.string().nullable().optional().default(null),
  bedrooms: z.number().nullable().optional().default(null),
  bathrooms: z.number().nullable().optional().default(null),
  sqft: z.number().nullable().optional().default(null),
  address: z.string().nullable().optional().default(null),
  unit: z.string().nullable().optional().default(null),
  neighborhood: z.string().nullable().optional().default(null),
  borough: z.string().nullable().optional().default(null),
  type: z.enum(["RENTAL", "SALE"]).nullable().optional().default(null),
  status: z
    .enum(["ACTIVE", "IN_CONTRACT", "RENTED", "SOLD", "OFF_MARKET", "DRAFT"])
    .nullable()
    .optional()
    .default(null),
  amenities: z.array(z.string()).optional().default([]),
  photoUrls: z.array(z.string()).optional().default([]),
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
  neighborhood: z.string().nullable().optional().default(null),
  borough: z.string().nullable().optional().default(null),
  type: z.enum(["RENTAL", "SALE"]).nullable().optional().default(null),
  buildingAmenities: z.array(z.string()).optional().default([]),
  units: z.array(buildingUnitSchema),
});

export const urlSchema = z.string().url("Please enter a valid URL");
