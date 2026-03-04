"use client";

import {
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useRef,
} from "react";
import {
  AMENITY_CATALOG,
  AMENITY_MAP,
  normalizeAmenityKey,
} from "@/lib/amenities";
import { Plus, X } from "lucide-react";

export interface AmenitiesPickerHandle {
  loadAmenities(amenities: string[]): void;
  getAmenities(): string[];
}

interface AmenitiesPickerProps {
  defaultValue?: string[];
  label?: string;
}

export const AmenitiesPicker = forwardRef<
  AmenitiesPickerHandle,
  AmenitiesPickerProps
>(function AmenitiesPicker({ defaultValue = [], label }, ref) {
  const [selected, setSelected] = useState<Set<string>>(() => {
    const normalized = defaultValue
      .map((a) => normalizeAmenityKey(a))
      .filter(Boolean);
    return new Set(normalized);
  });
  const [customAmenities, setCustomAmenities] = useState<string[]>(() => {
    // Any default values that don't match catalog entries become custom
    return defaultValue
      .map((a) => a.trim())
      .filter((a) => a && !AMENITY_MAP.has(normalizeAmenityKey(a)));
  });
  const [customInput, setCustomInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  const toggle = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const getAllAmenities = useCallback((): string[] => {
    const catalogKeys = Array.from(selected).filter((k) => AMENITY_MAP.has(k));
    return [...catalogKeys, ...customAmenities];
  }, [selected, customAmenities]);

  useImperativeHandle(
    ref,
    () => ({
      loadAmenities(amenities: string[]) {
        const newSelected = new Set<string>();
        const newCustom: string[] = [];
        for (const raw of amenities) {
          const key = normalizeAmenityKey(raw.trim());
          if (AMENITY_MAP.has(key)) {
            newSelected.add(key);
          } else if (raw.trim()) {
            newCustom.push(raw.trim());
          }
        }
        setSelected(newSelected);
        setCustomAmenities(newCustom);
      },
      getAmenities: getAllAmenities,
    }),
    [getAllAmenities]
  );

  const addCustom = useCallback(() => {
    const value = customInput.trim();
    if (!value) return;
    // Check if it matches a catalog entry
    const key = normalizeAmenityKey(value);
    if (AMENITY_MAP.has(key)) {
      setSelected((prev) => new Set(prev).add(key));
    } else if (!customAmenities.includes(value)) {
      setCustomAmenities((prev) => [...prev, value]);
    }
    setCustomInput("");
    customInputRef.current?.focus();
  }, [customInput, customAmenities]);

  const removeCustom = useCallback((value: string) => {
    setCustomAmenities((prev) => prev.filter((a) => a !== value));
  }, []);

  // Hidden input for form serialization
  const serialized = getAllAmenities().join(",");

  return (
    <div>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <input type="hidden" name="amenities" value={serialized} />

      <div className="space-y-4 rounded-lg border border-white/10 p-4">
        {AMENITY_CATALOG.map((category) => (
          <div key={category.name}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              {category.name}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {category.amenities.map((amenity) => {
                const isSelected = selected.has(amenity.key);
                const Icon = amenity.icon;
                return (
                  <button
                    key={amenity.key}
                    type="button"
                    onClick={() => toggle(amenity.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-white/20 text-white ring-1 ring-white/30"
                        : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {amenity.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Custom amenities */}
        {customAmenities.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Custom
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {customAmenities.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/30"
                >
                  {a}
                  <button
                    type="button"
                    onClick={() => removeCustom(a)}
                    className="ml-0.5 text-gray-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add custom amenity */}
        <div className="flex items-center gap-2">
          <input
            ref={customInputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add custom amenity..."
            className="flex-1 border-b border-white/10 bg-transparent px-1 py-1 text-xs text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
});
