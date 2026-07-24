const ALLOWED_REQUESTS = new Set(["getmap", "getcapabilities"]);
const ALLOWED_FORMATS = new Set(["image/jpeg", "image/png"]);
const ALLOWED_CRS = new Set(["EPSG:3857", "EPSG:4326"]);
export type ValidWmsRequest = { request: "GetMap" | "GetCapabilities"; layers?: string; bbox?: string; width?: string; height?: string; time?: string; format?: string; crs?: string };
const read = (input: URLSearchParams, key: string) => input.get(key) ?? input.get(key.toUpperCase());

export function validateWmsParams(input: URLSearchParams, allowedLayers: readonly string[] = []): ValidWmsRequest {
  const request = read(input, "request")?.toLowerCase() ?? "";
  if (!ALLOWED_REQUESTS.has(request)) throw new Error("Unsupported WMS request.");
  if (request === "getcapabilities") return { request: "GetCapabilities" };
  const layer = read(input, "layers");
  if (!layer || !allowedLayers.includes(layer)) throw new Error("Unsupported EUMETSAT product.");
  const bbox = read(input, "bbox") ?? ""; const values = bbox.split(",").map(Number);
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value)) || values[0] >= values[2] || values[1] >= values[3]) throw new Error("Invalid BBOX.");
  const width = Number(read(input, "width")); const height = Number(read(input, "height"));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 32 || height < 32 || width > 2048 || height > 2048) throw new Error("Invalid image dimensions.");
  const crs = read(input, "crs") ?? read(input, "srs") ?? "EPSG:3857"; const format = read(input, "format") ?? "image/jpeg";
  if (!ALLOWED_CRS.has(crs) || !ALLOWED_FORMATS.has(format)) throw new Error("Unsupported WMS image configuration.");
  const time = read(input, "time") ?? undefined;
  if (time && Number.isNaN(Date.parse(time))) throw new Error("Invalid WMS time.");
  return { request: "GetMap", layers: layer, bbox, width: String(width), height: String(height), crs, format, time };
}

export function wmsSearchParams(params: ValidWmsRequest) {
  const result = new URLSearchParams({ service: "WMS", request: params.request, version: "1.3.0" });
  if (params.request === "GetMap") { result.set("layers", params.layers!); result.set("styles", ""); result.set("bbox", params.bbox!); result.set("width", params.width!); result.set("height", params.height!); result.set("crs", params.crs!); result.set("format", params.format!); result.set("transparent", "true"); if (params.time) result.set("time", params.time); }
  return result;
}
