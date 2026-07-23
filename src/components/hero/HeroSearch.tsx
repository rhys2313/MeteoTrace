"use client";
import { FormEvent, useState } from "react";
import { Area } from "@/types";
import { parseCoordinates } from "@/lib/coordinates";

const steps = ["01 ОБЛАСТЬ", "02 СОБЫТИЕ", "03 ПЕРИОД", "04 ИСТОЧНИКИ"];
export function HeroSearch({ onArea }: { onArea: (area: Area) => void }) {
  const [query, setQuery] = useState("Прага"); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); const coordinates = parseCoordinates(query);
    if (coordinates) { onArea({ ...coordinates, name: "Пользовательские координаты" }); return; }
    if (query.trim().length < 2) { setError("Введите город или координаты в формате 50.0755, 14.4378."); return; }
    setLoading(true); const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), 7000);
    try { const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal }); const result = await response.json(); if (!response.ok || !result) throw new Error("not-found"); onArea(result as Area); }
    catch { setError("Не удалось найти область. Проверьте запрос или введите координаты."); }
    finally { clearTimeout(timeout); setLoading(false); }
  }
  return <section className="hero" id="top"><div className="atmoGhosts" aria-hidden="true"><span>IR 10.5 μm</span><span>CLOUD TOP HEIGHT</span><span>MTG FCI · 15:40 UTC</span><span>−63 °C · 11.8 KM</span></div><div className="heroCopy"><h1>ПРОСЛЕДИ<br />РАЗВИТИЕ<br /><em>АТМОСФЕРЫ</em></h1><p>MeteoTrace собирает спутниковые продукты, временные кадры и выбранные области в один метеорологический кейс — чтобы увидеть не только состояние атмосферы, но и его изменение.</p></div><form className="searchBox" onSubmit={submit}><div className="steps">{steps.map((step, index) => <a key={step} href={index === 0 ? "#workspace" : index === 2 ? "#timeline" : index === 3 ? "#sources" : "#comparison"} className={index === 0 ? "step active" : "step"}>{step}</a>)}</div><div className="searchRow"><label className="srOnly" htmlFor="area-search">Город или координаты</label><input id="area-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Прага или 50.0755, 14.4378" /><button type="submit" disabled={loading}>{loading ? "ПОИСК…" : "ИССЛЕДОВАТЬ ОБЛАСТЬ"}</button></div>{error && <p className="formError" role="alert">{error}</p>}</form></section>;
}
