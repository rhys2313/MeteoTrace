"use client";

import { Panel } from "@/components/common/Panel";
import { MapLayerDiagnostics } from "@/components/map/MeteoMap";
import { ProviderProduct } from "@/lib/providers/types";

type Props = {
  category: "radar" | "satellite";
  products: ProviderProduct[];
  selected?: string;
  onSelected: (id: string) => void;
  opacity: number;
  onOpacity: (value: number) => void;
  diagnostics: MapLayerDiagnostics;
  apiState: string;
  buildVersion: string;
};

export function ProductSelector({ category, products, selected, onSelected, opacity, onOpacity, diagnostics, apiState, buildVersion }: Props) {
  const isRadar = category === "radar";
  return <Panel title={isRadar ? "РАДАР · RAINVIEWER" : "СПУТНИК · EUMETVIEW"} className="productPanel">
    <p className="demoTag">{isRadar ? "Исторические радарные кадры из публичного API. API LIVE не означает, что слой уже виден: это подтверждают счётчики тайлов ниже." : "Слой и временные метки выбраны из актуального GetCapabilities EUMETView."}</p>
    <div className="productList">{products.map((product) => <button key={product.id} className={selected === product.id ? "product selected" : "product"} onClick={() => onSelected(product.id)}><span className="radio" /><span><b>{product.title}</b><small>{product.supportedTimes.length} доступных кадров · {product.coverage}</small></span></button>)}</div>
    <div className="layerToggles"><p>ОТОБРАЖЕНИЕ</p><label>ПРОЗРАЧНОСТЬ <input type="range" min="0" max="100" value={opacity} onChange={(event) => onOpacity(Number(event.target.value))} /></label><p className="legendTitle">ЛЕГЕНДА</p>{isRadar ? <div className="radarLegend" aria-label="Шкала отражаемости радара"><span>слабее</span><i /><span>сильнее · dBZ</span></div> : <small>WMS-визуализация: численные значения пикселей не интерпретируются.</small>}</div>
    <details className="layerDiagnostics" open data-testid="layer-diagnostics"><summary>ДИАГНОСТИКА СЛОЯ</summary><dl>
      <div><dt>BUILD</dt><dd>{buildVersion}</dd></div><div><dt>API</dt><dd>{apiState}</dd></div><div><dt>СОСТОЯНИЕ</dt><dd>{diagnostics.state}</dd></div>
      <div><dt>ВРЕМЯ</dt><dd>{diagnostics.frameTime ?? "—"}</dd></div><div><dt>ТАЙЛЫ</dt><dd>{diagnostics.tileStarts} старт / {diagnostics.tileSuccesses} OK / {diagnostics.tileErrors} err</dd></div>
      <div><dt>ПИКСЕЛИ ЭХА</dt><dd>{diagnostics.echoPixels}</dd></div><div><dt>ВИДИМ</dt><dd>{String(diagnostics.visible)}</dd></div><div><dt>OPACITY / Z</dt><dd>{diagnostics.opacity}% / {diagnostics.zIndex}</dd></div>
      <div className="diagnosticUrl"><dt>URL</dt><dd>{diagnostics.url ?? "—"}</dd></div>
    </dl></details>
  </Panel>;
}
