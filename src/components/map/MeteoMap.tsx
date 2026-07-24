"use client";
import { useEffect, useRef, useState } from "react";
import { Area, SelectionMode } from "@/types";
import { ProviderHealth } from "@/lib/providers/types";

export type ActiveMapLayer = { provider: "eumetsat" | "rainviewer"; title: string; time: string; opacity: number; wmsLayer?: string; tileUrl?: string; fallback?: boolean };
type Props = { area: Area; layer?: ActiveMapLayer; onPick: (area: Area) => void; onSelectionMode: (mode: SelectionMode) => void; onLayerStatus: (provider: ActiveMapLayer["provider"], status: ProviderHealth, reason?: string) => void };

export function MeteoMap({ area, layer, onPick, onSelectionMode, onLayerStatus }: Props) {
  const target = useRef<HTMLDivElement>(null); const mapRef = useRef<any>(null); const markerRef = useRef<any>(null); const weatherRef = useRef<any>(null); const [selection, setSelection] = useState<SelectionMode>("point"); const [full, setFull] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    async function mount() {
      const [{ default: Map }, { default: View }, { default: TileLayer }, { default: OSM }, { default: VectorLayer }, { default: VectorSource }, { default: Feature }, { default: Point }, { fromLonLat, toLonLat }, { default: Style }, { default: CircleStyle }, { default: Fill }, { default: Stroke }] = await Promise.all([import("ol/Map"), import("ol/View"), import("ol/layer/Tile"), import("ol/source/OSM"), import("ol/layer/Vector"), import("ol/source/Vector"), import("ol/Feature"), import("ol/geom/Point"), import("ol/proj"), import("ol/style/Style"), import("ol/style/Circle"), import("ol/style/Fill"), import("ol/style/Stroke")]);
      if (disposed || !target.current) return;
      const feature = new Feature(new Point(fromLonLat([area.lon, area.lat]))); feature.setStyle(new Style({ image: new CircleStyle({ radius: 8, fill: new Fill({ color: "#f3f5f6" }), stroke: new Stroke({ color: "#111519", width: 4 }) }) }));
      const map = new Map({ target: target.current, layers: [new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }) }), new VectorLayer({ source: new VectorSource({ features: [feature] }) })], view: new View({ center: fromLonLat([area.lon, area.lat]), zoom: 4.8, minZoom: 3, maxZoom: 7 }), controls: [] });
      map.on("singleclick", (event: any) => { const [lon, lat] = toLonLat(event.coordinate); onPick({ name: selection === "bbox" ? "Центр области" : "Точка на карте", lat, lon }); }); markerRef.current = feature; mapRef.current = map; setReady(true);
    }
    mount(); return () => { disposed = true; mapRef.current?.setTarget(undefined); mapRef.current = null; };
  // OpenLayers is intentionally mounted once so the user keeps their map position.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!mapRef.current || !markerRef.current) return; import("ol/proj").then(({ fromLonLat }) => { const coordinate = fromLonLat([area.lon, area.lat]); markerRef.current.getGeometry().setCoordinates(coordinate); mapRef.current.getView().animate({ center: coordinate, duration: 500 }); }); }, [area]);
  useEffect(() => {
    let disposed = false; const map = mapRef.current;
    if (!map) return;
    const previous = weatherRef.current; if (previous) map.removeLayer(previous);
    if (!layer) { weatherRef.current = null; return; }
    const active = layer;
    async function addLayer() {
      const [{ default: TileLayer }, { default: ImageLayer }, { default: XYZ }, { default: ImageWMS }] = await Promise.all([import("ol/layer/Tile"), import("ol/layer/Image"), import("ol/source/XYZ"), import("ol/source/ImageWMS")]);
      if (disposed || !mapRef.current) return;
      let reported = false; const report = (status: ProviderHealth, reason?: string) => { if (!reported || status !== "LIVE") { reported = status === "LIVE"; onLayerStatus(active.provider, status, reason); } };
      const weather = active.provider === "rainviewer" ? (() => { const source = new XYZ({ url: active.tileUrl, crossOrigin: "anonymous", maxZoom: 7 }); source.once("tileloadend", () => report("LIVE")); source.once("tileloaderror", () => report("OFFLINE", "Карта не получила изображение слоя.")); return new TileLayer({ source, opacity: active.opacity / 100 }); })() : (() => { const source = new ImageWMS({ url: "/api/eumetsat", params: { LAYERS: active.wmsLayer, TIME: active.time, FORMAT: "image/jpeg" }, ratio: 1, serverType: "geoserver", crossOrigin: "anonymous" }); source.once("imageloadend", () => report("LIVE")); source.once("imageloaderror", () => report("OFFLINE", "Карта не получила изображение слоя.")); return new ImageLayer({ source, opacity: active.opacity / 100 }); })();
      weatherRef.current = weather; map.addLayer(weather);
    }
    addLayer(); return () => { disposed = true; };
  }, [layer, onLayerStatus, ready]);
  const zoom = (delta: number) => { const view = mapRef.current?.getView(); view?.animate({ zoom: (view.getZoom() ?? 5) + delta, duration: 180 }); };
  const chooseMode = (mode: SelectionMode) => { setSelection(mode); onSelectionMode(mode); };
  const geolocate = () => navigator.geolocation?.getCurrentPosition((position) => onPick({ name: "Текущее местоположение", lat: position.coords.latitude, lon: position.coords.longitude }), undefined, { timeout: 7000 });
  const toggleFull = async () => { if (!target.current) return; if (document.fullscreenElement) await document.exitFullscreen(); else await target.current.parentElement?.requestFullscreen(); setFull(!document.fullscreenElement); };
  const state = layer ? layer.fallback ? "FALLBACK" : layer.provider === "rainviewer" ? "RAINVIEWER RADAR" : "EUMETVIEW WMS" : "СЛОЙ НЕ ВЫБРАН";
  return <div className="mapShell"><div className="mapMeta">{state} · {layer ? `${layer.time.slice(11, 16)} UTC` : "ожидание"}</div><div ref={target} className="olMap" aria-label="Интерактивная карта: выберите точку или область" /><div className="mapMarkerLabel">{area.name.toUpperCase()}<small>{area.lat.toFixed(2)}°N · {area.lon.toFixed(2)}°E</small></div><div className="mapTools"><button onClick={() => zoom(1)} aria-label="Увеличить карту">+</button><button onClick={() => zoom(-1)} aria-label="Уменьшить карту">−</button><button onClick={geolocate} aria-label="Использовать геолокацию">⌖</button><button onClick={toggleFull} aria-label="Полноэкранная карта">{full ? "×" : "⛶"}</button></div><div className="selectionTools" role="group" aria-label="Способ выбора области">{(["point", "bbox", "view"] as SelectionMode[]).map((mode) => <button key={mode} className={selection === mode ? "active" : ""} onClick={() => chooseMode(mode)}>{mode === "point" ? "ТОЧКА" : mode === "bbox" ? "ОБЛАСТЬ" : "ВИД"}</button>)}</div><div className="mapAttribution">© OpenStreetMap · {layer?.provider === "rainviewer" ? "Weather data by RainViewer" : "© EUMETSAT"}</div></div>;
}
