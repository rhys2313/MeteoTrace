import { AnalysisStats } from "@/types";

/** Pixel-channel differences only; does not infer weather phenomena from imagery. */
export function calculateDifferenceStats(a: Uint8ClampedArray, b: Uint8ClampedArray): AnalysisStats {
  const count = Math.min(a.length, b.length);
  if (count === 0) return { mean: 0, median: 0, min: 0, max: 0, changedPixels: 0, sampleSize: 0 };
  const values: number[] = [];
  for (let index = 0; index < count; index += 4) {
    const delta = (Math.abs(a[index] - b[index]) + Math.abs(a[index + 1] - b[index + 1]) + Math.abs(a[index + 2] - b[index + 2])) / 3;
    values.push(delta);
  }
  const sorted = [...values].sort((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);
  return {
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    median: sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2,
    min: sorted[0], max: sorted.at(-1) ?? 0,
    changedPixels: values.filter((value) => value > 8).length,
    sampleSize: values.length,
  };
}
