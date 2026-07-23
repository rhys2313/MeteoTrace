import { NextResponse } from "next/server";
import { COPERNICUS } from "@/config/sources";
export const runtime = "nodejs";
/** Server-only OAuth readiness check. Scene querying is disabled until credentials are configured. */
export async function GET() {
  const clientId = process.env.COPERNICUS_CLIENT_ID; const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ status: "credentials_required", setup: "Create an OAuth client in Copernicus Data Space Ecosystem, then set COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET in Vercel environment variables." }, { status: 424 });
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
  try { const response = await fetch(COPERNICUS.tokenEndpoint, { method: "POST", body, headers: { "content-type": "application/x-www-form-urlencoded" }, cache: "no-store" }); if (!response.ok) return NextResponse.json({ status: "authorization_failed" }, { status: 502 }); return NextResponse.json({ status: "ready", catalogue: COPERNICUS.catalogueEndpoint }); }
  catch { return NextResponse.json({ status: "unavailable" }, { status: 503 }); }
}
