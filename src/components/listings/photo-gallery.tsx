"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Play, X, ChevronLeft, ChevronRight } from "lucide-react";
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

function AllPhotosModal({
  photos,
  title,
  initialIndex,
  onClose,
}: {
  photos: ListingPhoto[];
  title: string;
  initialIndex: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose, goNext, goPrev]);

  const photo = photos[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* Top bar */}
      <div className="flex h-12 flex-shrink-0 items-center justify-between px-4">
        <div className="rounded-full bg-black/50 px-3 py-1.5 text-sm text-white">
          {currentIndex + 1} / {photos.length}
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main image area - fills remaining space between top bar and thumbnails */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14">
        {photos.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={goNext}
              className="absolute right-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}

        <div className="relative h-full w-full max-w-5xl">
          {photo.type === "video" ? (
            <video
              key={photo.url}
              src={photo.url}
              controls
              autoPlay
              className="h-full w-full object-contain"
            />
          ) : (
            <Image
              key={photo.url}
              src={photo.url}
              alt={photo.alt ?? `${title} - Photo ${currentIndex + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          )}
        </div>
      </div>

      {/* Thumbnail strip */}
      <div className="flex flex-shrink-0 justify-center p-3">
        <div className="flex gap-2 overflow-x-auto rounded-lg bg-black/50 p-2 backdrop-blur-sm">
          {photos.map((p, i) => (
            <button
              key={p.url}
              onClick={() => setCurrentIndex(i)}
              className={`relative h-14 w-14 flex-shrink-0 overflow-hidden rounded transition-all ${
                i === currentIndex
                  ? "ring-2 ring-white"
                  : "opacity-50 hover:opacity-80"
              }`}
            >
              {p.type === "video" ? (
                <video
                  src={p.url}
                  muted
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={p.url}
                  alt={p.alt ?? `Thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  if (photos.length === 0) return null;

  const hasMore = photos.length > 5;
  const remainingCount = photos.length - 5;

  function openModal(index: number) {
    setModalIndex(index);
    setModalOpen(true);
  }

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-2 md:grid-cols-2">
        <div
          className="relative aspect-[4/3] cursor-pointer overflow-hidden"
          onClick={() => openModal(0)}
        >
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
                className="relative aspect-[4/3] cursor-pointer overflow-hidden"
                onClick={() => openModal(i + 1)}
              >
                <MediaItem
                  photo={photo}
                  alt={photo.alt ?? `Photo ${i + 2}`}
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                {hasMore && i === 3 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 transition-colors hover:bg-black/60">
                    <span className="text-lg font-semibold text-white">
                      +{remainingCount} more
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <AllPhotosModal
          photos={photos}
          title={title}
          initialIndex={modalIndex}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
