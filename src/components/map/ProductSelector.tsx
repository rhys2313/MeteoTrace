"use client";
import { PRODUCTS } from "@/config/products";
import { ProductId } from "@/types";
import { Panel } from "@/components/common/Panel";
export function ProductSelector({ selected, onSelected }: { selected: ProductId; onSelected: (id: ProductId) => void }) {
  return <Panel title="ПРОДУКТЫ · EUMETSAT" className="productPanel"><p className="demoTag">WMS‑слой выбирается из ограниченного списка; недоступные продукты не подменяются изображением.</p><div className="productList">{PRODUCTS.map((product) => <button key={product.id} className={selected === product.id ? "product selected" : "product"} onClick={() => onSelected(product.id)}><span className="radio" /><span><b>{product.name}</b><small>{product.shortName} · {product.units}</small></span></button>)}</div><div className="layerToggles"><p>НАЛОЖЕНИЯ</p><label><input type="checkbox" defaultChecked /> ГРАНИЦЫ</label><label><input type="checkbox" defaultChecked /> ПОДПИСИ</label><label><input type="checkbox" defaultChecked /> СЕТКА</label></div></Panel>;
}
