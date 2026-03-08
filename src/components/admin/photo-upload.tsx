"use client";

import {
  useId,
  useState,
  useTransition,
  forwardRef,
  useImperativeHandle,
} from "react";
import { updateListingPhotosAction } from "@/actions/listings";
import { Upload, X, GripVertical, Play, Eye, EyeOff } from "lucide-react";
import type { ListingPhoto } from "@/types";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface PhotoUploadHandle {
  addPhotos(photos: ListingPhoto[]): void;
}

interface PhotoUploadProps {
  listingId?: string;
  photos: ListingPhoto[];
  onSave?: (id: string, photos: ListingPhoto[]) => Promise<void>;
  onChange?: (photos: ListingPhoto[]) => void;
  ensureListingId?: () => Promise<string>;
  uploadLabel?: string;
  emptyLabel?: string;
  showPrimary?: boolean;
  acceptVideo?: boolean;
}

function SortablePhoto({
  photo,
  index,
  onRemove,
  onSetPrimary,
  onToggleHidden,
  showPrimary = true,
}: {
  photo: ListingPhoto;
  index: number;
  onRemove: (index: number) => void;
  onSetPrimary: (index: number) => void;
  onToggleHidden: (index: number) => void;
  showPrimary?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: photo.url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isVideo = photo.type === "video";
  const isHidden = photo.hidden === true;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative overflow-hidden border border-white/10 ${isHidden ? "opacity-40" : ""}`}
    >
      <div className="relative aspect-[4/3]">
        {isVideo ? (
          <>
            <video
              src={photo.url}
              muted
              preload="metadata"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-full bg-black/60 p-2">
                <Play className="h-5 w-5 text-white" fill="white" />
              </div>
            </div>
          </>
        ) : (
          <Image
            src={photo.url}
            alt={photo.alt ?? ""}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          />
        )}
        {isHidden && (
          <div className="absolute inset-0 flex items-center justify-center">
            <EyeOff className="h-8 w-8 text-white/60" />
          </div>
        )}
      </div>
      <div className="absolute inset-0 flex items-start justify-between bg-black/0 p-2 opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
        <div className="flex items-center gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab rounded bg-white/20 p-1 text-white backdrop-blur-sm hover:bg-white/30 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          {showPrimary && !isVideo && (
            <button
              type="button"
              onClick={() => onSetPrimary(index)}
              className={`px-2 py-1 text-xs font-medium ${
                photo.isPrimary
                  ? "bg-white text-black"
                  : "bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
              }`}
            >
              {photo.isPrimary ? "Primary" : "Set Primary"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleHidden(index)}
            className="rounded bg-white/20 p-1 text-white backdrop-blur-sm hover:bg-white/30"
            title={isHidden ? "Show on listing" : "Hide from listing"}
          >
            {isHidden ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-full bg-white/20 p-1 text-white backdrop-blur-sm hover:bg-red-500/50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export const PhotoUpload = forwardRef<PhotoUploadHandle, PhotoUploadProps>(
  function PhotoUpload(
    {
      listingId,
      photos: initialPhotos,
      onSave,
      onChange,
      ensureListingId,
      uploadLabel = "Upload Photos",
      emptyLabel = "No photos yet. Upload photos to showcase this listing.",
      showPrimary = true,
      acceptVideo = true,
    },
    ref
  ) {
    const dndId = useId();
    const [photos, setPhotos] = useState<ListingPhoto[]>(initialPhotos);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({
      completed: 0,
      total: 0,
    });
    const [isPending, startTransition] = useTransition();

    const saveFn = onSave ?? updateListingPhotosAction;

    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    function updatePhotos(newPhotos: ListingPhoto[]) {
      setPhotos(newPhotos);
      onChange?.(newPhotos);
      if (listingId) {
        startTransition(() => {
          saveFn(listingId, newPhotos);
        });
      }
    }

    useImperativeHandle(
      ref,
      () => ({
        addPhotos(incoming: ListingPhoto[]) {
          const merged = [...photos, ...incoming];
          merged.forEach((p, i) => (p.order = i));
          updatePhotos(merged);
        },
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [photos, listingId]
    );

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const total = files.length;
      setUploading(true);
      setUploadProgress({ completed: 0, total });

      if (!listingId && ensureListingId) {
        try {
          await ensureListingId();
        } catch {
          setUploading(false);
          setUploadProgress({ completed: 0, total: 0 });
          return;
        }
      }

      const newPhotos = [...photos];

      for (let i = 0; i < total; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const { url, mediaType } = await res.json();
          const isVideo = mediaType === "video";
          const hasImage = newPhotos.some((p) => p.type !== "video");
          newPhotos.push({
            url,
            alt: file.name,
            order: newPhotos.length,
            isPrimary: !isVideo && !hasImage,
            type: isVideo ? "video" : "image",
          });
        }

        setUploadProgress({ completed: i + 1, total });
      }

      setUploading(false);
      setUploadProgress({ completed: 0, total: 0 });
      updatePhotos(newPhotos);
      e.target.value = "";
    }

    function removePhoto(index: number) {
      const newPhotos = photos.filter((_, i) => i !== index);
      if (newPhotos.length > 0 && !newPhotos.some((p) => p.isPrimary)) {
        const firstImage = newPhotos.find((p) => p.type !== "video");
        if (firstImage) firstImage.isPrimary = true;
      }
      newPhotos.forEach((p, i) => (p.order = i));
      updatePhotos(newPhotos);
    }

    function setPrimary(index: number) {
      if (photos[index]?.type === "video") return;
      const newPhotos = photos.map((p, i) => ({
        ...p,
        isPrimary: i === index,
      }));
      updatePhotos(newPhotos);
    }

    function toggleHidden(index: number) {
      const newPhotos = photos.map((p, i) =>
        i === index ? { ...p, hidden: !p.hidden } : p
      );
      updatePhotos(newPhotos);
    }

    function handleDragEnd(event: DragEndEvent) {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = photos.findIndex((p) => p.url === active.id);
      const newIndex = photos.findIndex((p) => p.url === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newPhotos = [...photos];
      const [moved] = newPhotos.splice(oldIndex, 1);
      newPhotos.splice(newIndex, 0, moved);
      newPhotos.forEach((p, i) => (p.order = i));
      updatePhotos(newPhotos);
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            <input
              type="file"
              accept={
                acceptVideo
                  ? "image/*,video/mp4,video/webm,video/quicktime"
                  : "image/*"
              }
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : uploadLabel}
            </span>
          </label>
          {isPending && (
            <span className="text-sm text-white/40">Saving...</span>
          )}
        </div>

        {uploading && uploadProgress.total > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/60 transition-all duration-300"
                style={{
                  width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-white/40">
              {uploadProgress.completed} / {uploadProgress.total} uploaded
            </p>
          </div>
        )}

        {photos.length > 0 && (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={photos.map((p) => p.url)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo, index) => (
                  <SortablePhoto
                    key={photo.url}
                    photo={photo}
                    index={index}
                    onRemove={removePhoto}
                    onSetPrimary={setPrimary}
                    onToggleHidden={toggleHidden}
                    showPrimary={showPrimary}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {photos.length === 0 && (
          <p className="text-sm text-white/40">{emptyLabel}</p>
        )}
      </div>
    );
  }
);
