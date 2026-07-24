import { NextRequest, NextResponse } from "next/server";
import { EUMETSAT_WMS } from "@/config/sources";
import { getEumetsatCatalog } from "@/lib/providers/eumetsat";
import { validateWmsParams, wmsSearchParams } from "@/lib/wms";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestName = (request.nextUrl.searchParams.get("request") ?? request.nextUrl.searchParams.get("REQUEST"))?.toLowerCase();
  try {
    const catalog = requestName === "getmap" ? await getEumetsatCatalog() : undefined;
    const params = validateWmsParams(request.nextUrl.searchParams, catalog?.allowedLayerIds);
    const upstream = new URL(EUMETSAT_WMS.endpoint); upstream.search = wmsSearchParams(params).toString();
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(upstream, { signal: controller.signal, cache: "no-store", headers: { accept: params.request === "GetMap" ? "image/*" : "application/xml,text/xml" } });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || (params.request === "GetMap" ? !contentType.startsWith("image/") : !/xml|text\//i.test(contentType))) throw new Error(`EUMETView replied ${response.status}`);
      return new NextResponse(response.body, { headers: { "content-type": contentType || (params.request === "GetMap" ? "image/jpeg" : "application/xml"), "cache-control": params.request === "GetMap" ? "public, max-age=300" : "public, max-age=900", "x-content-type-options": "nosniff", "x-meteotrace-source": "EUMETSAT" } });
    } finally { clearTimeout(timer); }
  } catch (error) {
    return NextResponse.json({ error: "EUMETView WMS is temporarily unavailable.", source: "EUMETSAT", retryable: true, detail: error instanceof Error ? error.message : undefined }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
