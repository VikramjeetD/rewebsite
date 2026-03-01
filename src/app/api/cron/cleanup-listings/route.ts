import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getDb } from "@/lib/firebase";
import { cleanupListingFull } from "@/lib/cleanup";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const db = getDb();
  const snapshot = await db
    .collection("listings")
    .where("status", "==", "OFF_MARKET")
    .where("updatedAt", "<", Timestamp.fromDate(oneMonthAgo))
    .get();

  const results: { id: string; title: string }[] = [];

  // Sequential to avoid Vercel Blob API rate limits
  for (const doc of snapshot.docs) {
    const data = doc.data();
    await cleanupListingFull(doc.id);
    results.push({ id: doc.id, title: data.title ?? "Untitled" });
  }

  return NextResponse.json({
    deletedCount: results.length,
    deleted: results,
  });
}
