const ALLOWED_REQUESTS = new Set(["getmap", "getcapabilities", "getfeatureinfo"]);
const ALLOWED_FORMATS = new Set(["image/jpeg", "image/png"]);
const ALLOWED_CRS = new Set(["EPSG:3857", "EPSG:4326"]);
const ALLOWED_INFO_FORMATS = new Set(["application/json", "text/plain", "text/html", "application/vnd.ogc.gml"]);
export type ValidWmsRequest = {
  request: "GetMap" | "GetCapabilities" | "GetFeatureInfo";
  layers?: string; bbox?: string; width?: string; height?: string; time?: string; format?: string; crs?: string;
  queryLayers?: string; infoFormat?: string; i?: string; j?: string;
};
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
  if (request === "getmap") return { request: "GetMap", layers: layer, bbox, width: String(width), height: String(height), crs, format, time };
  const queryLayers = read(input, "query_layers"); const infoFormat = read(input, "info_format") ?? "application/json";
  const i = Number(read(input, "i")); const j = Number(read(input, "j"));
  if (queryLayers !== layer || !ALLOWED_INFO_FORMATS.has(infoFormat) || !Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < 0 || i >= width || j >= height) throw new Error("Invalid GetFeatureInfo parameters.");
  return { request: "GetFeatureInfo", layers: layer, queryLayers, bbox, width: String(width), height: String(height), crs, format, time, infoFormat, i: String(i), j: String(j) };
}

export function wmsSearchParams(params: ValidWmsRequest) {
  const result = new URLSearchParams({ service: "WMS", request: params.request, version: "1.3.0" });
  if (params.request === "GetCapabilities") return result;
  result.set("layers", params.layers!); result.set("styles", ""); result.set("bbox", params.bbox!); result.set("width", params.width!); result.set("height", params.height!); result.set("crs", params.crs!); result.set("format", params.format!); if (params.time) result.set("time", params.time);
  if (params.request === "GetMap") result.set("transparent", "true");
  else { result.set("query_layers", params.queryLayers!); result.set("info_format", params.infoFormat!); result.set("i", params.i!); result.set("j", params.j!); result.set("feature_count", "1"); }
  return result;
}
