"use client";
import { useEffect, useRef, useState } from "react";
import { Area, ProductId, SelectionMode } from "@/types";

type Props = { area: Area; frameTime: string; product: ProductId; live: boolean; opacity: number; onPick: (area: Area) => void; onSelectionMode: (mode: SelectionMode) => void };
const WMS_LAYER: Record<ProductId, string> = { geocolour: "msg_fes:rgb_natural", ir105: "msg_fes:ir108", cloudHeight: "msg_fes:rgb_airmass", cloudTemperature: "msg_fes:ir108", cloudType: "msg_fes:rgb_natural", lightning: "msg_fes:rgb_airmass" };

export function MeteoMap({ area, frameTime, product, live, opacity, onPick, onSelectionMode }: Props) {
  const target = useRef<HTMLDivElement>(null); const mapRef = useRef<any>(null); const markerRef = useRef<any>(null); const weatherRef = useRef<any>(null); const [selection, setSelection] = useState<SelectionMode>("point"); const [full, setFull] = useState(false);
  useEffect(() => {
    let disposed = false;
    async function mount() {
      const [{ default: Map }, { default: View }, { default: TileLayer }, { default: ImageLayer }, { default: OSM }, { default: VectorLayer }, { default: VectorSource }, { default: Feature }, { default: Point }, { fromLonLat, toLonLat }, { default: Style }, { default: CircleStyle }, { default: Fill }, { default: Stroke }] = await Promise.all([import("ol/Map"), import("ol/View"), import("ol/layer/Tile"), import("ol/layer/Image"), import("ol/source/OSM"), import("ol/layer/Vector"), import("ol/source/Vector"), import("ol/Feature"), import("ol/geom/Point"), import("ol/proj"), import("ol/style/Style"), import("ol/style/Circle"), import("ol/style/Fill"), import("ol/style/Stroke")]);
      if (disposed || !target.current) return;
      const feature = new Feature(new Point(fromLonLat([area.lon, area.lat]))); feature.setStyle(new Style({ image: new CircleStyle({ radius: 8, fill: new Fill({ color: "#f3f5f6" }), stroke: new Stroke({ color: "#111519", width: 4 }) }) }));
      const satellite = new ImageLayer({ opacity: 0.64 });
      const map = new Map({ target: target.current, layers: [new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }) }), satellite, new VectorLayer({ source: new VectorSource({ features: [feature] }) })], view: new View({ center: fromLonLat([area.lon, area.lat]), zoom: 4.8, minZoom: 3, maxZoom: 10 }), controls: [] });
      map.on("singleclick", (event: any) => { const [lon, lat] = toLonLat(event.coordinate); onPick({ name: selection === "bbox" ? "Центр области" : "Точка на карте", lat, lon }); }); markerRef.current = feature; weatherRef.current = satellite; mapRef.current = map;
    }
    mount(); return () => { disposed = true; mapRef.current?.setTarget(undefined); mapRef.current = null; };
  // A single OpenLayers instance intentionally persists so map position survives product/time changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (!mapRef.current || !markerRef.current) return; import("ol/proj").then(({ fromLonLat }) => { const coordinate = fromLonLat([area.lon, area.lat]); markerRef.current.getGeometry().setCoordinates(coordinate); mapRef.current.getView().animate({ center: coordinate, duration: 500 }); }); }, [area]);
  useEffect(() => { const layer = weatherRef.current; if (!layer) return; layer.setOpacity(opacity / 100); layer.setVisible(live); if (!live) { layer.setSource(null); return; } import("ol/source/ImageWMS").then(({ default: ImageWMS }) => { if (!weatherRef.current || !live) return; const current = weatherRef.current.getSource(); if (current) current.updateParams({ LAYERS: WMS_LAYER[product], TIME: frameTime, FORMAT: "image/jpeg" }); else weatherRef.current.setSource(new ImageWMS({ url: "/api/eumetsat", params: { LAYERS: WMS_LAYER[product], TIME: frameTime, FORMAT: "image/jpeg" }, ratio: 1, serverType: "geoserver", crossOrigin: "anonymous" })); }); }, [product, frameTime, live, opacity]);
  const zoom = (delta: number) => { const view = mapRef.current?.getView(); view?.animate({ zoom: (view.getZoom() ?? 5) + delta, duration: 180 }); };
  const chooseMode = (mode: SelectionMode) => { setSelection(mode); onSelectionMode(mode); };
  const geolocate = () => navigator.geolocation?.getCurrentPosition((position) => onPick({ name: "Текущее местоположение", lat: position.coords.latitude, lon: position.coords.longitude }), undefined, { timeout: 7000 });
  const toggleFull = async () => { if (!target.current) return; if (document.fullscreenElement) await document.exitFullscreen(); else await target.current.parentElement?.requestFullscreen(); setFull(!document.fullscreenElement); };
  return <div className="mapShell"><div className="mapMeta">{live ? "EUMETSAT WMS · LIVE" : "СПУТНИКОВЫЙ СЛОЙ ОТКЛЮЧЁН"} · {frameTime.slice(11, 16)} UTC</div><div ref={target} className="olMap" aria-label="Интерактивная карта: выберите точку или область" /><div className="mapMarkerLabel">{area.name.toUpperCase()}<small>{area.lat.toFixed(2)}°N · {area.lon.toFixed(2)}°E</small></div><div className="mapTools"><button onClick={() => zoom(1)} aria-label="Увеличить карту">+</button><button onClick={() => zoom(-1)} aria-label="Уменьшить карту">−</button><button onClick={geolocate} aria-label="Использовать геолокацию">⌖</button><button onClick={toggleFull} aria-label="Полноэкранная карта">{full ? "×" : "⛶"}</button></div><div className="selectionTools" role="group" aria-label="Способ выбора области">{(["point", "bbox", "view"] as SelectionMode[]).map((mode) => <button key={mode} className={selection === mode ? "active" : ""} onClick={() => chooseMode(mode)}>{mode === "point" ? "ТОЧКА" : mode === "bbox" ? "ОБЛАСТЬ" : "ВИД"}</button>)}</div><div className="mapAttribution">© OpenStreetMap · © EUMETSAT (when layer is available)</div></div>;
}
