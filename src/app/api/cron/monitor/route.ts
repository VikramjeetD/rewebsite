import { NextRequest, NextResponse } from "next/server";
import { runMonitoringCycle } from "@/lib/monitoring/orchestrator";

export const maxDuration = 300; // 5 minutes max for cron

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runMonitoringCycle();
    return NextResponse.json({ success: true, summary });
  } catch (e) {
    console.error("Monitoring cron error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Monitoring failed" },
      { status: 500 }
    );
  }
}
