import { PRODUCTS } from "@/config/products";
import { EUMETSAT_WMS } from "@/config/sources";
import { Panel } from "@/components/common/Panel";

export function Sources() {
  return <section id="sources" className="sources"><div className="sectionHeading"><p>ИСТОЧНИКИ И ПРОДУКТЫ</p><h2>Что отображает каждый слой</h2></div><div className="sourceGrid">{PRODUCTS.map((product) => <Panel key={product.id}><h3>{product.name}</h3><dl><dt>ЧТО ЭТО</dt><dd>{product.description}</dd><dt>ИНТЕРПРЕТАЦИЯ</dt><dd>{product.interpretation}</dd><dt>ОГРАНИЧЕНИЕ</dt><dd>{product.limitations}</dd><dt>ТИП / ЕДИНИЦЫ</dt><dd>{product.kind === "measurement" ? "прямое наблюдение" : "расчётный продукт"} · {product.units}</dd></dl></Panel>)}</div><aside className="sourceNotice"><b>EUMETSAT EUMETView WMS</b><p>{EUMETSAT_WMS.note}</p><p>MeteoTrace предназначен для исследования и визуального анализа данных. Платформа не заменяет официальные предупреждения, прогнозы метеорологических служб и профессиональную интерпретацию специалиста.</p></aside></section>;
}
