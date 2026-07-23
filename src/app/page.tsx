"use client";
import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { HeroSearch } from "@/components/hero/HeroSearch";
import { MeteoMap } from "@/components/map/MeteoMap";
import { ProductSelector } from "@/components/map/ProductSelector";
import { Timeline } from "@/components/timeline/Timeline";
import { ComparisonPanel } from "@/components/comparison/ComparisonPanel";
import { AtmosphericTraceGraph } from "@/components/trace/AtmosphericTraceGraph";
import { CaseEditor } from "@/components/cases/CaseEditor";
import { SavedCases } from "@/components/cases/SavedCases";
import { Sources } from "@/components/sources/Sources";
import { TIMELINE_FRAMES } from "@/config/timelineFrames";
import { productById } from "@/config/products";
import { Area, DataSource, MeteoCase, ProductId, SelectionMode } from "@/types";
import { usePlayback } from "@/hooks/usePlayback";
import { useLocalCases } from "@/hooks/useLocalCases";
import { formatCoordinates } from "@/lib/coordinates";
import { decodeCaseFromUrl } from "@/lib/caseSchema";

const INITIAL_AREA: Area = { name: "Прага", country: "Чехия", lat: 50.0755, lon: 14.4378 };
export default function Home() {
  const [area, setArea] = useState<Area>(INITIAL_AREA); const [product, setProduct] = useState<ProductId>("geocolour"); const playback = usePlayback(TIMELINE_FRAMES.length); const [frameA, setFrameA] = useState(3); const [frameB, setFrameB] = useState(8); const [source, setSource] = useState<DataSource>("eumetsat"); const [satelliteOpacity, setSatelliteOpacity] = useState(64); const [selectionMode, setSelectionMode] = useState<SelectionMode>("point"); const [copernicus, setCopernicus] = useState("проверка OAuth…"); const [eumetsat, setEumetsat] = useState("проверка WMS…"); const local = useLocalCases();
  const openCase = (item: MeteoCase) => { setArea(item.area); setProduct(item.productId ?? item.products[0] ?? "geocolour"); setFrameA(item.frameA); setFrameB(item.frameB); playback.setFrame(item.frameB); setSource(item.source ?? "eumetsat"); setSelectionMode(item.selectionMode ?? "point"); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { fetch("/api/copernicus").then(async (response) => { const data = await response.json(); setCopernicus(data.status === "ready" ? "OAuth готов" : data.status === "credentials_required" ? "требуются credentials" : "недоступен"); }).catch(() => setCopernicus("недоступен")); }, []);
  useEffect(() => { fetch("/api/eumetsat?request=GetCapabilities").then((response) => setEumetsat(response.ok ? "WMS готов" : "WMS недоступен")).catch(() => setEumetsat("WMS недоступен")); }, []);
  useEffect(() => { const hash = window.location.hash; if (!hash.startsWith("#case=")) return; try { const item = decodeCaseFromUrl(hash.slice(6)); openCase(item); local.add(item); } catch { /* Invalid shared links never break page rendering. */ } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const satelliteLive = source === "eumetsat" && eumetsat === "WMS готов";
  const stats = [{ value: "WMS", label: "EUMETSAT", detail: eumetsat }, { value: satelliteLive ? "LIVE" : "WAIT", label: "ИСТОЧНИК", detail: source === "eumetsat" ? eumetsat : copernicus }, { value: TIMELINE_FRAMES.length, label: "ШАГОВ", detail: "навигация по времени" }, { value: `${satelliteOpacity}%`, label: "СЛОЙ", detail: "прозрачность снимка" }];
  return <><Header /><main><HeroSearch onArea={setArea} /><section className="stats" aria-label="Статистика исследования">{stats.map((stat) => <article key={stat.label}><b>{stat.value}</b><span>{stat.label}</span><small>{stat.detail}</small></article>)}</section><section className="workspace" id="workspace"><div className="workspaceHeading"><div><p>РАБОЧЕЕ ПРОСТРАНСТВО · ДАННЫЕ ПО ЗАПРОСУ</p><h2>{area.name.toUpperCase()} <small>{formatCoordinates(area)}</small></h2></div><span className={`sourceState ${satelliteLive ? "" : "offline"}`}><i /> {source === "eumetsat" ? `EUMETSAT · ${eumetsat}` : `COPERNICUS · ${copernicus}`}</span></div><div className="sourceSwitch" role="group" aria-label="Источник спутниковых данных"><button className={source === "eumetsat" ? "active" : ""} onClick={() => setSource("eumetsat")}>EUMETSAT</button><button className={source === "copernicus" ? "active" : ""} onClick={() => setSource("copernicus")}>COPERNICUS</button><label>НЕПРОЗРАЧНОСТЬ <input type="range" min="0" max="100" value={satelliteOpacity} onChange={(event) => setSatelliteOpacity(Number(event.target.value))} /></label></div><div className="mapGrid"><MeteoMap area={area} frameTime={TIMELINE_FRAMES[playback.frame].time} product={product} live={satelliteLive} opacity={satelliteOpacity} onPick={setArea} onSelectionMode={setSelectionMode} /><ProductSelector selected={product} onSelected={setProduct} /></div><Timeline frames={TIMELINE_FRAMES} {...playback} /></section><section className="lowerGrid" id="comparison"><ComparisonPanel frames={TIMELINE_FRAMES} frameA={frameA} frameB={frameB} onFrameA={setFrameA} onFrameB={setFrameB} /><div className="quickRead"><p>АКТИВНЫЙ СЛОЙ</p><b>{productById(product).name}</b><span>{satelliteLive ? "WMS-запрос к EUMETView" : "Отображение слоя ожидает доступный источник — без подмены изображения"} · {TIMELINE_FRAMES[playback.frame].label}</span></div></section><section id="trace"><AtmosphericTraceGraph area={area} selected={product} frameLabel={TIMELINE_FRAMES[playback.frame].label} /></section><section className="caseGrid" id="cases"><CaseEditor area={area} products={[product]} frameA={frameA} frameB={frameB} startTime={TIMELINE_FRAMES[0].time} endTime={TIMELINE_FRAMES.at(-1)?.time ?? ""} source={source} selectionMode={selectionMode} onSave={local.add} onImport={local.addMany} /><SavedCases cases={local.cases} onOpen={openCase} onRemove={local.remove} onRename={local.rename} onDuplicate={local.duplicate} /></section><Sources /></main><footer>METEOTRACE · ИССЛЕДОВАТЕЛЬСКИЙ ИНСТРУМЕНТ · НЕ ОФИЦИАЛЬНЫЙ ПРОГНОЗ</footer></>;
}
