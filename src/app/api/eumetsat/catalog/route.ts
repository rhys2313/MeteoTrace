import { NextResponse } from "next/server";
import { getEumetsatCatalog } from "@/lib/providers/eumetsat";
export const runtime = "nodejs";

export async function GET() {
  try { return NextResponse.json(await getEumetsatCatalog(), { headers: { "cache-control": "public, max-age=120", "x-content-type-options": "nosniff" } }); }
  catch (error) { return NextResponse.json({ error: "EUMETView catalogue is temporarily unavailable.", source: "EUMETSAT", retryable: true, detail: error instanceof Error ? error.message : undefined }, { status: 503, headers: { "cache-control": "no-store" } }); }
}
