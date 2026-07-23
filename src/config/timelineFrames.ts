import { Frame } from "@/types";
/** Provisional UTC request slots used until EUMETView capabilities supplies a live time extent. */
const base = Date.UTC(2026, 6, 23, 6, 0, 0);
export const TIMELINE_FRAMES: Frame[] = Array.from({ length: 12 }, (_, index) => {
  const time = new Date(base + index * 30 * 60 * 1000);
  return { id: `utc-slot-${index}`, index, time: time.toISOString(), label: `${time.toISOString().slice(11, 16)} UTC` };
});
