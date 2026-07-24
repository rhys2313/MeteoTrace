"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { HeroSearch } from "@/components/hero/HeroSearch";
import { ActiveMapLayer, MeteoMap } from "@/components/map/MeteoMap";
import { ProductSelector } from "@/components/map/ProductSelector";
import { Timeline } from "@/components/timeline/Timeline";
import { ComparisonPanel } from "@/components/comparison/ComparisonPanel";
import { AtmosphericTraceGraph } from "@/components/trace/AtmosphericTraceGraph";
import { CaseEditor } from "@/components/cases/CaseEditor";
import { SavedCases } from "@/components/cases/SavedCases";
import { Sources } from "@/components/sources/Sources";
import { Area, Frame, MeteoCase, ProductId, SelectionMode } from "@/types";
import { ProviderHealth, ProviderProduct } from "@/lib/providers/types";
import { EumetsatCatalog } from "@/lib/providers/eumetsat";
import { RainViewerMetadata, rainViewerTileUrl } from "@/lib/providers/rainviewer";
import { usePlayback } from "@/hooks/usePlayback";
import { useLocalCases } from "@/hooks/useLocalCases";
import { formatCoordinates } from "@/lib/coordinates";
import { decodeCaseFromUrl } from "@/lib/caseSchema";

const INITIAL_AREA: Area = { name: "Прага", country: "Чехия", lat: 50.0755, lon: 14.4378 };
const RADAR_PRODUCT: ProviderProduct = { id: "rainviewer-radar", title: "Композит отражаемости", supportedTimes: [], coverage: "Мировое покрытие, где опубликован радар", attribution: "Weather data by RainViewer", legend: ["dBZ: слабее → сильнее"] };
type SourceKey = "rainviewer" | "eumetsat";

function toFrames(times: string[], prefix: string): Frame[] { return times.map((time, index) => ({ id: `${prefix}-${time}`, index, time, label: `${time.slice(11, 16)} UTC` })); }
function responseJson<T>(response: Response): Promise<T> { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json() as Promise<T>; }

export default function Home() {
  const [area, setArea] = useState<Area>(INITIAL_AREA); const [activeSource, setActiveSource] = useState<SourceKey>("rainviewer"); const [satelliteId, setSatelliteId] = useState<string>(); const [opacity, setOpacity] = useState(70); const [selectionMode, setSelectionMode] = useState<SelectionMode>("point"); const [catalog, setCatalog] = useState<EumetsatCatalog>(); const [rain, setRain] = useState<RainViewerMetadata>(); const [fallback, setFallback] = useState<string>(); const [health, setHealth] = useState<Record<SourceKey, ProviderHealth>>({ rainviewer: "DEGRADED", eumetsat: "DEGRADED" }); const [diagnostic, setDiagnostic] = useState("Запрашиваются официальные каталоги источников…"); const local = useLocalCases();
  const satelliteProducts = catalog?.products ?? []; const satelliteProduct = satelliteProducts.find((product) => product.id === satelliteId) ?? satelliteProducts[0];
  const radarFrames = rain?.frames.map((frame) => ({ ...frame, label: `${frame.time.slice(11, 16)} UTC` })) ?? [];
  const frames = activeSource === "rainviewer" ? radarFrames.map((frame, index) => ({ id: `rain-${frame.time}`, index, time: frame.time, label: frame.label })) : toFrames(satelliteProduct?.supportedTimes ?? [], "eumet");
  const playback = usePlayback(frames.length); const setPlaybackFrame = playback.setFrame; const currentFrame = frames[playback.frame];
  const selectedProduct: ProductId = satelliteProduct?.id === catalog?.preferred.infrared ? "ir105" : "geocolour";
  const selectedTitle = activeSource === "rainviewer" ? RADAR_PRODUCT.title : satelliteProduct?.title ?? "Ожидание продукта";
  const activeLayer = useMemo<ActiveMapLayer | undefined>(() => {
    if (!currentFrame) return undefined;
    if (activeSource === "rainviewer") { const frame = rain?.frames[playback.frame]; if (!frame || !rain) return undefined; return { provider: "rainviewer", title: RADAR_PRODUCT.title, time: frame.time, opacity, tileUrl: rainViewerTileUrl(rain.host, frame.path) }; }
    if (!satelliteProduct) return undefined;
    return { provider: "eumetsat", title: satelliteProduct.title, time: currentFrame.time, opacity, wmsLayer: satelliteProduct.id, fallback: Boolean(fallback) };
  }, [activeSource, currentFrame, fallback, opacity, playback.frame, rain, satelliteProduct]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([fetch("/api/eumetsat/catalog", { signal: controller.signal }).then(responseJson<EumetsatCatalog>), fetch("/api/rainviewer", { signal: controller.signal }).then(responseJson<RainViewerMetadata>)]).then(([eumetsat, rainviewer]) => {
      if (controller.signal.aborted) return;
      if (eumetsat.status === "fulfilled") { setCatalog(eumetsat.value); setSatelliteId((current) => current ?? eumetsat.value.preferred.natural ?? eumetsat.value.preferred.infrared); } else setHealth((state) => ({ ...state, eumetsat: "OFFLINE" }));
      if (rainviewer.status === "fulfilled") setRain(rainviewer.value); else setHealth((state) => ({ ...state, rainviewer: "OFFLINE" }));
      setDiagnostic(eumetsat.status === "fulfilled" || rainviewer.status === "fulfilled" ? "Каталоги получены. LIVE будет показан только после загрузки изображения на карте." : "Оба каталога сейчас недоступны; подмена изображений отключена.");
    });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (frames.length) setPlaybackFrame(frames.length - 1); }, [activeSource, satelliteProduct?.id, frames.length, setPlaybackFrame]);
  const onLayerStatus = useCallback((provider: SourceKey, status: ProviderHealth, reason?: string) => {
    if (provider === "rainviewer" && status === "OFFLINE") {
      const fallbackId = catalog?.preferred.precipitation ?? catalog?.preferred.infrared;
      if (fallbackId) { setSatelliteId(fallbackId); setFallback(catalog?.preferred.precipitation === fallbackId ? "RainViewer недоступен: показан спутниковый продукт осадков EUMETView." : "RainViewer недоступен: продукта осадков нет, показан EUMETView IR."); setActiveSource("eumetsat"); setHealth((state) => ({ ...state, rainviewer: "OFFLINE", eumetsat: "DEGRADED" })); return; }
    }
    setHealth((state) => ({ ...state, [provider]: provider === "eumetsat" && fallback && status === "LIVE" ? "FALLBACK" : status }));
    if (status === "LIVE") setDiagnostic(`${provider === "rainviewer" ? "RainViewer" : "EUMETView"}: реальное изображение успешно загружено на карте.`); else if (reason) setDiagnostic(reason);
  }, [catalog, fallback]);
  const openCase = (item: MeteoCase) => { setArea(item.area); setSelectionMode(item.selectionMode ?? "point"); setActiveSource(item.source === "rainviewer" ? "rainviewer" : "eumetsat"); playback.setFrame(item.frameB); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { const hash = window.location.hash; if (!hash.startsWith("#case=")) return; try { const item = decodeCaseFromUrl(hash.slice(6)); openCase(item); local.add(item); } catch { /* Invalid shared links never break rendering. */ } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const stats = [{ value: health.rainviewer, label: "RAINVIEWER", detail: rain ? `${rain.frames.length} реальных кадров` : "метаданные" }, { value: health.eumetsat, label: "EUMETVIEW", detail: catalog ? `${satelliteProducts.length} продукта из WMS` : "GetCapabilities" }, { value: frames.length || "—", label: "КАДРОВ UTC", detail: currentFrame?.label ?? "ожидание" }, { value: `${opacity}%`, label: "СЛОЙ", detail: "прозрачность" }];
  return <><Header /><main><HeroSearch onArea={setArea} /><section className="stats" aria-label="Статусы источников">{stats.map((stat) => <article key={stat.label}><b>{stat.value}</b><span>{stat.label}</span><small>{stat.detail}</small></article>)}</section><section className="workspace" id="workspace"><div className="workspaceHeading"><div><p>РАБОЧЕЕ ПРОСТРАНСТВО · ЭТАП 1 LIVE-ЯДРО</p><h2>{area.name.toUpperCase()} <small>{formatCoordinates(area)}</small></h2></div><span className={`sourceState ${health[activeSource] === "LIVE" ? "" : "offline"}`}><i /> {activeSource.toUpperCase()} · {health[activeSource]}</span></div><div className="sourceSwitch" role="group" aria-label="Категория слоя"><button className={activeSource === "rainviewer" ? "active" : ""} onClick={() => { setFallback(undefined); setActiveSource("rainviewer"); }}>РАДАРЫ</button><button className={activeSource === "eumetsat" ? "active" : ""} onClick={() => { setFallback(undefined); setActiveSource("eumetsat"); }}>СПУТНИК</button><button disabled title="Молнии не входят в Этап 1">МОЛНИИ · ЭТАП 2</button></div>{fallback ? <p className="fallbackNotice">FALLBACK · {fallback}</p> : null}<p className="liveDiagnostic">{diagnostic}</p><div className="mapGrid"><MeteoMap area={area} layer={activeLayer} onPick={setArea} onSelectionMode={setSelectionMode} onLayerStatus={onLayerStatus} /><ProductSelector category={activeSource === "rainviewer" ? "radar" : "satellite"} products={activeSource === "rainviewer" ? [{ ...RADAR_PRODUCT, supportedTimes: rain?.frames.map((frame) => frame.time) ?? [] }] : satelliteProducts} selected={activeSource === "rainviewer" ? RADAR_PRODUCT.id : satelliteProduct?.id} onSelected={(id) => { setFallback(undefined); if (activeSource === "eumetsat") setSatelliteId(id); }} opacity={opacity} onOpacity={setOpacity} /></div><Timeline frames={frames} {...playback} /></section><section className="lowerGrid" id="comparison"><ComparisonPanel frames={frames.length ? frames : []} frameA={Math.min(playback.frame, Math.max(0, frames.length - 1))} frameB={Math.min(playback.frame, Math.max(0, frames.length - 1))} onFrameA={playback.setFrame} onFrameB={playback.setFrame} /><div className="quickRead"><p>АКТИВНЫЙ СЛОЙ</p><b>{selectedTitle}</b><span>{activeLayer ? `${activeLayer.time} · ${activeLayer.provider === "rainviewer" ? "RainViewer radar" : "EUMETView WMS"}` : "Слой ожидает настоящий кадр; изображение не симулируется."}</span></div></section><section id="trace"><AtmosphericTraceGraph area={area} selected={selectedProduct} frameLabel={currentFrame?.label ?? "ожидание"} /></section><section className="caseGrid" id="cases"><CaseEditor area={area} products={[selectedProduct]} frameA={playback.frame} frameB={playback.frame} startTime={frames[0]?.time ?? ""} endTime={frames.at(-1)?.time ?? ""} source={activeSource} selectionMode={selectionMode} onSave={local.add} onImport={local.addMany} /><SavedCases cases={local.cases} onOpen={openCase} onRemove={local.remove} onRename={local.rename} onDuplicate={local.duplicate} /></section><Sources /></main><footer>METEOTRACE · ИССЛЕДОВАТЕЛЬСКИЙ ИНСТРУМЕНТ · НЕ ОФИЦИАЛЬНЫЙ ПРОГНОЗ</footer></>;
}
