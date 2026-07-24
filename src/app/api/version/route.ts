import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GITHUB_SHA?.slice(0, 7) ?? "local";
  const deployment = process.env.VERCEL_URL ?? "local";
  return NextResponse.json({ commit, deployment }, { headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
