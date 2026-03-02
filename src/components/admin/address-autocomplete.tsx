"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { cn } from "@/lib/utils";

interface PlaceResult {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  neighborhood: string;
  borough: string;
}

interface AddressAutocompleteProps {
  name?: string;
  label?: string;
  defaultValue?: string;
  required?: boolean;
  onPlaceSelect?: (place: PlaceResult) => void;
  onBlur?: (value: string) => void;
}

const NYC_COUNTY_TO_BOROUGH: Record<string, string> = {
  "New York County": "Manhattan",
  "Kings County": "Brooklyn",
  "Queens County": "Queens",
  "Bronx County": "Bronx",
  "Richmond County": "Staten Island",
  // Also handle without "County" suffix
  "New York": "Manhattan",
  Kings: "Brooklyn",
  Queens: "Queens",
  Bronx: "Bronx",
  Richmond: "Staten Island",
};

// Minimal types for the new Places API (not yet in @types/google.maps)
interface AddressComponent {
  types: string[];
  longText: string;
  shortText: string;
}

interface PlaceObject {
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
  addressComponents?: AddressComponent[];
  location?: google.maps.LatLng;
}

interface Suggestion {
  placePrediction?: {
    placeId: string;
    text: { text: string };
    mainText: { text: string };
    secondaryText: { text: string };
    toPlace: () => PlaceObject;
  };
}

interface AutocompleteSuggestionApi {
  fetchAutocompleteSuggestions(opts: {
    input: string;
    includedRegionCodes?: string[];
    includedPrimaryTypes?: string[];
  }): Promise<{ suggestions: Suggestion[] }>;
}

function getComponent(components: AddressComponent[], type: string): string {
  return components.find((c) => c.types.includes(type))?.longText ?? "";
}

function getComponentShort(
  components: AddressComponent[],
  type: string
): string {
  return components.find((c) => c.types.includes(type))?.shortText ?? "";
}

function parsePlaceResult(components: AddressComponent[]): PlaceResult {
  const streetNumber = getComponent(components, "street_number");
  const route = getComponent(components, "route");
  const address = [streetNumber, route].filter(Boolean).join(" ");

  const city =
    getComponent(components, "locality") ||
    getComponent(components, "sublocality");

  const state = getComponentShort(components, "administrative_area_level_1");
  const zipCode = getComponent(components, "postal_code");

  const neighborhood = getComponent(components, "neighborhood");

  const county = getComponent(components, "administrative_area_level_2");
  const sublocality = getComponent(components, "sublocality");
  const borough =
    NYC_COUNTY_TO_BOROUGH[county] || NYC_COUNTY_TO_BOROUGH[sublocality] || "";

  return { address, city, state, zipCode, neighborhood, borough };
}

async function reverseGeocodeNeighborhood(
  location: google.maps.LatLng
): Promise<string | null> {
  try {
    await importLibrary("geocoding");
    const geocoder = new google.maps.Geocoder();
    const response = await geocoder.geocode({
      location: { lat: location.lat(), lng: location.lng() },
    });

    for (const result of response.results) {
      if (result.types.includes("neighborhood")) {
        const comp = result.address_components.find((c) =>
          c.types.includes("neighborhood")
        );
        if (comp) return comp.long_name;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Store predictions for selection by index
interface StoredPrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  toPlace: () => PlaceObject;
}

export function AddressAutocomplete({
  name = "address",
  label,
  defaultValue = "",
  required,
  onPlaceSelect,
  onBlur,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [predictions, setPredictions] = useState<StoredPrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [apiReady, setApiReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Load Google Maps Places (New) API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    setOptions({ key: apiKey, v: "weekly" });

    importLibrary("places")
      .then(() => {
        setApiReady(true);
      })
      .catch(() => {
        // Silently fall back to plain text input
      });
  }, []);

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!apiReady || !input.trim()) {
        setPredictions([]);
        setOpen(false);
        return;
      }

      try {
        const AutocompleteSuggestion = (
          google.maps.places as unknown as { AutocompleteSuggestion: AutocompleteSuggestionApi }
        ).AutocompleteSuggestion;

        const { suggestions } =
          (await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            includedRegionCodes: ["us"],
            includedPrimaryTypes: ["street_address", "subpremise", "premise"],
          })) as { suggestions: Suggestion[] };

        const mapped: StoredPrediction[] = (suggestions ?? [])
          .filter((s: Suggestion) => s.placePrediction)
          .map((s: Suggestion) => ({
            placeId: s.placePrediction!.placeId,
            mainText: s.placePrediction!.mainText.text,
            secondaryText: s.placePrediction!.secondaryText.text,
            fullText: s.placePrediction!.text.text,
            toPlace: s.placePrediction!.toPlace.bind(s.placePrediction),
          }));

        setPredictions(mapped);
        setOpen(mapped.length > 0);
        setActiveIndex(-1);
      } catch {
        setPredictions([]);
        setOpen(false);
      }
    },
    [apiReady]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (!apiReady) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const selectPrediction = useCallback(
    async (prediction: StoredPrediction) => {
      setInputValue(prediction.fullText);
      setPredictions([]);
      setOpen(false);

      try {
        const place = prediction.toPlace();
        await place.fetchFields({
          fields: ["addressComponents", "location"],
        });

        if (place.addressComponents) {
          const parsed = parsePlaceResult(place.addressComponents);
          if (!parsed.address) {
            parsed.address = prediction.mainText;
          }

          // Reverse geocode for neighborhood if Places API didn't return one
          if (!parsed.neighborhood && place.location) {
            const neighborhood = await reverseGeocodeNeighborhood(
              place.location
            );
            if (neighborhood) {
              parsed.neighborhood = neighborhood;
            }
          }

          setInputValue(parsed.address);
          onPlaceSelect?.(parsed);
        }
      } catch {
        // Place details failed, keep the full text as address
      }
    },
    [onPlaceSelect]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || predictions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i < predictions.length - 1 ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : predictions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectPrediction(predictions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1 block text-sm font-medium text-white/80">
          {label}
        </label>
      )}

      <input type="hidden" name={name} value={inputValue} />

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={() => onBlur?.(inputValue)}
        required={required}
        autoComplete="off"
        className={cn(
          "w-full border bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/30 transition-colors focus:outline-none focus:ring-1",
          "border-white/10 focus:border-white/30 focus:ring-white/20"
        )}
      />

      {open && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-white/10 bg-neutral-900 py-1 shadow-xl">
          {predictions.map((prediction, index) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => selectPrediction(prediction)}
              className={cn(
                "flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-white/10",
                index === activeIndex
                  ? "bg-white/10 text-white"
                  : "text-white/60"
              )}
            >
              <span className="font-medium text-white">
                {prediction.mainText}
              </span>
              <span className="text-xs text-white/40">
                {prediction.secondaryText}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
