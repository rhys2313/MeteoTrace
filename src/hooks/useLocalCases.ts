"use client";
import { useEffect, useState } from "react";
import { MeteoCase } from "@/types";
import { loadCases, saveCases } from "@/lib/storage";

export function useLocalCases() {
  const [cases, setCases] = useState<MeteoCase[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { setCases(loadCases()); setReady(true); }, []);
  const update = (next: MeteoCase[]) => { setCases(next); saveCases(next); };
  return { cases, ready, add: (item: MeteoCase) => update([item, ...cases]), addMany: (items: MeteoCase[]) => update([...items, ...cases]), remove: (id: string) => update(cases.filter((item) => item.id !== id)), rename: (id: string, title: string) => update(cases.map((item) => item.id === id ? { ...item, title } : item)), duplicate: (item: MeteoCase) => update([{ ...item, id: crypto.randomUUID(), title: `${item.title} (копия)`, createdAt: new Date().toISOString() }, ...cases]) };
}
