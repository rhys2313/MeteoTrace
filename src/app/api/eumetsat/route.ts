import { NextRequest, NextResponse } from "next/server";
import { EUMETSAT_WMS } from "@/config/sources";
import { validateWmsParams, wmsSearchParams } from "@/lib/wms";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  let params; try { params = validateWmsParams(request.nextUrl.searchParams); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid WMS request." }, { status: 400 }); }
  const upstream = new URL(EUMETSAT_WMS.endpoint); upstream.search = wmsSearchParams(params).toString();
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12_000);
  try { const response = await fetch(upstream, { signal: controller.signal, cache: "no-store", headers: { accept: params.request === "GetMap" ? "image/*" : "application/xml,text/xml" } }); if (!response.ok) throw new Error(`EUMETView replied ${response.status}`); return new NextResponse(response.body, { headers: { "content-type": response.headers.get("content-type") ?? (params.request === "GetMap" ? "image/jpeg" : "application/xml"), "cache-control": params.request === "GetMap" ? "public, max-age=300" : "public, max-age=900", "x-meteotrace-source": "EUMETSAT" } }); }
  catch { return NextResponse.json({ error: "EUMETView WMS is temporarily unavailable.", source: "EUMETSAT", retryable: true }, { status: 503 }); }
  finally { clearTimeout(timer); }
}
