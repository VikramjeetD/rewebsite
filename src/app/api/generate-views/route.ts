import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/firebase";
import { generateRoomView } from "@/lib/image-generation/generator";
import { put } from "@vercel/blob";
import { FieldValue } from "firebase-admin/firestore";
import type { ListingPhoto } from "@/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { listingId, photoUrls, room } = body as {
    listingId: string;
    photoUrls: string[];
    room: { id: string; label: string; prompt: string };
  };

  if (!listingId || !photoUrls?.length || !room?.id) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Verify listing exists and is RENTAL
  const db = getDb();
  const listingDoc = await db.collection("listings").doc(listingId).get();
  if (!listingDoc.exists) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  const listingData = listingDoc.data()!;
  if (listingData.type !== "RENTAL") {
    return NextResponse.json(
      { error: "Only rental listings support AI view generation" },
      { status: 400 }
    );
  }

  try {
    // Download reference images
    const imageBuffers = await Promise.all(
      photoUrls.map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to download image`);
        const arrayBuffer = await res.arrayBuffer();
        return {
          data: Buffer.from(arrayBuffer),
          mimeType: res.headers.get("content-type") || "image/jpeg",
        };
      })
    );

    // Generate the room view
    const result = await generateRoomView(imageBuffers, room);

    if (!result) {
      return NextResponse.json(
        { error: `Failed to generate image for ${room.label}` },
        { status: 500 }
      );
    }

    // Upload to Vercel Blob
    const buffer = Buffer.from(result.data, "base64");
    const ext = result.mimeType === "image/png" ? "png" : "jpg";
    const blob = await put(
      `listings/${listingId}/ai-${room.id}-${Date.now()}.${ext}`,
      buffer,
      { access: "public", contentType: result.mimeType }
    );

    const existingPhotos = (listingData.photos as ListingPhoto[]) ?? [];
    const newPhoto: ListingPhoto = {
      url: blob.url,
      alt: `AI generated: ${room.label}`,
      order: existingPhotos.length,
      isPrimary: false,
      type: "image",
    };

    // Append to listing photos
    await db
      .collection("listings")
      .doc(listingId)
      .update({
        photos: [...existingPhotos, newPhoto],
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ photo: newPhoto });
  } catch (err) {
    console.error(`[generate-views] Error for ${room.id}:`, err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate image",
      },
      { status: 500 }
    );
  }
}
