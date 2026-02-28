"use client";

import {
  useActionState,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import { Button } from "@/components/ui/button";
import { autosaveDraftAction } from "@/actions/listings";
import type { Listing } from "@/types";

const boroughs = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];

const statuses = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "IN_CONTRACT", label: "In Contract" },
  { value: "RENTED", label: "Rented" },
  { value: "SOLD", label: "Sold" },
  { value: "OFF_MARKET", label: "Off Market" },
];

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
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            name="title"
            defaultValue={listing?.title}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            defaultValue={listing?.description}
            required
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Type
          </label>
          <select
            name="type"
            defaultValue={listing?.type ?? "RENTAL"}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="RENTAL">Rental</option>
            <option value="SALE">Sale</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            name="status"
            defaultValue={listing?.status ?? "DRAFT"}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Price (dollars)
          </label>
          <input
            name="price"
            type="number"
            step="1"
            min="0"
            defaultValue={priceInDollars}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Price Unit (e.g., &quot;month&quot; for rentals)
          </label>
          <input
            name="priceUnit"
            defaultValue={listing?.priceUnit ?? ""}
            placeholder="month"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Bedrooms (0 = Studio)
          </label>
          <input
            name="bedrooms"
            type="number"
            min="0"
            max="20"
            defaultValue={listing?.bedrooms ?? 0}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Bathrooms
          </label>
          <input
            name="bathrooms"
            type="number"
            min="0"
            max="20"
            step="0.5"
            defaultValue={listing?.bathrooms ?? 1}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Sqft
          </label>
          <input
            name="sqft"
            type="number"
            min="0"
            defaultValue={listing?.sqft ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Available Date
          </label>
          <input
            name="availableDate"
            type="date"
            defaultValue={
              listing?.availableDate
                ? listing.availableDate.toISOString().split("T")[0]
                : ""
            }
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            name="address"
            defaultValue={listing?.address}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Unit
          </label>
          <input
            name="unit"
            defaultValue={listing?.unit ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Neighborhood
          </label>
          <input
            name="neighborhood"
            defaultValue={listing?.neighborhood}
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Borough
          </label>
          <select
            name="borough"
            defaultValue={listing?.borough ?? "Manhattan"}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            {boroughs.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Zip Code
          </label>
          <input
            name="zipCode"
            defaultValue={listing?.zipCode ?? ""}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Source URL
          </label>
          <input
            name="sourceUrl"
            type="url"
            defaultValue={listing?.sourceUrl ?? ""}
            placeholder="https://streeteasy.com/..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Amenities (comma-separated)
          </label>
          <input
            name="amenities"
            defaultValue={listing?.amenities.join(", ") ?? ""}
            placeholder="Doorman, Gym, Roof Deck, Laundry"
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
