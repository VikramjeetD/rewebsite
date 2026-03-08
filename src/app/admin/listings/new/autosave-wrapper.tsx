"use client";

import { useCallback, useState } from "react";
import { ListingForm } from "@/components/admin/listing-form";
import { UrlExtractor } from "@/components/admin/url-extractor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Listing, ExtractionResult } from "@/types";

interface NewListingAutosaveProps {
  listing?: Listing;
  action: (
    prevState: string | null,
    formData: FormData
  ) => Promise<string | null>;
}

function resolveAvailableDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed < today ? today : parsed;
}

function extractionToPartialListing(data: ExtractionResult): Partial<Listing> {
  return {
    description: data.description ?? "",
    type: data.type ?? "RENTAL",
    address: data.address ?? "",
    unit: data.unit ?? null,
    city: data.city ?? "New York",
    state: data.state ?? "NY",
    zipCode: data.zipCode ?? null,
    neighborhood: data.neighborhood ?? "",
    borough: data.borough ?? "N/A",
    price: data.price ?? 0,
    bedrooms: data.bedrooms ?? 0,
    bathrooms: data.bathrooms ?? 1,
    sqft: data.sqft ?? null,
    availableDate: resolveAvailableDate(data.availableDate ?? null),
    op: data.op ?? null,
    freeMonths: data.freeMonths ?? null,
    leaseDuration: data.leaseDuration ?? null,
    amenities: data.amenities ?? [],
    sourceUrl: null,
    featured: false,
  };
}

export function NewListingAutosave({
  listing,
  action,
}: NewListingAutosaveProps) {
  const [formKey, setFormKey] = useState(0);
  const [prefill, setPrefill] = useState<Partial<Listing> | undefined>(
    undefined
  );
  const [extractedBuildingInfo, setExtractedBuildingInfo] = useState<{
    yearBuilt: number | null;
    numFloors: number | null;
    totalUnits: number | null;
  } | null>(null);

  const handleDraftCreated = useCallback((id: string) => {
    window.history.replaceState(null, "", `/admin/listings/new?draftId=${id}`);
  }, []);

  const handlePopulateForm = useCallback((data: ExtractionResult) => {
    setPrefill(extractionToPartialListing(data));
    const hasBuildingInfo =
      data.yearBuilt != null ||
      data.numFloors != null ||
      data.totalUnits != null;
    setExtractedBuildingInfo(
      hasBuildingInfo
        ? {
            yearBuilt: data.yearBuilt ?? null,
            numFloors: data.numFloors ?? null,
            totalUnits: data.totalUnits ?? null,
          }
        : null
    );
    setFormKey((k) => k + 1);
  }, []);

  // Extraction overrides the saved draft when "Populate Form Below" is clicked.
  // Preserve id/slug/status from the existing draft so autosave continues to update it.
  const effectiveListing = prefill
    ? ({
        ...prefill,
        ...(listing && {
          id: listing.id,
          slug: listing.slug,
          status: listing.status,
          photos: listing.photos,
          floorPlans: listing.floorPlans,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
        }),
      } as Listing)
    : listing;

  return (
    <>
      <div className="mb-8">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Paste from URL</h2>
          </CardHeader>
          <CardContent>
            <UrlExtractor onPopulateForm={handlePopulateForm} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">
            {prefill && !listing ? "Extracted Listing" : "Manual Entry"}
          </h2>
        </CardHeader>
        <CardContent>
          <ListingForm
            key={formKey}
            listing={effectiveListing}
            action={action}
            enableAutosave
            onDraftCreated={handleDraftCreated}
            mode="create"
            extractedBuildingInfo={extractedBuildingInfo}
          />
        </CardContent>
      </Card>
    </>
  );
}
