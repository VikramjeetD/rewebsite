import Image from "next/image";
import type { ListingPhoto } from "@/types";

interface PhotoGalleryProps {
  photos: ListingPhoto[];
  title: string;
}

export function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  if (photos.length === 0) return null;

  return (
    <div className="mb-8 grid grid-cols-1 gap-2 md:grid-cols-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-l-xl">
        <Image
          src={photos[0].url}
          alt={photos[0].alt ?? title}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      {photos.length > 1 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.slice(1, 5).map((photo, i) => (
            <div
              key={photo.url}
              className={`relative aspect-[4/3] overflow-hidden ${
                i === 1 ? "rounded-tr-xl" : ""
              } ${i === 3 ? "rounded-br-xl" : ""}`}
            >
              <Image
                src={photo.url}
                alt={photo.alt ?? `Photo ${i + 2}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
