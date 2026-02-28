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
  title: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number().nullable(),
  priceUnit: z.string().nullable(),
  bedrooms: z.number().nullable(),
  bathrooms: z.number().nullable(),
  sqft: z.number().nullable(),
  address: z.string().nullable(),
  unit: z.string().nullable(),
  neighborhood: z.string().nullable(),
  borough: z.string().nullable(),
  type: z.enum(["RENTAL", "SALE"]).nullable(),
  status: z
    .enum(["ACTIVE", "IN_CONTRACT", "RENTED", "SOLD", "OFF_MARKET", "DRAFT"])
    .nullable(),
  amenities: z.array(z.string()),
  photoUrls: z.array(z.string()),
});

export const statusDetectionSchema = z.object({
  status: z.enum(["ACTIVE", "IN_CONTRACT", "RENTED", "SOLD", "OFF_MARKET"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const urlSchema = z.string().url("Please enter a valid URL");
