import { MeteoCase } from "@/types";

export const CASE_SCHEMA_VERSION = 2;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isMeteoCase(value: unknown): value is MeteoCase {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MeteoCase>;
  return typeof item.id === "string" && typeof item.title === "string" &&
    Boolean(item.area) && typeof item.area?.name === "string" &&
    isFiniteNumber(item.area?.lat) && isFiniteNumber(item.area?.lon) &&
    Array.isArray(item.products) && typeof item.createdAt === "string";
}

export function normalizeMeteoCase(value: MeteoCase): MeteoCase {
  return {
    ...value,
    source: value.source ?? "eumetsat",
    productId: value.productId ?? value.products[0] ?? "geocolour",
    selectionMode: value.selectionMode ?? "point",
    tags: value.tags ?? [],
    evidence: value.evidence ?? [],
    schemaVersion: CASE_SCHEMA_VERSION,
  };
}

export function importMeteoCases(raw: string): MeteoCase[] {
  const parsed: unknown = JSON.parse(raw);
  const candidates = Array.isArray(parsed) ? parsed : [parsed];
  const valid = candidates.filter(isMeteoCase).map(normalizeMeteoCase);
  if (valid.length !== candidates.length) throw new Error("Файл содержит несовместимый формат кейса MeteoTrace.");
  return valid;
}

export function encodeCaseForUrl(item: MeteoCase) {
  return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(normalizeMeteoCase(item))))));
}

export function decodeCaseFromUrl(value: string): MeteoCase {
  try {
    const decoded = decodeURIComponent(escape(atob(decodeURIComponent(value))));
    const parsed = JSON.parse(decoded);
    if (!isMeteoCase(parsed)) throw new Error("invalid");
    return normalizeMeteoCase(parsed);
  } catch {
    throw new Error("Ссылка на кейс повреждена или создана другой версией приложения.");
  }
}
