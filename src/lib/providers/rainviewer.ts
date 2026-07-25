import { RAINVIEWER } from "@/config/sources";

export type RainViewerFrame = { time: string; path: string };
export type RainViewerMetadata = { generatedAt: string; host: string; frames: RainViewerFrame[] };
let cachedMetadata: { value: RainViewerMetadata; expiresAt: number } | undefined;

function safeHost(value: unknown) {
  if (typeof value !== "string") return undefined;
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "tilecache.rainviewer.com" || url.hostname.endsWith(".rainviewer.com")) ? url.origin : undefined; } catch { return undefined; }
}

export function parseRainViewerMetadata(value: unknown): RainViewerMetadata {
  const input = value as { generated?: unknown; host?: unknown; radar?: { past?: unknown } };
  const host = safeHost(input?.host); const past = input?.radar?.past;
  if (!host || !Array.isArray(past)) throw new Error("RainViewer metadata has an unsupported shape.");
  const frames = past.flatMap((frame) => {
    const candidate = frame as { time?: unknown; path?: unknown };
    const epoch = typeof candidate.time === "number" ? candidate.time : Number(candidate.time);
    if (!Number.isFinite(epoch) || typeof candidate.path !== "string" || !/^\/v2\/radar\/[A-Za-z0-9_-]+$/.test(candidate.path)) return [];
    return [{ time: new Date(epoch * 1_000).toISOString(), path: candidate.path }];
  });
  if (!frames.length) throw new Error("RainViewer returned no historical radar frames.");
  return { generatedAt: new Date(Number(input.generated) * 1_000).toISOString(), host, frames };
}

export async function getRainViewerMetadata() {
  if (cachedMetadata && cachedMetadata.expiresAt > Date.now()) return cachedMetadata.value;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(RAINVIEWER.metadataEndpoint, { signal: controller.signal, cache: "no-store", headers: { accept: "application/json" } });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.includes("application/json")) throw new Error(`RainViewer metadata response: ${response.status}`);
    const value = parseRainViewerMetadata(await response.json());
    cachedMetadata = { value, expiresAt: Date.now() + 2 * 60_000 };
    return value;
  } finally { clearTimeout(timeout); }
}

export function rainViewerTileUrl(host: string, path: string) {
  if (!safeHost(host) || !/^\/v2\/radar\/[A-Za-z0-9_-]+$/.test(path)) throw new Error("Unsafe RainViewer tile URL.");
  return `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;
}

/** Official RainViewer coverage mask; opaque pixels indicate published radar coverage. */
export function rainViewerCoverageTileUrl(host: string) {
  if (!safeHost(host)) throw new Error("Unsafe RainViewer tile host.");
  return `${host}/v2/coverage/0/256/{z}/{x}/{y}/0/0_0.png`;
}

/** Official API also supports a rendered raster centred on a WGS84 point. */
export function rainViewerPointImageUrl(host: string, path: string, lat: number, lon: number, size = 512, zoom = 6) {
  if (!safeHost(host) || !/^\/v2\/radar\/[A-Za-z0-9_-]+$/.test(path)) throw new Error("Unsafe RainViewer image URL.");
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || size !== 256 && size !== 512 || zoom < 0 || zoom > 7) throw new Error("Invalid RainViewer image parameters.");
  return `${host}${path}/${size}/${zoom}/${lat.toFixed(4)}/${lon.toFixed(4)}/2/1_1.png`;
}
