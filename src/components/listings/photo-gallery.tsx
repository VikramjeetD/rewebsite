"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import type { ListingPhoto } from "@/types";

interface PhotoGalleryProps {
  photos: ListingPhoto[];
  title: string;
}

function MediaItem({
  photo,
  alt,
  priority,
  sizes,
}: {
  photo: ListingPhoto;
  alt: string;
  priority?: boolean;
  sizes: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (photo.type === "video") {
    return (
      <div className="relative h-full w-full">
        {playing ? (
          <video
            src={photo.url}
            controls
            autoPlay
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <video
              src={photo.url}
              muted
              preload="metadata"
              className="h-full w-full object-cover"
            />
            <button
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center transition-colors hover:bg-black/20"
            >
              <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm">
                <Play className="h-8 w-8 text-white" fill="white" />
              </div>
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <Image
      src={photo.url}
      alt={alt}
      fill
      className="object-cover transition-transform duration-500 hover:scale-105"
      priority={priority}
      sizes={sizes}
    />
  );
}

export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="mb-8 grid grid-cols-1 gap-2 md:grid-cols-2">
      <div className="relative aspect-[4/3] overflow-hidden">
        <MediaItem
          photo={photos[0]}
          alt={photos[0].alt ?? title}
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      {photos.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.slice(1, 5).map((photo, i) => (
            <div
              key={photo.url}
              className="relative aspect-[4/3] overflow-hidden"
            >
              <MediaItem
                photo={photo}
                alt={photo.alt ?? `Photo ${i + 2}`}
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
