import { describe, expect, it } from "vitest";
import { parseCoordinates } from "./coordinates";
import { calculateDifferenceStats } from "./difference";
import { importMeteoCases, isMeteoCase, normalizeMeteoCase } from "./caseSchema";
import { validateWmsParams } from "./wms";
import type { MeteoCase } from "@/types";

const item: MeteoCase = { id: "case-1", title: "Прага", area: { name: "Прага", lat: 50.07, lon: 14.43 }, products: ["geocolour"], frameA: 0, frameB: 1, startTime: "2026-01-01T00:00:00Z", endTime: "2026-01-01T00:15:00Z", note: "", createdAt: "2026-01-01T00:00:00Z", mode: "LIVE" };
describe("MeteoTrace domain utilities", () => {
  it("parses valid coordinates and rejects invalid latitude", () => { expect(parseCoordinates("50.0755, 14.4378")).toEqual({ lat: 50.0755, lon: 14.4378 }); expect(parseCoordinates("91, 14")).toBeNull(); });
  it("imports and normalizes a portable case", () => { expect(isMeteoCase(item)).toBe(true); expect(importMeteoCases(JSON.stringify(item))[0].schemaVersion).toBe(2); expect(normalizeMeteoCase(item).source).toBe("eumetsat"); });
  it("rejects malformed case input", () => { expect(() => importMeteoCases('{"title":"no coordinates"}')).toThrow(); });
  it("calculates reproducible pixel difference statistics", () => { const stats = calculateDifferenceStats(new Uint8ClampedArray([0, 0, 0, 255, 100, 100, 100, 255]), new Uint8ClampedArray([10, 10, 10, 255, 100, 100, 100, 255])); expect(stats.sampleSize).toBe(2); expect(stats.mean).toBe(5); expect(stats.changedPixels).toBe(1); });
  it("validates WMS proxy input and blocks unknown layers", () => { expect(validateWmsParams(new URLSearchParams("REQUEST=GetMap&LAYERS=msg_fes%3Argb_natural&BBOX=0,0,1,1&WIDTH=512&HEIGHT=512&CRS=EPSG%3A3857&FORMAT=image%2Fjpeg")).request).toBe("GetMap"); expect(() => validateWmsParams(new URLSearchParams("request=GetMap&layers=external:secret&bbox=0,0,1,1&width=512&height=512"))).toThrow(); });
});
