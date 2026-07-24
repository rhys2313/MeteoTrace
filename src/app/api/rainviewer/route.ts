import { NextResponse } from "next/server";
import { getRainViewerMetadata } from "@/lib/providers/rainviewer";
export const runtime = "nodejs";

export async function GET() {
  try { return NextResponse.json(await getRainViewerMetadata(), { headers: { "cache-control": "public, max-age=60", "x-content-type-options": "nosniff" } }); }
  catch (error) { return NextResponse.json({ error: "RainViewer radar metadata is temporarily unavailable.", source: "RAINVIEWER", retryable: true, detail: error instanceof Error ? error.message : undefined }, { status: 503, headers: { "cache-control": "no-store" } }); }
}
