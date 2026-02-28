"use client";

import { useState, useTransition } from "react";
import { updateListingPhotosAction } from "@/actions/listings";
import { Upload, X } from "lucide-react";
import type { ListingPhoto } from "@/types";
import Image from "next/image";

interface PhotoUploadProps {
  listingId: string;
  photos: ListingPhoto[];
}

export function PhotoUpload({
  listingId,
  photos: initialPhotos,
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<ListingPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newPhotos = [...photos];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        newPhotos.push({
          url,
          alt: file.name,
          order: newPhotos.length,
          isPrimary: newPhotos.length === 0,
        });
      }
    }

    setPhotos(newPhotos);
    setUploading(false);
    startTransition(() => {
      updateListingPhotosAction(listingId, newPhotos);
    });

    // Reset the input
    e.target.value = "";
  }

  function removePhoto(index: number) {
    const newPhotos = photos.filter((_, i) => i !== index);
    // Re-set primary if needed
    if (newPhotos.length > 0 && !newPhotos.some((p) => p.isPrimary)) {
      newPhotos[0].isPrimary = true;
    }
    // Re-order
    newPhotos.forEach((p, i) => (p.order = i));
    setPhotos(newPhotos);
    startTransition(() => {
      updateListingPhotosAction(listingId, newPhotos);
    });
  }

  function setPrimary(index: number) {
    const newPhotos = photos.map((p, i) => ({ ...p, isPrimary: i === index }));
    setPhotos(newPhotos);
    startTransition(() => {
      updateListingPhotosAction(listingId, newPhotos);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload Photos"}
          </span>
        </label>
        {isPending && <span className="text-sm text-gray-500">Saving...</span>}
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo, index) => (
            <div
              key={photo.url}
              className="group relative overflow-hidden rounded-lg border border-gray-200"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={photo.url}
                  alt={photo.alt ?? ""}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                />
              </div>
              <div className="absolute inset-0 flex items-start justify-between bg-black/0 p-2 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
                <button
                  onClick={() => setPrimary(index)}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    photo.isPrimary
                      ? "bg-[var(--accent)] text-white"
                      : "bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {photo.isPrimary ? "Primary" : "Set Primary"}
                </button>
                <button
                  onClick={() => removePhoto(index)}
                  className="rounded-full bg-white p-1 text-gray-700 hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <p className="text-sm text-gray-500">
          No photos yet. Upload photos to showcase this listing.
        </p>
      )}
    </div>
  );
}
