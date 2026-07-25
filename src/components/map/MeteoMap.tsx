"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Area, SelectionMode } from "@/types";

export type LayerRenderState = "IDLE" | "LAYER_LOADING" | "LAYER_LIVE" | "NO_ECHOES" | "NO_COVERAGE" | "LAYER_ERROR";
export type MapLayerDiagnostics = {
  state: LayerRenderState;
  frameTime?: string;
  tileStarts: number;
  tileSuccesses: number;
  tileErrors: number;
  echoPixels: number;
  coverageTiles: number;
  coveragePixels: number;
  hasCoverage?: boolean;
  visible: boolean;
  opacity: number;
  zIndex: number;
  url?: string;
  reason?: string;
};
export type ActiveMapLayer = {
  provider: "eumetsat" | "rainviewer";
  title: string;
  time: string;
  opacity: number;
  wmsLayer?: string;
  tileUrl?: string;
  coverageTileUrl?: string;
  fallback?: boolean;
};

type Props = {
  area: Area;
  layer?: ActiveMapLayer;
  onPick: (area: Area) => void;
  onSelectionMode: (mode: SelectionMode) => void;
  onLayerDiagnostics: (provider: ActiveMapLayer["provider"], diagnostics: MapLayerDiagnostics) => void;
  coverageVisible?: boolean;
};

function rasterPixels(tile: { getImage?: () => HTMLImageElement | HTMLCanvasElement }, opaqueOnly = false) {
  try {
    const image = tile.getImage?.();
    if (!image?.width || !image?.height) return 0;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return 0;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let pixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] > 12 && (opaqueOnly || data[index] > 20 || data[index + 1] > 20 || data[index + 2] > 20)) pixels += 1;
    }
    return pixels;
  } catch {
    // A tainted or unreadable tile still counts as loaded; it is never a layer failure.
    return 0;
  }
}

export function MeteoMap({ area, layer, onPick, onSelectionMode, onLayerDiagnostics, coverageVisible = false }: Props) {
  const target = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const weatherRef = useRef<{ key: string; layer: any; coverage?: any } | null>(null);
  const diagnosticsRef = useRef(onLayerDiagnostics);
  const lastLayerDiagnosticsRef = useRef<{ provider: ActiveMapLayer["provider"]; value: MapLayerDiagnostics } | null>(null);
  const opacityRef = useRef(layer?.opacity ?? 0);
  const coverageVisibleRef = useRef(coverageVisible);
  const [selection, setSelection] = useState<SelectionMode>("point");
  const [full, setFull] = useState(false);
  const [ready, setReady] = useState(false);
  const layerProvider = layer?.provider;
  const layerTime = layer?.time;
  const layerWms = layer?.wmsLayer;
  const layerTileUrl = layer?.tileUrl;
  const coverageTileUrl = layer?.coverageTileUrl;
  const layerFallback = layer?.fallback;
  const layerOpacity = layer?.opacity;
  const layerTitle = layer?.title;
  opacityRef.current = layerOpacity ?? 0;
  coverageVisibleRef.current = coverageVisible;
  const layerKey = useMemo(
    () => layerProvider ? [layerProvider, layerTime, layerWms ?? "", layerTileUrl ?? "", coverageTileUrl ?? "", layerFallback ? "fallback" : "primary"].join("|") : "",
    [coverageTileUrl, layerFallback, layerProvider, layerTileUrl, layerTime, layerWms],
  );
  const effectiveLayer = useMemo<ActiveMapLayer | undefined>(() => layerProvider && layerTime ? {
    provider: layerProvider,
    title: layerTitle ?? "LIVE layer",
    time: layerTime,
    opacity: opacityRef.current,
    wmsLayer: layerWms,
    tileUrl: layerTileUrl,
    coverageTileUrl,
    fallback: layerFallback,
  } : undefined, [coverageTileUrl, layerFallback, layerProvider, layerTileUrl, layerTime, layerTitle, layerWms]);

  useEffect(() => { diagnosticsRef.current = onLayerDiagnostics; }, [onLayerDiagnostics]);

  useEffect(() => {
    let disposed = false;
    async function mount() {
      const [
        { default: Map }, { default: View }, { default: TileLayer }, { default: OSM },
        { default: VectorLayer }, { default: VectorSource }, { default: Feature }, { default: Point },
        { fromLonLat, toLonLat }, { default: Style }, { default: CircleStyle }, { default: Fill }, { default: Stroke },
      ] = await Promise.all([
        import("ol/Map"), import("ol/View"), import("ol/layer/Tile"), import("ol/source/OSM"),
        import("ol/layer/Vector"), import("ol/source/Vector"), import("ol/Feature"), import("ol/geom/Point"),
        import("ol/proj"), import("ol/style/Style"), import("ol/style/Circle"), import("ol/style/Fill"), import("ol/style/Stroke"),
      ]);
      if (disposed || !target.current) return;
      const feature = new Feature(new Point(fromLonLat([area.lon, area.lat])));
      feature.setStyle(new Style({ image: new CircleStyle({ radius: 8, fill: new Fill({ color: "#f3f5f6" }), stroke: new Stroke({ color: "#111519", width: 4 }) }) }));
      const base = new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }), opacity: 0.52, zIndex: 0 });
      const marker = new VectorLayer({ source: new VectorSource({ features: [feature] }), zIndex: 20 });
      const map = new Map({ target: target.current, layers: [base, marker], view: new View({ center: fromLonLat([area.lon, area.lat]), zoom: 4.8, minZoom: 3, maxZoom: 7 }), controls: [] });
      map.on("singleclick", (event: any) => {
        const [lon, lat] = toLonLat(event.coordinate);
        onPick({ name: selection === "bbox" ? "Центр области" : "Точка на карте", lat, lon });
      });
      markerRef.current = feature;
      mapRef.current = map;
      setReady(true);
    }
    void mount();
    return () => {
      disposed = true;
      mapRef.current?.setTarget(undefined);
      mapRef.current = null;
    };
    // One map instance is intentionally retained while weather sources switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    void import("ol/proj").then(({ fromLonLat }) => {
      const coordinate = fromLonLat([area.lon, area.lat]);
      markerRef.current.getGeometry().setCoordinates(coordinate);
      mapRef.current.getView().animate({ center: coordinate, duration: 500 });
    });
  }, [area]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    if (weatherRef.current) {
      map.removeLayer(weatherRef.current.layer);
      if (weatherRef.current.coverage) map.removeLayer(weatherRef.current.coverage);
      weatherRef.current = null;
    }
    if (!effectiveLayer || !layerKey) return;

    let disposed = false;
    let timer: number | undefined;
    const active = effectiveLayer;
    const counters = { tileStarts: 0, tileSuccesses: 0, tileErrors: 0, echoPixels: 0, coverageTiles: 0, coveragePixels: 0 };
    const emit = (state: LayerRenderState, reason?: string) => {
      const value: MapLayerDiagnostics = {
      state,
      frameTime: active.time,
      ...counters,
      hasCoverage: active.provider === "rainviewer" ? counters.coveragePixels > 0 : undefined,
      visible: true,
      opacity: active.opacity,
      zIndex: 10,
      url: active.provider === "rainviewer" ? active.tileUrl : `/api/eumetsat?LAYERS=${active.wmsLayer}&TIME=${active.time}`,
      reason,
      };
      lastLayerDiagnosticsRef.current = { provider: active.provider, value };
      diagnosticsRef.current(active.provider, value);
    };

    async function addLayer() {
      const [{ default: TileLayer }, { default: ImageLayer }, { default: XYZ }, { default: ImageWMS }] = await Promise.all([
        import("ol/layer/Tile"), import("ol/layer/Image"), import("ol/source/XYZ"), import("ol/source/ImageWMS"),
      ]);
      if (disposed || !mapRef.current) return;

      let weather: any;
      let coverage: any;
      if (active.provider === "rainviewer") {
        const source = new XYZ({ url: active.tileUrl, crossOrigin: "anonymous", maxZoom: 7 });
        const coverageSource = active.coverageTileUrl ? new XYZ({ url: active.coverageTileUrl, crossOrigin: "anonymous", maxZoom: 7 }) : undefined;
        const settle = () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            if (counters.tileSuccesses > 0) {
              if (coverageSource && counters.coverageTiles > 0 && counters.coveragePixels === 0) emit("NO_COVERAGE", "Радарное покрытие для выбранной области отсутствует.");
              else emit(counters.echoPixels > 32 ? "LAYER_LIVE" : "NO_ECHOES", counters.echoPixels > 32 ? undefined : "Слой загружен, осадков в выбранной области не обнаружено.");
            } else if (counters.tileErrors > 0) {
              emit("LAYER_ERROR", "Тайлы RainViewer не загрузились.");
            }
          }, 450);
        };
        source.on("tileloadstart", () => { counters.tileStarts += 1; emit("LAYER_LOADING"); });
        source.on("tileloadend", (event: any) => { counters.tileSuccesses += 1; counters.echoPixels += rasterPixels(event.tile); settle(); });
        source.on("tileloaderror", () => { counters.tileErrors += 1; settle(); });
        coverageSource?.on("tileloadend", (event: any) => { counters.coverageTiles += 1; counters.coveragePixels += rasterPixels(event.tile, true); settle(); });
        coverageSource?.on("tileloaderror", () => { counters.coverageTiles += 1; settle(); });
        weather = new TileLayer({ source, opacity: active.opacity / 100, visible: true, zIndex: 10 });
        if (coverageSource) coverage = new TileLayer({ source: coverageSource, opacity: coverageVisibleRef.current ? 0.22 : 0, visible: true, zIndex: 9 });
      } else {
        const source = new ImageWMS({
          url: "/api/eumetsat",
          params: { LAYERS: active.wmsLayer, TIME: active.time, FORMAT: "image/png", TRANSPARENT: "TRUE" },
          ratio: 1,
          crossOrigin: "anonymous",
        });
        source.on("imageloadstart", () => { counters.tileStarts += 1; emit("LAYER_LOADING"); });
        source.on("imageloadend", () => { counters.tileSuccesses += 1; emit("LAYER_LIVE"); });
        source.on("imageloaderror", () => { counters.tileErrors += 1; emit("LAYER_ERROR", "EUMETView не вернул изображение для выбранного времени."); });
        weather = new ImageLayer({ source, opacity: active.opacity / 100, visible: true, zIndex: 10 });
      }

      weatherRef.current = { key: layerKey, layer: weather, coverage };
      if (coverage) map.addLayer(coverage);
      map.addLayer(weather);
      emit("LAYER_LOADING");
    }

    void addLayer();
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      if (weatherRef.current?.key === layerKey) {
        map.removeLayer(weatherRef.current.layer);
        if (weatherRef.current.coverage) map.removeLayer(weatherRef.current.coverage);
        weatherRef.current = null;
      }
    };
  }, [effectiveLayer, layerKey, ready]);

  useEffect(() => {
    if (layerOpacity === undefined || !weatherRef.current) return;
    weatherRef.current.layer.setVisible(true);
    weatherRef.current.layer.setOpacity(layerOpacity / 100);
    const last = lastLayerDiagnosticsRef.current;
    if (last) {
      const value = { ...last.value, visible: true, opacity: layerOpacity };
      lastLayerDiagnosticsRef.current = { ...last, value };
      diagnosticsRef.current(last.provider, value);
    }
  }, [layerOpacity]);

  useEffect(() => {
    weatherRef.current?.coverage?.setOpacity(coverageVisible ? 0.22 : 0);
  }, [coverageVisible]);

  const zoom = (delta: number) => {
    const view = mapRef.current?.getView();
    view?.animate({ zoom: (view.getZoom() ?? 5) + delta, duration: 180 });
  };
  const chooseMode = (mode: SelectionMode) => { setSelection(mode); onSelectionMode(mode); };
  const geolocate = () => navigator.geolocation?.getCurrentPosition((position) => onPick({ name: "Текущее местоположение", lat: position.coords.latitude, lon: position.coords.longitude }), undefined, { timeout: 7000 });
  const toggleFull = async () => {
    if (!target.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await target.current.parentElement?.requestFullscreen();
    setFull(Boolean(!document.fullscreenElement));
  };
  const state = layer ? layer.fallback ? "FALLBACK" : layer.provider === "rainviewer" ? "RAINVIEWER RADAR" : "EUMETVIEW WMS" : "СЛОЙ НЕ ВЫБРАН";

  return <div className="mapShell">
    <div className="mapMeta">{state} · {layer ? `${layer.time.slice(11, 16)} UTC` : "ожидание"}</div>
    <div ref={target} className="olMap" aria-label="Интерактивная карта: выберите точку или область" />
    <div className="mapMarkerLabel">{area.name.toUpperCase()}<small>{area.lat.toFixed(2)}°N · {area.lon.toFixed(2)}°E</small></div>
    <div className="mapTools"><button onClick={() => zoom(1)} aria-label="Увеличить карту">+</button><button onClick={() => zoom(-1)} aria-label="Уменьшить карту">−</button><button onClick={geolocate} aria-label="Использовать геолокацию">⌖</button><button onClick={toggleFull} aria-label="Полноэкранная карта">{full ? "×" : "⛶"}</button></div>
    <div className="selectionTools" role="group" aria-label="Способ выбора области">{(["point", "bbox", "view"] as SelectionMode[]).map((mode) => <button key={mode} className={selection === mode ? "active" : ""} onClick={() => chooseMode(mode)}>{mode === "point" ? "ТОЧКА" : mode === "bbox" ? "ОБЛАСТЬ" : "ВИД"}</button>)}</div>
    <div className="mapAttribution">© OpenStreetMap · {layer?.provider === "rainviewer" ? "Weather data by RainViewer" : "© EUMETSAT"}</div>
  </div>;
}
