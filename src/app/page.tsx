"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { HeroSearch } from "@/components/hero/HeroSearch";
import { ActiveMapLayer, LayerRenderState, MapLayerDiagnostics, MeteoMap } from "@/components/map/MeteoMap";
import { ProductSelector } from "@/components/map/ProductSelector";
import { Timeline } from "@/components/timeline/Timeline";
import { ComparisonPanel } from "@/components/comparison/ComparisonPanel";
import { AtmosphericTraceGraph } from "@/components/trace/AtmosphericTraceGraph";
import { CaseEditor } from "@/components/cases/CaseEditor";
import { SavedCases } from "@/components/cases/SavedCases";
import { Sources } from "@/components/sources/Sources";
import { Area, Frame, MeteoCase, ProductId, SelectionMode } from "@/types";
import { ProviderProduct } from "@/lib/providers/types";
import { EumetsatCatalog } from "@/lib/providers/eumetsat";
import { RainViewerMetadata, rainViewerTileUrl } from "@/lib/providers/rainviewer";
import { usePlayback } from "@/hooks/usePlayback";
import { useLocalCases } from "@/hooks/useLocalCases";
import { formatCoordinates } from "@/lib/coordinates";
import { decodeCaseFromUrl } from "@/lib/caseSchema";

const INITIAL_AREA: Area = { name: "Прага", country: "Чехия", lat: 50.0755, lon: 14.4378 };
const RADAR_PRODUCT: ProviderProduct = { id: "rainviewer-radar", title: "Композит отражаемости", supportedTimes: [], coverage: "Публичное радарное покрытие RainViewer", attribution: "Weather data by RainViewer", legend: ["dBZ: слабее → сильнее"] };
type SourceKey = "rainviewer" | "eumetsat";
type ApiState = "API_LOADING" | "API_LIVE" | "API_ERROR";

function toFrames(times: string[], prefix: string): Frame[] { return times.map((time, index) => ({ id: `${prefix}-${time}`, index, time, label: `${time.slice(11, 16)} UTC` })); }
function responseJson<T>(response: Response): Promise<T> { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json() as Promise<T>; }
function emptyDiagnostics(): MapLayerDiagnostics { return { state: "IDLE", tileStarts: 0, tileSuccesses: 0, tileErrors: 0, echoPixels: 0, visible: false, opacity: 0, zIndex: 0 }; }
function layerMessage(state: LayerRenderState) {
  if (state === "LAYER_LOADING") return "Слой загружается: ждём первые реальные тайлы.";
  if (state === "LAYER_LIVE") return "Слой загружен и визуально добавлен на карту.";
  if (state === "NO_ECHOES") return "Слой загружен, осадков в выбранной области не обнаружено.";
  if (state === "NO_COVERAGE") return "В выбранной области отсутствует радарное покрытие.";
  if (state === "LAYER_ERROR") return "Карта не получила изображение слоя.";
  return "Ожидание доступного кадра источника.";
}

export default function Home() {
  const [area, setArea] = useState<Area>(INITIAL_AREA);
  const [activeSource, setActiveSource] = useState<SourceKey>("rainviewer");
  const [satelliteId, setSatelliteId] = useState<string>();
  const [opacity, setOpacity] = useState(70);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("point");
  const [catalog, setCatalog] = useState<EumetsatCatalog>();
  const [rain, setRain] = useState<RainViewerMetadata>();
  const [fallback, setFallback] = useState<string>();
  const [apiState, setApiState] = useState<Record<SourceKey, ApiState>>({ rainviewer: "API_LOADING", eumetsat: "API_LOADING" });
  const [diagnostics, setDiagnostics] = useState<Record<SourceKey, MapLayerDiagnostics>>({ rainviewer: emptyDiagnostics(), eumetsat: emptyDiagnostics() });
  const [diagnostic, setDiagnostic] = useState("Запрашиваются официальные каталоги источников…");
  const [buildVersion, setBuildVersion] = useState("loading");
  const local = useLocalCases();

  const satelliteProducts = catalog?.products ?? [];
  const satelliteProduct = satelliteProducts.find((product) => product.id === satelliteId) ?? satelliteProducts[0];
  const radarFrames = rain?.frames.map((frame) => ({ ...frame, label: `${frame.time.slice(11, 16)} UTC` })) ?? [];
  const frames = activeSource === "rainviewer" ? radarFrames.map((frame, index) => ({ id: `rain-${frame.time}`, index, time: frame.time, label: frame.label })) : toFrames(satelliteProduct?.supportedTimes ?? [], "eumet");
  const playback = usePlayback(frames.length);
  const currentFrame = frames[playback.frame];
  const currentFrameTime = currentFrame?.time;
  const rainFrame = rain?.frames[playback.frame];
  const selectedProduct: ProductId = satelliteProduct?.id === catalog?.preferred.infrared ? "ir105" : "geocolour";
  const selectedTitle = activeSource === "rainviewer" ? RADAR_PRODUCT.title : satelliteProduct?.title ?? "Ожидание продукта";

  const activeLayer = useMemo<ActiveMapLayer | undefined>(() => {
    if (!currentFrameTime) return undefined;
    if (activeSource === "rainviewer") {
      if (!rainFrame || !rain?.host) return undefined;
      return { provider: "rainviewer", title: RADAR_PRODUCT.title, time: rainFrame.time, opacity, tileUrl: rainViewerTileUrl(rain.host, rainFrame.path) };
    }
    if (!satelliteProduct) return undefined;
    return { provider: "eumetsat", title: satelliteProduct.title, time: currentFrameTime, opacity, wmsLayer: satelliteProduct.id, fallback: Boolean(fallback) };
  }, [activeSource, currentFrameTime, fallback, opacity, rain?.host, rainFrame, satelliteProduct]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/rainviewer", { signal: controller.signal }).then(responseJson<RainViewerMetadata>).then((value) => {
      if (controller.signal.aborted) return;
      setRain(value);
      setApiState((state) => ({ ...state, rainviewer: "API_LIVE" }));
      setDiagnostic("RainViewer API LIVE: проверяем фактическую загрузку тайлов на карте.");
    }).catch(() => { if (!controller.signal.aborted) setApiState((state) => ({ ...state, rainviewer: "API_ERROR" })); });
    void fetch("/api/eumetsat/catalog", { signal: controller.signal }).then(responseJson<EumetsatCatalog>).then((value) => {
      if (controller.signal.aborted) return;
      setCatalog(value);
      setSatelliteId((current) => current ?? value.preferred.natural ?? value.preferred.infrared);
      setApiState((state) => ({ ...state, eumetsat: "API_LIVE" }));
    }).catch(() => { if (!controller.signal.aborted) setApiState((state) => ({ ...state, eumetsat: "API_ERROR" })); });
    void fetch("/api/version", { signal: controller.signal }).then(responseJson<{ commit: string }>).then((value) => {
      if (!controller.signal.aborted) setBuildVersion(value.commit);
    }).catch(() => { if (!controller.signal.aborted) setBuildVersion("unavailable"); });
    return () => controller.abort();
  }, []);

  const setPlaybackFrame = playback.setFrame;
  useEffect(() => { if (frames.length) setPlaybackFrame(frames.length - 1); }, [activeSource, satelliteProduct?.id, frames.length, setPlaybackFrame]);

  const onLayerDiagnostics = useCallback((provider: SourceKey, next: MapLayerDiagnostics) => {
    setDiagnostics((state) => ({ ...state, [provider]: next }));
    setDiagnostic(next.reason ?? layerMessage(next.state));
    if (provider === "rainviewer" && next.state === "LAYER_ERROR") {
      const fallbackId = catalog?.preferred.precipitation ?? catalog?.preferred.infrared;
      if (fallbackId) {
        setSatelliteId(fallbackId);
        setFallback(catalog?.preferred.precipitation === fallbackId ? "RainViewer не отрисовал тайлы: показан спутниковый продукт осадков EUMETView." : "RainViewer не отрисовал тайлы: показан EUMETView IR.");
        setActiveSource("eumetsat");
      }
    } else if (provider === "eumetsat" && next.state === "LAYER_ERROR" && satelliteProduct?.id !== catalog?.preferred.infrared) {
      setSatelliteId(catalog?.preferred.infrared);
      setFallback("Спутниковый продукт недоступен: включён IR-резерв EUMETSAT.");
    } else if (next.state !== "LAYER_ERROR") setFallback(undefined);
  }, [catalog, satelliteProduct?.id]);

  const openCase = (item: MeteoCase) => {
    setArea(item.area);
    setSelectionMode(item.selectionMode ?? "point");
    setActiveSource(item.source === "rainviewer" ? "rainviewer" : "eumetsat");
    playback.setFrame(item.frameB);
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#case=")) return;
    try { const item = decodeCaseFromUrl(hash.slice(6)); openCase(item); local.add(item); } catch { /* Invalid shared links never break rendering. */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDiagnostics = diagnostics[activeSource];
  const stats = [
    { value: apiState.rainviewer.replace("API_", ""), label: "RAINVIEWER API", detail: rain ? `${rain.frames.length} реальных кадров` : "метаданные" },
    { value: apiState.eumetsat.replace("API_", ""), label: "EUMETVIEW API", detail: catalog ? `${satelliteProducts.length} продукта из WMS` : "GetCapabilities" },
    { value: activeDiagnostics.state.replaceAll("_", " "), label: "СОСТОЯНИЕ СЛОЯ", detail: activeDiagnostics.frameTime?.slice(11, 16) ?? "ожидание" },
    { value: `${opacity}%`, label: "СЛОЙ", detail: "прозрачность" },
  ];

  return <><Header /><main>
    <HeroSearch onArea={setArea} />
    <section className="stats" aria-label="Статусы источников">{stats.map((stat) => <article key={stat.label}><b>{stat.value}</b><span>{stat.label}</span><small>{stat.detail}</small></article>)}</section>
    <section className="workspace" id="workspace">
      <div className="workspaceHeading"><div><p>РАБОЧЕЕ ПРОСТРАНСТВО · ЭТАП 1 LIVE-ЯДРО · BUILD {buildVersion}</p><h2>{area.name.toUpperCase()} <small>{formatCoordinates(area)}</small></h2></div><span className={`sourceState ${activeDiagnostics.state === "LAYER_LIVE" ? "" : "offline"}`}><i /> {activeSource.toUpperCase()} · {activeDiagnostics.state.replaceAll("_", " ")}</span></div>
      <div className="sourceSwitch" role="group" aria-label="Категория слоя"><button className={activeSource === "rainviewer" ? "active" : ""} onClick={() => { setFallback(undefined); setActiveSource("rainviewer"); }}>РАДАРЫ</button><button className={activeSource === "eumetsat" ? "active" : ""} onClick={() => { setFallback(undefined); setSatelliteId(catalog?.preferred.infrared ?? satelliteId); setActiveSource("eumetsat"); }}>СПУТНИК</button><button disabled title="Молнии не входят в Этап 1">МОЛНИИ · ЭТАП 2</button></div>
      {fallback ? <p className="fallbackNotice">FALLBACK · {fallback}</p> : null}<p className="liveDiagnostic">{diagnostic}</p>
      <div className="mapGrid"><MeteoMap area={area} layer={activeLayer} onPick={setArea} onSelectionMode={setSelectionMode} onLayerDiagnostics={onLayerDiagnostics} /><ProductSelector category={activeSource === "rainviewer" ? "radar" : "satellite"} products={activeSource === "rainviewer" ? [{ ...RADAR_PRODUCT, supportedTimes: rain?.frames.map((frame) => frame.time) ?? [] }] : satelliteProducts} selected={activeSource === "rainviewer" ? RADAR_PRODUCT.id : satelliteProduct?.id} onSelected={(id) => { setFallback(undefined); if (activeSource === "eumetsat") setSatelliteId(id); }} opacity={opacity} onOpacity={setOpacity} diagnostics={activeDiagnostics} apiState={apiState[activeSource]} buildVersion={buildVersion} /></div>
      <Timeline frames={frames} {...playback} />
    </section>
    <section className="lowerGrid" id="comparison"><ComparisonPanel frames={frames.length ? frames : []} frameA={Math.min(playback.frame, Math.max(0, frames.length - 1))} frameB={Math.min(playback.frame, Math.max(0, frames.length - 1))} onFrameA={playback.setFrame} onFrameB={playback.setFrame} /><div className="quickRead"><p>АКТИВНЫЙ СЛОЙ</p><b>{selectedTitle}</b><span>{activeLayer ? `${activeLayer.time} · ${activeLayer.provider === "rainviewer" ? "RainViewer radar" : "EUMETView WMS"}` : "Слой ожидает настоящий кадр; изображение не симулируется."}</span></div></section>
    <section id="trace"><AtmosphericTraceGraph area={area} selected={selectedProduct} frameLabel={currentFrame?.label ?? "ожидание"} /></section>
    <section className="caseGrid" id="cases"><CaseEditor area={area} products={[selectedProduct]} frameA={playback.frame} frameB={playback.frame} startTime={frames[0]?.time ?? ""} endTime={frames.at(-1)?.time ?? ""} source={activeSource} selectionMode={selectionMode} onSave={local.add} onImport={local.addMany} /><SavedCases cases={local.cases} onOpen={openCase} onRemove={local.remove} onRename={local.rename} onDuplicate={local.duplicate} /></section>
    <Sources />
  </main><footer>METEOTRACE · ИССЛЕДОВАТЕЛЬСКИЙ ИНСТРУМЕНТ · НЕ ОФИЦИАЛЬНЫЙ ПРОГНОЗ</footer></>;
}
