import { EUMETSAT_WMS } from "@/config/sources";
import { ProviderProduct } from "@/lib/providers/types";

type Layer = ProviderProduct & { crs: string[]; timeDimension?: string };
export type EumetsatCatalog = {
  fetchedAt: string;
  products: Layer[];
  preferred: { natural?: string; infrared?: string; precipitation?: string };
  /** Server-only validation list; the public catalog route deliberately omits it. */
  allowedLayerIds: string[];
  operations: string[];
};

let cachedCatalog: { value: EumetsatCatalog; expiresAt: number } | undefined;
const text = (source: string, expression: RegExp) => source.match(expression)?.[1]?.trim();
const decode = (value?: string) => value?.replace(/&amp;/g, "&").replace(/&quot;/g, '"');

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

function groupFor(title: string, id: string): NonNullable<ProviderProduct["group"]> {
  const value = `${title} ${id}`.toLowerCase();
  if (/lightning|\bli\b/.test(value)) return "lightning";
  if (/precipitation|rain[ _-]?rate|rainfall/.test(value)) return "precipitation";
  if (/severe|convective|convection/.test(value)) return "convection";
  if (/cloud\s*(top|type|height|temperature|pressure)|fog|low cloud/.test(value)) return "cloud";
  if (/\bir\s*1?0\.?[58]|infrared|water vapou?r/.test(value)) return "infrared";
  if (/rgb|natural colou?r|geocolou?r|airmass|dust|snow|fire/.test(value)) return "overview";
  return "other";
}

function stylesFromLayer(xml: string) {
  return [...xml.matchAll(/<Style(?:\s[^>]*)?>([\s\S]*?)<\/Style>/gi)].map((match) => {
    const source = match[1];
    const legendBlock = source.match(/<LegendURL(?:\s[^>]*)?>([\s\S]*?)<\/LegendURL>/i)?.[1] ?? "";
    const legendUrl = decode(legendBlock.match(/<(?:OnlineResource|LegendURL)[^>]*(?:xlink:href|href)=["']([^"']+)["']/i)?.[1]);
    return { name: text(source, /<Name>([^<]+)<\/Name>/i), title: text(source, /<Title>([^<]+)<\/Title>/i), legendUrl };
  });
}

function boundingBoxFromLayer(xml: string) {
  const match = xml.match(/<BoundingBox\s+([^>]+?)\/?>(?:<\/BoundingBox>)?/i);
  if (match) {
    const attr = match[1];
    const number = (key: string) => Number(attr.match(new RegExp(`${key}=["']([^"']+)["']`, "i"))?.[1]);
    const values = [number("minx"), number("miny"), number("maxx"), number("maxy")];
    if (values.every(Number.isFinite)) return { crs: attr.match(/(?:CRS|SRS)=["']([^"']+)["']/i)?.[1], values: values as [number, number, number, number] };
  }
  const geo = xml.match(/<EX_GeographicBoundingBox>([\s\S]*?)<\/EX_GeographicBoundingBox>/i)?.[1];
  if (!geo) return undefined;
  const west = Number(text(geo, /<westBoundLongitude>([^<]+)<\/westBoundLongitude>/i)); const south = Number(text(geo, /<southBoundLatitude>([^<]+)<\/southBoundLatitude>/i));
  const east = Number(text(geo, /<eastBoundLongitude>([^<]+)<\/eastBoundLongitude>/i)); const north = Number(text(geo, /<northBoundLatitude>([^<]+)<\/northBoundLatitude>/i));
  return [west, south, east, north].every(Number.isFinite) ? { crs: "EPSG:4326", values: [west, south, east, north] as [number, number, number, number] } : undefined;
}

function capabilitiesOperations(xml: string) {
  const request = xml.match(/<Request>([\s\S]*?)<\/Request>/i)?.[1] ?? "";
  return [...request.matchAll(/<([A-Za-z][\w.-]*)\b/g)].map((match) => match[1]).filter((name, index, values) => values.indexOf(name) === index);
}

function leafLayers(xml: string, operations: string[]): Layer[] {
  const stack: Array<{ start: number; children: number }> = []; const ranges: Array<{ start: number; end: number; children: number }> = [];
  for (const match of xml.matchAll(/<\/?Layer(?:\s[^>]*)?>/g)) {
    if (match[0].startsWith("</")) { const opened = stack.pop(); if (opened && match.index !== undefined) ranges.push({ start: opened.start, end: match.index + match[0].length, children: opened.children }); }
    else { if (stack.length) stack[stack.length - 1].children += 1; stack.push({ start: match.index ?? 0, children: 0 }); }
  }
  return ranges.filter((range) => range.children === 0).flatMap((range) => {
    const candidate = xml.slice(range.start, range.end);
    const id = text(candidate, /<Name>([^<]+)<\/Name>/); const title = text(candidate, /<Title>([^<]+)<\/Title>/);
    if (!id || !title) return [];
    const timeMatch = candidate.match(/<Dimension[^>]*\bname=["']time["'][^>]*>([\s\S]*?)<\/Dimension>/i);
    const supportedTimes = timesFromDimension(timeMatch?.[1]?.trim());
    const crs = [...candidate.matchAll(/<(?:CRS|SRS)>([^<]+)<\/(?:CRS|SRS)>/g)].map((match) => match[1].trim());
    const styles = stylesFromLayer(candidate);
    const group = groupFor(title, id);
    return [{
      id,
      title,
      abstract: text(candidate, /<Abstract>([\s\S]*?)<\/Abstract>/)?.replace(/\s+/g, " "),
      supportedTimes,
      timeDimension: timeMatch?.[1]?.trim(),
      crs,
      boundingBox: boundingBoxFromLayer(candidate),
      styles,
      operations,
      interfaces: { wms: operations.includes("GetMap"), wcs: false, wfs: false, getFeatureInfo: operations.includes("GetFeatureInfo") },
      productInfoUrl: `https://view.eumetsat.int/productviewer/productDetails/${encodeURIComponent(id)}?v=default`,
      group,
      recommended: group !== "other",
      coverage: "Покрытие определяется официальным EUMETView WMS для выбранного продукта.",
      attribution: "© EUMETSAT",
      legend: styles.flatMap((style) => style.legendUrl ? [style.legendUrl] : []),
      units: "Визуализация WMS; численная единица пикселя не опубликована.",
      dataKind: group === "precipitation" ? "algorithmic_estimate" : "visualization",
      limitations: "WMS-изображение не является численным измерением в точке без отдельно доступного WCS/WFS/FeatureInfo.",
    } satisfies Layer];
  }).filter((layer) => layer.supportedTimes.length > 0);
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
  const operations = capabilitiesOperations(xml);
  const parsed = leafLayers(xml, operations);
  const seenGroups = new Set<string>();
  const recommendedIds = new Set<string>();
  for (const product of parsed) {
    if (product.group && product.group !== "other" && !seenGroups.has(product.group)) {
      seenGroups.add(product.group);
      recommendedIds.add(product.id);
    }
  }
  const products = parsed.map((product) => ({ ...product, recommended: recommendedIds.has(product.id) }));
  const preferred = selectProducts(products);
  for (const id of Object.values(preferred)) if (id) recommendedIds.add(id);
  const curatedProducts = products.map((product) => ({ ...product, recommended: recommendedIds.has(product.id) }));
  if (!preferred.natural || !preferred.infrared || curatedProducts.length < 2) throw new Error("EUMETView catalogue did not expose the required timed satellite products.");
  return { fetchedAt: new Date().toISOString(), products: curatedProducts, preferred, allowedLayerIds: curatedProducts.map((layer) => layer.id), operations };
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
