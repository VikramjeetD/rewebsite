"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { getRoomList } from "@/lib/image-generation/room-list";
import type { ListingPhoto } from "@/types";

interface GenerateViewsButtonProps {
  listingId: string | undefined;
  bedrooms: number;
  bathrooms: number;
  photos: ListingPhoto[];
  listingType: string;
  ensureListingId?: () => Promise<string>;
  onPhotosGenerated: (photos: ListingPhoto[]) => void;
}

type Status = "idle" | "selecting" | "generating" | "complete" | "failed";

export function GenerateViewsButton({
  listingId,
  bedrooms,
  bathrooms,
  photos,
  listingType,
  ensureListingId,
  onPhotosGenerated,
}: GenerateViewsButtonProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [successCount, setSuccessCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const imagePhotos = photos.filter((p) => p.type !== "video");
  const canGenerate =
    listingType === "RENTAL" && bathrooms > 0 && imagePhotos.length > 0;

  function openSelector() {
    const preselected = new Set(imagePhotos.slice(0, 6).map((p) => p.url));
    setSelectedUrls(preselected);
    setError(null);
    setStatus("selecting");
  }

  function togglePhoto(url: string) {
    setSelectedUrls((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else if (next.size < 6) {
        next.add(url);
      }
      return next;
    });
  }

  const handleGenerate = useCallback(async () => {
    if (selectedUrls.size === 0) return;
    setError(null);
    setStatus("generating");

    let id = listingId;
    if (!id && ensureListingId) {
      try {
        id = await ensureListingId();
      } catch {
        setError("Failed to create listing");
        setStatus("failed");
        return;
      }
    }
    if (!id) {
      setError("No listing ID");
      setStatus("failed");
      return;
    }

    const rooms = getRoomList(bedrooms, bathrooms);
    const photoUrls = Array.from(selectedUrls);
    let completed = 0;
    const generated: ListingPhoto[] = [];

    setProgress({ current: 0, total: rooms.length, label: rooms[0]?.label ?? "" });

    for (const room of rooms) {
      setProgress({ current: completed, total: rooms.length, label: room.label });

      try {
        const res = await fetch("/api/generate-views", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: id, photoUrls, room }),
        });

        const data = await res.json();

        if (res.ok && data.photo) {
          generated.push(data.photo);
          // Add photo to grid immediately
          onPhotosGenerated([data.photo]);
        } else {
          console.warn(`Failed to generate ${room.label}:`, data.error);
        }
      } catch (err) {
        console.warn(`Error generating ${room.label}:`, err);
      }

      completed++;
    }

    setSuccessCount(generated.length);
    setStatus(generated.length > 0 ? "complete" : "failed");
    if (generated.length === 0) {
      setError("No images could be generated. Check the server logs.");
    }
  }, [selectedUrls, listingId, ensureListingId, bedrooms, bathrooms, onPhotosGenerated]);

  if (!canGenerate) return null;

  if (status === "generating") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        <span className="text-sm text-white/70">
          Generating: {progress.label} ({progress.current + 1}/{progress.total})
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${((progress.current + 0.5) / progress.total) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
        <Sparkles className="h-4 w-4 text-emerald-400" />
        <span className="text-sm text-emerald-300">
          {successCount} AI-generated view{successCount !== 1 ? "s" : ""} added
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setStatus("idle");
            setSuccessCount(0);
          }}
        >
          Generate more
        </Button>
      </div>
    );
  }

  if (status === "selecting") {
    return (
      <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">
            Select reference photos for AI ({selectedUrls.size}/6)
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {imagePhotos.map((photo) => {
            const isSelected = selectedUrls.has(photo.url);
            return (
              <button
                key={photo.url}
                type="button"
                onClick={() => togglePhoto(photo.url)}
                className={`relative aspect-square overflow-hidden border-2 transition-all ${
                  isSelected
                    ? "border-blue-500"
                    : selectedUrls.size >= 6
                      ? "border-transparent opacity-40"
                      : "border-transparent hover:border-white/30"
                }`}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt ?? ""}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleGenerate}
            disabled={selectedUrls.size === 0}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Generate with {selectedUrls.size} photo{selectedUrls.size !== 1 ? "s" : ""}
          </Button>
          <span className="text-xs text-white/40">
            Select the best photos showing different rooms
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={openSelector}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        Generate Additional Views
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
