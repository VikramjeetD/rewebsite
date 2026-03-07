"use client";

import {
  useActionState,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PhotoUpload,
  type PhotoUploadHandle,
} from "@/components/admin/photo-upload";
import { GenerateViewsButton } from "@/components/admin/generate-views-button";
import { AddressAutocomplete } from "@/components/admin/address-autocomplete";
import {
  AmenitiesPicker,
  type AmenitiesPickerHandle,
} from "@/components/admin/amenities-picker";
import {
  autosaveDraftAction,
  activateDraftAction,
  loadBuildingAmenitiesAction,
  saveBuildingAmenitiesAction,
  lookupPlutoAction,
  updateListingFloorPlansAction,
} from "@/actions/listings";
import { BOROUGHS } from "@/lib/constants";
import { Building2 } from "lucide-react";
import type { Listing, ListingPhoto } from "@/types";

const TYPE_OPTIONS = [
  { value: "RENTAL", label: "Rental" },
  { value: "SALE", label: "Sale" },
];

const PET_POLICY_OPTIONS = [
  { value: "", label: "— Select —" },
  { value: "NO_PETS", label: "No Pets" },
  { value: "CATS_ONLY", label: "Cats Only" },
  { value: "DOGS_ONLY", label: "Dogs Only" },
  { value: "CATS_AND_DOGS", label: "Cats & Dogs" },
];

const BOROUGH_OPTIONS = BOROUGHS.map((b) => ({ value: b, label: b }));

interface ListingFormProps {
  listing?: Listing;
  action: (
    prevState: string | null,
    formData: FormData
  ) => Promise<string | null>;
  enableAutosave?: boolean;
  onDraftCreated?: (id: string) => void;
  /** "create" always shows "Create Listing" and submits as ACTIVE. "edit" shows "Update Listing" and preserves current status. */
  mode?: "create" | "edit";
  /** Building info extracted by Gemini — used as fallback when PLUTO has no data. */
  extractedBuildingInfo?: {
    yearBuilt: number | null;
    numFloors: number | null;
    totalUnits: number | null;
  } | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ListingForm({
  listing,
  action,
  enableAutosave = false,
  onDraftCreated,
  mode = listing ? "edit" : "create",
  extractedBuildingInfo,
}: ListingFormProps) {
  const [error, formAction, isPending] = useActionState<
    string | null,
    FormData
  >(action, null);

  const isDraft = listing?.status === "DRAFT";
  const [activateError, setActivateError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const [draftId, setDraftId] = useState<string | null>(listing?.id ?? null);
  const lastSavedDataRef = useRef<string>("");
  const isSubmittingRef = useRef(false);
  const photosRef = useRef<ListingPhoto[]>(listing?.photos ?? []);
  const floorPlansRef = useRef<ListingPhoto[]>(listing?.floorPlans ?? []);
  const photoUploadRef = useRef<PhotoUploadHandle>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [listingType, setListingType] = useState<string>(
    listing?.type ?? "RENTAL"
  );
  const [currentBeds, setCurrentBeds] = useState<number>(
    listing?.bedrooms ?? 0
  );
  const [currentBaths, setCurrentBaths] = useState<number>(
    listing?.bathrooms ?? 0
  );
  const [borough, setBorough] = useState<string>(listing?.borough ?? "N/A");

  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const zipCodeRef = useRef<HTMLInputElement>(null);
  const neighborhoodRef = useRef<HTMLInputElement>(null);
  const amenitiesRef = useRef<AmenitiesPickerHandle>(null);

  const [selectedAddress, setSelectedAddress] = useState<string>(
    listing?.address ?? ""
  );
  const [buildingAmenities, setBuildingAmenities] = useState<string[] | null>(
    null
  );
  const [amenitySaveStatus, setAmenitySaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const [buildingInfo, setBuildingInfo] = useState<{
    yearBuilt: number | null;
    numFloors: number | null;
    totalUnits: number | null;
  } | null>(null);
  const [plutoLoading, setPlutoLoading] = useState(false);

  const performPlutoLookup = useCallback(
    async (
      address: string,
      fallback?: { yearBuilt: number | null; numFloors: number | null; totalUnits: number | null } | null
    ) => {
      setPlutoLoading(true);
      const result = await lookupPlutoAction(address);
      setPlutoLoading(false);
      if (result.success && result.data) {
        setBuildingInfo({
          yearBuilt: result.data.yearBuilt,
          numFloors: result.data.numFloors,
          totalUnits: result.data.totalUnits,
        });
        if (result.data.borough) {
          const match = BOROUGHS.find(
            (b) => b.toLowerCase() === result.data!.borough!.toLowerCase()
          );
          if (match) setBorough(match);
        }
      } else if (fallback) {
        // PLUTO failed — use extracted data as fallback
        setBuildingInfo(fallback);
      }
    },
    []
  );

  const checkBuildingAmenities = useCallback(
    async (address: string) => {
      if (!address.trim()) return;
      setSelectedAddress(address);

      // 1. Load stored building data
      const result = await loadBuildingAmenitiesAction(address);
      if (result.success) {
        setBuildingAmenities(result.amenities ?? null);
        const hasStoredInfo =
          result.yearBuilt != null ||
          result.numFloors != null ||
          result.totalUnits != null;
        if (hasStoredInfo) {
          setBuildingInfo({
            yearBuilt: result.yearBuilt ?? null,
            numFloors: result.numFloors ?? null,
            totalUnits: result.totalUnits ?? null,
          });
          return; // Stored data takes priority — done
        }
      }

      // 2. No stored building info → try PLUTO, with extracted data as fallback
      performPlutoLookup(address, extractedBuildingInfo);
    },
    [performPlutoLookup, extractedBuildingInfo]
  );

  // Check building amenities on mount for edit mode
  useEffect(() => {
    if (listing?.address) {
      checkBuildingAmenities(listing.address);
    }
  }, [listing?.address, checkBuildingAmenities]);

  const collectFormData = useCallback((): Record<string, string> => {
    if (!formRef.current) return {};
    const fd = new FormData(formRef.current);
    const obj: Record<string, string> = {};
    for (const [key, value] of fd.entries()) {
      obj[key] = value as string;
    }
    return obj;
  }, []);

  const performAutosave = useCallback(async () => {
    if (!formRef.current || isSubmittingRef.current) return;

    const data = collectFormData();
    const photos = photosRef.current;
    const floorPlans = floorPlansRef.current;
    const json = JSON.stringify({ data, photos, floorPlans });

    // Skip if nothing changed
    if (json === lastSavedDataRef.current) return;

    // Skip if no meaningful content yet
    const hasContent =
      !!data.title?.trim() ||
      !!data.description?.trim() ||
      !!data.address?.trim() ||
      (!!data.price && Number(data.price) > 0) ||
      photos.length > 0 ||
      floorPlans.length > 0;
    if (!hasContent && !draftId) return;

    setSaveStatus("saving");
    try {
      const result = await autosaveDraftAction(
        draftId,
        data,
        photos,
        floorPlans
      );
      if (result.success && result.draftId) {
        lastSavedDataRef.current = json;
        setLastSavedAt(new Date());
        setSaveStatus("saved");

        if (!draftId && result.draftId) {
          setDraftId(result.draftId);
          onDraftCreated?.(result.draftId);
        }
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, [collectFormData, draftId, onDraftCreated]);

  const ensureDraft = useCallback(async (): Promise<string> => {
    if (draftId) return draftId;
    const data = collectFormData();
    const photos = photosRef.current;
    const floorPlans = floorPlansRef.current;
    const result = await autosaveDraftAction(null, data, photos, floorPlans);
    if (result.success && result.draftId) {
      lastSavedDataRef.current = JSON.stringify({ data, photos, floorPlans });
      setDraftId(result.draftId);
      onDraftCreated?.(result.draftId);
      return result.draftId;
    }
    throw new Error("Failed to create draft");
  }, [draftId, collectFormData, onDraftCreated]);

  useEffect(() => {
    if (!enableAutosave) return;

    const interval = setInterval(performAutosave, 3000);
    return () => clearInterval(interval);
  }, [enableAutosave, performAutosave]);

  // Price in dollars for display
  const priceInDollars = listing ? listing.price / 100 : "";

  const currentListingId = listing?.id ?? draftId;

  return (
    <form
      ref={formRef}
      action={(formData) => {
        isSubmittingRef.current = true;
        formAction(formData);
      }}
      className="space-y-6"
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          (e.target as HTMLElement).tagName !== "TEXTAREA" &&
          (e.target as HTMLElement).getAttribute("type") !== "submit"
        ) {
          e.preventDefault();
          // Move focus to the next focusable field
          const form = formRef.current;
          if (!form) return;
          const focusable = Array.from(
            form.querySelectorAll<HTMLElement>(
              "input:not([type=hidden]):not([type=checkbox]), select, textarea, button[type=submit]"
            )
          );
          const idx = focusable.indexOf(e.target as HTMLElement);
          if (idx >= 0 && idx < focusable.length - 1) {
            focusable[idx + 1].focus();
          }
        }
      }}
    >
      <input type="hidden" name="status" value={listing?.status ?? "DRAFT"} />

      {(error || activateError) && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {String(error || activateError)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            name="title"
            label="Title"
            defaultValue={listing?.title ?? ""}
            required
            placeholder="e.g. Sunny 2BR in Williamsburg"
          />
        </div>
        <Select
          name="type"
          label="Type"
          defaultValue={listing?.type ?? "RENTAL"}
          options={TYPE_OPTIONS}
          onValueChange={setListingType}
        />
        <div /> {/* spacer */}
        {/* Address fields */}
        <div className="md:col-span-2">
          <AddressAutocomplete
            name="address"
            label="Address"
            defaultValue={listing?.address}
            required
            onBlur={(value) => {
              if (value.trim() && value !== selectedAddress) {
                checkBuildingAmenities(value);
              }
            }}
            onPlaceSelect={(place) => {
              checkBuildingAmenities(place.address);
              if (cityRef.current) {
                cityRef.current.value = place.city;
                // Trigger change event so React picks up the value
                cityRef.current.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
              }
              if (stateRef.current) {
                stateRef.current.value = place.state;
                stateRef.current.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
              }
              if (zipCodeRef.current) {
                zipCodeRef.current.value = place.zipCode;
                zipCodeRef.current.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
              }
              if (neighborhoodRef.current) {
                neighborhoodRef.current.value = place.neighborhood;
                neighborhoodRef.current.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
              }
              const match = place.borough
                ? BOROUGHS.find(
                    (b) => b.toLowerCase() === place.borough.toLowerCase()
                  )
                : undefined;
              setBorough(match ?? "N/A");
            }}
          />
        </div>
        <Input name="unit" label="Unit" defaultValue={listing?.unit ?? ""} />
        <Input
          ref={cityRef}
          name="city"
          label="City"
          defaultValue={listing?.city ?? ""}
          required
        />
        <Input
          ref={stateRef}
          name="state"
          label="State"
          defaultValue={listing?.state ?? "NY"}
          required
          pattern="[A-Z]{2}"
          maxLength={2}
          title="2-letter state code (e.g. NY)"
        />
        <Input
          ref={zipCodeRef}
          name="zipCode"
          label="Zip Code"
          defaultValue={listing?.zipCode ?? ""}
          required
          pattern="\d{5}"
          title="5-digit zip code"
        />
        <Input
          ref={neighborhoodRef}
          name="neighborhood"
          label="Neighborhood"
          defaultValue={listing?.neighborhood ?? ""}
        />
        <Select
          name="borough"
          label="Borough"
          value={borough}
          onValueChange={setBorough}
          options={BOROUGH_OPTIONS}
        />
        <div className="md:col-span-2">
          <Textarea
            name="description"
            label="Description"
            defaultValue={listing?.description}
            required
            rows={4}
          />
        </div>
        <Input
          name="price"
          label="Price (dollars)"
          type="number"
          step="1"
          min="1"
          defaultValue={priceInDollars}
          required
        />
        <Input
          name="bedrooms"
          label="Bedrooms (0 = Studio)"
          type="number"
          min="0"
          max="20"
          step="1"
          defaultValue={listing?.bedrooms ?? 0}
          required
          onChange={(e) => setCurrentBeds(Number(e.target.value) || 0)}
        />
        <Input
          name="bathrooms"
          label="Bathrooms"
          type="number"
          min="0"
          max="20"
          step="0.5"
          defaultValue={listing?.bathrooms ?? ""}
          required
          onChange={(e) => setCurrentBaths(Number(e.target.value) || 0)}
        />
        <Input
          name="sqft"
          label="Sqft"
          type="number"
          min="0"
          defaultValue={listing?.sqft ?? ""}
        />
        <Input
          name="availableDate"
          label="Available Date"
          type="date"
          defaultValue={
            listing?.availableDate
              ? listing.availableDate.toISOString().split("T")[0]
              : ""
          }
          required
        />
        <Input
          name="sourceUrl"
          label="Source URL"
          type="url"
          defaultValue={listing?.sourceUrl ?? ""}
          placeholder="https://streeteasy.com/..."
        />
        <Input
          name="op"
          label="OP"
          type="number"
          step="any"
          min="0"
          defaultValue={listing?.op ?? ""}
        />
        {listingType === "RENTAL" && (
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Concessions
            </label>
            <div className="flex items-center gap-2">
              <Input
                name="freeMonths"
                type="number"
                min="0"
                step="1"
                defaultValue={listing?.freeMonths ?? ""}
                placeholder="1"
                className="w-20"
              />
              <span className="text-sm text-gray-400">free months on a</span>
              <Input
                name="leaseDuration"
                type="number"
                min="1"
                step="1"
                defaultValue={listing?.leaseDuration ?? ""}
                placeholder="12"
                className="w-20"
              />
              <span className="text-sm text-gray-400">mo lease</span>
            </div>
          </div>
        )}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <input
              name="noFee"
              type="checkbox"
              defaultChecked={listing?.noFee ?? false}
              className="rounded"
            />
            No Fee
          </label>
        </div>
        <Input
          name="estimatedUtilities"
          label="Estimated Utilities"
          defaultValue={listing?.estimatedUtilities ?? ""}
          placeholder="$150/month"
        />
        <Select
          name="petPolicy"
          label="Pet Policy"
          defaultValue={listing?.petPolicy ?? ""}
          options={PET_POLICY_OPTIONS}
        />
        <Input
          name="petPolicyDetails"
          label="Pet Fees / Details"
          defaultValue={listing?.petPolicyDetails ?? ""}
          placeholder="$500 deposit, 25lb limit"
        />
        <Input
          name="parking"
          label="Parking"
          defaultValue={listing?.parking ?? ""}
          placeholder="Street parking, garage $200/mo, no parking"
        />
        <div className="md:col-span-2">
          <AmenitiesPicker
            ref={amenitiesRef}
            defaultValue={listing?.amenities ?? []}
            label={
              listingType === "SALE" ? "Features" : "Amenities"
            }
          />
          {selectedAddress && (
            <div className="mt-2 flex items-center gap-2">
              {buildingAmenities && buildingAmenities.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    amenitiesRef.current?.loadAmenities(buildingAmenities);
                  }}
                >
                  <Building2 className="mr-1.5 h-3.5 w-3.5" />
                  Load building amenities ({buildingAmenities.length})
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={amenitySaveStatus === "saving"}
                onClick={async () => {
                  const amenities =
                    amenitiesRef.current?.getAmenities() ?? [];
                  if (amenities.length === 0) return;

                  if (
                    buildingAmenities &&
                    buildingAmenities.length > 0 &&
                    !window.confirm(
                      `This will overwrite the existing ${buildingAmenities.length} building amenities for "${selectedAddress}". Continue?`
                    )
                  )
                    return;

                  setAmenitySaveStatus("saving");
                  const result = await saveBuildingAmenitiesAction(
                    selectedAddress,
                    amenities,
                    buildingInfo ?? undefined
                  );
                  if (result.success) {
                    setBuildingAmenities(amenities);
                    setAmenitySaveStatus("saved");
                    setTimeout(() => setAmenitySaveStatus("idle"), 2000);
                  } else {
                    setAmenitySaveStatus("error");
                  }
                }}
              >
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                {amenitySaveStatus === "saving"
                  ? "Saving..."
                  : amenitySaveStatus === "saved"
                    ? "Saved!"
                    : "Save as building amenities"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Building Information */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Input
          label={`Year Built${plutoLoading ? " (looking up...)" : ""}`}
          type="number"
          min="1800"
          max="2100"
          value={buildingInfo?.yearBuilt ?? ""}
          onChange={(e) =>
            setBuildingInfo((prev) => ({
              yearBuilt: e.target.value ? Number(e.target.value) : null,
              numFloors: prev?.numFloors ?? null,
              totalUnits: prev?.totalUnits ?? null,
            }))
          }
        />
        <Input
          label="Floors"
          type="number"
          min="1"
          value={buildingInfo?.numFloors ?? ""}
          onChange={(e) =>
            setBuildingInfo((prev) => ({
              yearBuilt: prev?.yearBuilt ?? null,
              numFloors: e.target.value ? Number(e.target.value) : null,
              totalUnits: prev?.totalUnits ?? null,
            }))
          }
        />
        <Input
          label="Total Units"
          type="number"
          min="1"
          value={buildingInfo?.totalUnits ?? ""}
          onChange={(e) =>
            setBuildingInfo((prev) => ({
              yearBuilt: prev?.yearBuilt ?? null,
              numFloors: prev?.numFloors ?? null,
              totalUnits: e.target.value ? Number(e.target.value) : null,
            }))
          }
        />
      </div>

      {/* Photo upload */}
      <div className="rounded-lg border border-white/10 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Photos</h3>
        <PhotoUpload
          ref={photoUploadRef}
          listingId={currentListingId ?? undefined}
          photos={listing?.photos ?? []}
          onChange={(p) => {
            photosRef.current = p;
          }}
          ensureListingId={enableAutosave ? ensureDraft : undefined}
        />
        <div className="mt-3">
          <GenerateViewsButton
            listingId={currentListingId ?? undefined}
            bedrooms={currentBeds}
            bathrooms={currentBaths}
            photos={photosRef.current}
            listingType={listingType}
            ensureListingId={enableAutosave ? ensureDraft : undefined}
            onPhotosGenerated={(newPhotos) => {
              photoUploadRef.current?.addPhotos(newPhotos);
            }}
          />
        </div>
      </div>

      {/* Floor plans upload */}
      <div className="rounded-lg border border-white/10 p-4">
        <h3 className="mb-3 text-sm font-semibold text-white">Floor Plans</h3>
        <PhotoUpload
          listingId={currentListingId ?? undefined}
          photos={listing?.floorPlans ?? []}
          onSave={updateListingFloorPlansAction}
          uploadLabel="Upload Floor Plans"
          emptyLabel="No floor plans yet. Upload floor plan images for this listing."
          showPrimary={false}
          acceptVideo={false}
          onChange={(p) => {
            floorPlansRef.current = p;
          }}
          ensureListingId={enableAutosave ? ensureDraft : undefined}
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            name="featured"
            type="checkbox"
            defaultChecked={listing?.featured ?? false}
            className="rounded"
          />
          Featured on Homepage
        </label>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending || isActivating}>
          {isPending
            ? "Saving..."
            : mode === "edit"
              ? "Update Listing"
              : "Create Listing"}
        </Button>

        {isDraft && listing?.id && (
          <Button
            type="button"
            variant="outline"
            disabled={isPending || isActivating}
            onClick={async () => {
              if (!formRef.current) return;
              setActivateError(null);
              setIsActivating(true);
              try {
                const formData = new FormData(formRef.current);
                await activateDraftAction(listing.id, formData);
              } catch (e) {
                if (typeof e === "object" && e !== null && "digest" in e)
                  throw e;
                setActivateError(
                  e instanceof Error ? e.message : "Activation failed"
                );
                setIsActivating(false);
              }
            }}
          >
            {isActivating ? "Activating..." : "Activate Listing"}
          </Button>
        )}

        {enableAutosave && (
          <span className="text-xs text-gray-500">
            {saveStatus === "saving" && "Saving draft..."}
            {saveStatus === "saved" &&
              lastSavedAt &&
              `Draft saved at ${lastSavedAt.toLocaleTimeString()}`}
            {saveStatus === "error" && (
              <span className="text-red-500">Autosave failed</span>
            )}
          </span>
        )}
      </div>
    </form>
  );
}
