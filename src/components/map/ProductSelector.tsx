"use client";
/* eslint-disable @next/next/no-img-element -- an optional official WMS LegendURL is remote and dynamic. */

import { Panel } from "@/components/common/Panel";
import { ActiveMapLayer, MapLayerDiagnostics } from "@/components/map/MeteoMap";
import { Area } from "@/types";
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
  area: Area;
  layer?: ActiveMapLayer;
  coverageVisible: boolean;
  onCoverageVisible: (visible: boolean) => void;
  pointValue: { status: "visualization" | "checking" | "available" | "unavailable"; detail?: string };
};

const GROUP_LABELS: Record<NonNullable<ProviderProduct["group"]>, string> = {
  overview: "ОБЗОРНЫЕ RGB", infrared: "ИНФРАКРАСНЫЕ", cloud: "ОБЛАКА", precipitation: "ОСАДКИ", convection: "КОНВЕКЦИЯ", lightning: "МОЛНИИ", other: "ПРОЧЕЕ",
};

function ProductButton({ product, selected, onSelected }: { product: ProviderProduct; selected?: string; onSelected: (id: string) => void }) {
  return <button key={product.id} type="button" className={selected === product.id ? "product selected" : "product"} onClick={() => onSelected(product.id)}><span className="radio" /><span><b>{product.title}</b><small>{product.supportedTimes.length} кадров · {product.group ? GROUP_LABELS[product.group] : product.coverage}</small></span></button>;
}

function interval(times: string[]) {
  if (times.length < 2) return "не указан";
  const diff = Date.parse(times[1]) - Date.parse(times[0]);
  return Number.isFinite(diff) && diff > 0 ? `${Math.round(diff / 60_000)} мин` : "нерегулярный";
}

export function ProductSelector({ category, products, selected, onSelected, opacity, onOpacity, diagnostics, apiState, buildVersion, area, layer, coverageVisible, onCoverageVisible, pointValue }: Props) {
  const isRadar = category === "radar";
  const active = products.find((product) => product.id === selected) ?? products[0];
  const recommended = products.filter((product) => product.recommended !== false);
  const other = products.filter((product) => product.recommended === false);
  const coverage = diagnostics.state === "NO_COVERAGE" ? "Радарное покрытие отсутствует" : diagnostics.hasCoverage ? "Покрытие подтверждено маской RainViewer" : "Покрытие проверяется";

  return <Panel title={isRadar ? "РАДАР · RAINVIEWER" : "СПУТНИК · EUMETVIEW"} className="productPanel">
    <section className="productSummary" aria-label="Смысл активного слоя">
      <p className="panelLabel">ЧТО ОТОБРАЖАЕТСЯ</p><strong>{active?.title ?? "Ожидание продукта"}</strong>
      <p>{isRadar ? "Композитная визуализация радарного эха. Цвета показывают интенсивность отражаемости в выбранной API-схеме; это не измерение в одной точке." : active?.abstract ?? "Официальная визуализация EUMETView."}</p>
      <dl><dt>ВРЕМЯ</dt><dd>{layer?.time ?? "—"}</dd><dt>ШАГ</dt><dd>{interval(active?.supportedTimes ?? [])}</dd><dt>ПОКРЫТИЕ</dt><dd>{isRadar ? coverage : active?.coverage ?? "—"}</dd><dt>ЧИСЛО В ТОЧКЕ</dt><dd>Недоступно: источник предоставляет только визуализацию.</dd></dl>
      {isRadar ? <p className="productNotice">RainViewer — композит доступных радаров, а не гарантированное покрытие каждой территории.</p> : active?.dataKind === "algorithmic_estimate" ? <p className="productNotice">Спутниковая оценка осадков — не радар.</p> : null}
      {active?.styles?.find((style) => style.legendUrl)?.legendUrl ? <img className="officialLegend" src={active.styles.find((style) => style.legendUrl)?.legendUrl} alt={`Официальная легенда ${active.title}`} /> : <p className="productNotice">Официальная численная легенда не предоставлена этим WMS-слоем.</p>}
    </section>

    <div className="productList">{(isRadar ? products : recommended).map((product) => <ProductButton key={product.id} product={product} selected={selected} onSelected={onSelected} />)}</div>
    {!isRadar && other.length > 0 ? <details className="allProducts"><summary>ВСЕ ПРОДУКТЫ · {other.length}</summary>{Object.entries(GROUP_LABELS).map(([group, label]) => { const items = other.filter((product) => product.group === group); return items.length ? <div key={group}><p>{label}</p>{items.map((product) => <ProductButton key={product.id} product={product} selected={selected} onSelected={onSelected} />)}</div> : null; })}</details> : null}

    <div className="layerToggles"><p>ОТОБРАЖЕНИЕ</p><label>ПРОЗРАЧНОСТЬ <input type="range" min="0" max="100" value={opacity} onChange={(event) => onOpacity(Number(event.target.value))} /></label>{isRadar ? <label><input type="checkbox" checked={coverageVisible} onChange={(event) => onCoverageVisible(event.target.checked)} /> ПОКАЗАТЬ МАСКУ ПОКРЫТИЯ</label> : null}<p className="legendTitle">ЛЕГЕНДА</p>{isRadar ? <div className="radarLegend" aria-label="Шкала отражаемости радара"><span>слабее</span><i /><span>сильнее · визуальная шкала API</span></div> : <small>Цвета интерпретируются только по официальной LegendURL; без неё численные диапазоны не выводятся.</small>}</div>

    <section className="pointInfo" aria-live="polite"><p className="panelLabel">ВЫБРАННАЯ ТОЧКА</p><dl><dt>КООРДИНАТЫ</dt><dd>{area.lat.toFixed(4)}, {area.lon.toFixed(4)}</dd><dt>ИСТОЧНИК</dt><dd>{isRadar ? "RainViewer" : "EUMETView"}</dd><dt>ПРОДУКТ</dt><dd>{active?.title ?? "—"}</dd><dt>КАДР</dt><dd>{layer?.time ?? "—"}</dd><dt>ТИП ДАННЫХ</dt><dd>{isRadar ? "XYZ raster" : "WMS image"}</dd><dt>ПОКРЫТИЕ</dt><dd>{isRadar ? coverage : "Зависит от выбранного продукта"}</dd></dl>{pointValue.status === "checking" ? <p>Проверяем разрешённый интерфейс GetFeatureInfo…</p> : pointValue.status === "available" ? <><p>Источник вернул ответ GetFeatureInfo для этой точки; это не преобразованная MeteoTrace величина.</p><pre className="pointRaw">{pointValue.detail}</pre></> : <p>{pointValue.status === "unavailable" ? "Численный ответ для этой точки не выдан выбранным WMS-слоем." : "Источник предоставляет только визуализацию. Численное значение для точки недоступно."}</p>}</section>

    <details className="layerDiagnostics" data-testid="layer-diagnostics"><summary>ДИАГНОСТИКА СЛОЯ</summary><dl>
      <div><dt>BUILD</dt><dd>{buildVersion}</dd></div><div><dt>API</dt><dd>{apiState}</dd></div><div><dt>СОСТОЯНИЕ</dt><dd>{diagnostics.state}</dd></div>
      <div><dt>ВРЕМЯ</dt><dd>{diagnostics.frameTime ?? "—"}</dd></div><div><dt>ТАЙЛЫ</dt><dd>{diagnostics.tileStarts} старт / {diagnostics.tileSuccesses} OK / {diagnostics.tileErrors} err</dd></div>
      <div><dt>ЭХО / ПОКРЫТИЕ</dt><dd>{diagnostics.echoPixels} / {diagnostics.coveragePixels} px</dd></div><div><dt>ВИДИМ</dt><dd>{String(diagnostics.visible)}</dd></div><div><dt>OPACITY / Z</dt><dd>{diagnostics.opacity}% / {diagnostics.zIndex}</dd></div>
      <div className="diagnosticUrl"><dt>URL</dt><dd>{diagnostics.url ?? "—"}</dd></div>
    </dl></details>
  </Panel>;
}
