import { Area, Coordinates } from "@/types";

export function parseCoordinates(value: string): Coordinates | null {
  const match = value.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
}

export const formatCoordinates = (area: Coordinates) => `${area.lat.toFixed(4)}, ${area.lon.toFixed(4)}`;
export const coordinatesArea = (coordinates: Coordinates): Area => ({ ...coordinates, name: "Выбранная точка" });
