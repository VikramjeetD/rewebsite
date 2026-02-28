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
import { autosaveDraftAction } from "@/actions/listings";
import { BOROUGHS, LISTING_STATUSES } from "@/lib/constants";
import type { Listing } from "@/types";

const TYPE_OPTIONS = [
  { value: "RENTAL", label: "Rental" },
  { value: "SALE", label: "Sale" },
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
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ListingForm({
  listing,
  action,
  enableAutosave = false,
  onDraftCreated,
}: ListingFormProps) {
  const [error, formAction, isPending] = useActionState<
    string | null,
    FormData
  >(action, null);

  const formRef = useRef<HTMLFormElement>(null);
  const draftIdRef = useRef<string | null>(listing?.id ?? null);
  const lastSavedDataRef = useRef<string>("");
  const isSubmittingRef = useRef(false);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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
    const json = JSON.stringify(data);

    // Skip if nothing changed
    if (json === lastSavedDataRef.current) return;

    setSaveStatus("saving");
    try {
      const result = await autosaveDraftAction(draftIdRef.current, data);
      if (result.success && result.draftId) {
        lastSavedDataRef.current = json;
        setLastSavedAt(new Date());
        setSaveStatus("saved");

        if (!draftIdRef.current && result.draftId) {
          draftIdRef.current = result.draftId;
          onDraftCreated?.(result.draftId);
        }
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, [collectFormData, onDraftCreated]);

  useEffect(() => {
    if (!enableAutosave) return;

    const interval = setInterval(performAutosave, 3000);
    return () => clearInterval(interval);
  }, [enableAutosave, performAutosave]);

  // Price in dollars for display
  const priceInDollars = listing ? listing.price / 100 : "";

  return (
    <form
      ref={formRef}
      action={(formData) => {
        isSubmittingRef.current = true;
        formAction(formData);
      }}
      className="space-y-6"
    >
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {String(error)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            name="title"
            label="Title"
            defaultValue={listing?.title}
            required
          />
        </div>

        <div className="md:col-span-2">
          <Textarea
            name="description"
            label="Description"
            defaultValue={listing?.description}
            required
            rows={4}
          />
        </div>

        <Select
          name="type"
          label="Type"
          defaultValue={listing?.type ?? "RENTAL"}
          options={TYPE_OPTIONS}
        />

        <Select
          name="status"
          label="Status"
          defaultValue={listing?.status ?? "DRAFT"}
          options={LISTING_STATUSES}
        />

        <Input
          name="price"
          label="Price (dollars)"
          type="number"
          step="1"
          min="0"
          defaultValue={priceInDollars}
          required
        />

        <Input
          name="priceUnit"
          label='Price Unit (e.g., "month" for rentals)'
          defaultValue={listing?.priceUnit ?? ""}
          placeholder="month"
        />

        <Input
          name="bedrooms"
          label="Bedrooms (0 = Studio)"
          type="number"
          min="0"
          max="20"
          defaultValue={listing?.bedrooms ?? 0}
        />

        <Input
          name="bathrooms"
          label="Bathrooms"
          type="number"
          min="0"
          max="20"
          step="0.5"
          defaultValue={listing?.bathrooms ?? 1}
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
        />

        <div className="md:col-span-2">
          <Input
            name="address"
            label="Address"
            defaultValue={listing?.address}
            required
          />
        </div>

        <Input name="unit" label="Unit" defaultValue={listing?.unit ?? ""} />

        <Input
          name="neighborhood"
          label="Neighborhood"
          defaultValue={listing?.neighborhood}
          required
        />

        <Select
          name="borough"
          label="Borough"
          defaultValue={listing?.borough ?? "Manhattan"}
          options={BOROUGH_OPTIONS}
        />

        <Input
          name="zipCode"
          label="Zip Code"
          defaultValue={listing?.zipCode ?? ""}
        />

        <Input
          name="sourceUrl"
          label="Source URL"
          type="url"
          defaultValue={listing?.sourceUrl ?? ""}
          placeholder="https://streeteasy.com/..."
        />

        <div className="md:col-span-2">
          <Input
            name="amenities"
            label="Amenities (comma-separated)"
            defaultValue={listing?.amenities.join(", ") ?? ""}
            placeholder="Doorman, Gym, Roof Deck, Laundry"
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
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Saving..."
            : listing
              ? "Update Listing"
              : "Create Listing"}
        </Button>

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
