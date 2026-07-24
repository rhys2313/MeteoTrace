"use client";
import { ProviderProduct } from "@/lib/providers/types";
import { Panel } from "@/components/common/Panel";

type Props = { category: "radar" | "satellite"; products: ProviderProduct[]; selected?: string; onSelected: (id: string) => void; opacity: number; onOpacity: (value: number) => void };

export function ProductSelector({ category, products, selected, onSelected, opacity, onOpacity }: Props) {
  const isRadar = category === "radar";
  return <Panel title={isRadar ? "РАДАР · RAINVIEWER" : "СПУТНИК · EUMETVIEW"} className="productPanel">
    <p className="demoTag">{isRadar ? "Исторические кадры радара из официального публичного API. Прогнозные кадры не используются." : "Слой и временные метки выбраны из актуального GetCapabilities EUMETView."}</p>
    <div className="productList">{products.map((product) => <button key={product.id} className={selected === product.id ? "product selected" : "product"} onClick={() => onSelected(product.id)}><span className="radio" /><span><b>{product.title}</b><small>{product.supportedTimes.length} доступных кадров · {product.coverage}</small></span></button>)}</div>
    <div className="layerToggles"><p>ОТОБРАЖЕНИЕ</p><label>ПРОЗРАЧНОСТЬ <input type="range" min="0" max="100" value={opacity} onChange={(event) => onOpacity(Number(event.target.value))} /></label><p className="legendTitle">ЛЕГЕНДА</p>{isRadar ? <div className="radarLegend" aria-label="Шкала отражаемости радара"><span>слабее</span><i /><span>сильнее · dBZ</span></div> : <small>WMS-визуализация: численные значения пикселей не интерпретируются.</small>}</div>
  </Panel>;
}
