import { EUMETSAT_WMS } from "@/config/sources";
import { ProviderProduct } from "@/lib/providers/types";

type Layer = ProviderProduct & { crs: string[]; timeDimension?: string };
export type EumetsatCatalog = {
  fetchedAt: string;
  products: Layer[];
  preferred: { natural?: string; infrared?: string; precipitation?: string };
};

let cachedCatalog: { value: EumetsatCatalog; expiresAt: number } | undefined;

const text = (source: string, expression: RegExp) => source.match(expression)?.[1]?.trim();

function periodToMilliseconds(value: string) {
  const match = value.match(/^P(?:([0-9.]+)D)?(?:T(?:([0-9.]+)H)?(?:([0-9.]+)M)?(?:([0-9.]+)S)?)?$/);
  if (!match) return 15 * 60_000;
  return Number(match[1] ?? 0) * 86_400_000 + Number(match[2] ?? 0) * 3_600_000 + Number(match[3] ?? 0) * 60_000 + Number(match[4] ?? 0) * 1_000 || 15 * 60_000;
}

export function timesFromDimension(dimension?: string, maximum = 16) {
  if (!dimension) return [];
  if (!dimension.includes("/")) return dimension.split(",").map((value) => value.trim()).filter((value) => !Number.isNaN(Date.parse(value))).slice(-maximum);
  const [startValue, endValue, period] = dimension.split("/");
  const start = Date.parse(startValue); const end = Date.parse(endValue); const step = periodToMilliseconds(period ?? "");
  if (Number.isNaN(start) || Number.isNaN(end) || step <= 0) return [];
  const result: string[] = [];
  for (let cursor = end; cursor >= start && result.length < maximum; cursor -= step) result.push(new Date(cursor).toISOString());
  return result.reverse();
}

function leafLayers(xml: string): Layer[] {
  const stack: Array<{ start: number; children: number }> = []; const ranges: Array<{ start: number; end: number; children: number }> = [];
  for (const match of xml.matchAll(/<\/?Layer(?:\s[^>]*)?>/g)) {
    if (match[0].startsWith("</")) { const opened = stack.pop(); if (opened && match.index !== undefined) ranges.push({ start: opened.start, end: match.index + match[0].length, children: opened.children }); }
    else { if (stack.length) stack[stack.length - 1].children += 1; stack.push({ start: match.index ?? 0, children: 0 }); }
  }
  const layers = ranges.filter((range) => range.children === 0).flatMap((range) => {
    const candidate = xml.slice(range.start, range.end);
    const id = text(candidate, /<Name>([^<]+)<\/Name>/); const title = text(candidate, /<Title>([^<]+)<\/Title>/);
    if (!title) return [];
    const timeMatch = candidate.match(/<Dimension[^>]*\bname=["']time["'][^>]*>([\s\S]*?)<\/Dimension>/i);
    const supportedTimes = timesFromDimension(timeMatch?.[1]?.trim());
    const crs = [...candidate.matchAll(/<(?:CRS|SRS)>([^<]+)<\/(?:CRS|SRS)>/g)].map((match) => match[1].trim());
    return id ? [{ id, title, abstract: text(candidate, /<Abstract>([\s\S]*?)<\/Abstract>/)?.replace(/\s+/g, " "), supportedTimes, timeDimension: timeMatch?.[1]?.trim(), crs, coverage: "EUMETView WMS coverage depends on the selected product.", attribution: "© EUMETSAT", legend: ["WMS visualization only — no pixel value is inferred."] }] : [];
  });
  // CRS may be inherited from a parent WMS Layer and therefore absent on a leaf product.
  // The safe GetMap handler is still the final authority for a requested CRS/image.
  return layers.filter((layer) => layer.supportedTimes.length > 0);
}

function selectProducts(layers: Layer[]) {
  const first = (expression: RegExp) => {
    const matching = layers.filter((layer) => expression.test(`${layer.title} ${layer.id}`));
    return (matching.find((layer) => /MSG\s*-\s*0\s*degree/i.test(layer.title)) ?? matching[0])?.id;
  };
  return {
    natural: first(/natural\s+colou?r|rgb_natural/i),
    infrared: first(/(?:^|\s)ir\s*10\.?[58]\b|infrared|ir108|ir105/i),
    precipitation: first(/precipitation|rain\s*rate|rainfall/i),
  };
}

export function parseEumetsatCapabilities(xml: string): EumetsatCatalog {
  const allLayers = leafLayers(xml);
  const preferred = selectProducts(allLayers);
  const preferredIds = new Set(Object.values(preferred).filter(Boolean));
  const products = allLayers.filter((layer) => preferredIds.has(layer.id));
  if (!preferred.natural || !preferred.infrared || products.length < 2) throw new Error("EUMETView catalogue did not expose the required timed satellite products.");
  return { fetchedAt: new Date().toISOString(), products, preferred };
}

export async function getEumetsatCatalog() {
  if (cachedCatalog && cachedCatalog.expiresAt > Date.now()) return cachedCatalog.value;
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const url = new URL(EUMETSAT_WMS.endpoint); url.search = new URLSearchParams({ service: "WMS", version: EUMETSAT_WMS.version, request: "GetCapabilities" }).toString();
    const response = await fetch(url, { signal: controller.signal, cache: "no-store", headers: { accept: "application/xml,text/xml" } });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !/xml|text\//i.test(contentType)) throw new Error(`EUMETView catalogue response: ${response.status}`);
    const value = parseEumetsatCapabilities(await response.text());
    cachedCatalog = { value, expiresAt: Date.now() + 5 * 60_000 };
    return value;
  } finally { clearTimeout(timeout); }
}
