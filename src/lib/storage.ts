import { MeteoCase } from "@/types";

const STORAGE_KEY = "meteotrace-cases-v1";
export const loadCases = (): MeteoCase[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as MeteoCase[]; } catch { return []; }
};
export const saveCases = (items: MeteoCase[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
