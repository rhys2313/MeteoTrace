"use client";
import { MeteoCase } from "@/types";
import { Panel } from "@/components/common/Panel";
import { exportJson, exportPdf, exportPngCard, exportTxt, shareCase } from "@/lib/exportCase";

export function SavedCases({ cases, onOpen, onRemove, onRename, onDuplicate }: { cases: MeteoCase[]; onOpen: (item: MeteoCase) => void; onRemove: (id: string) => void; onRename: (id: string, name: string) => void; onDuplicate: (item: MeteoCase) => void }) {
  return <Panel title={`КЕЙСЫ · ${cases.length}`} className="savedCases">{cases.length === 0 ? <p className="empty">Сохранённых кейсов пока нет. Сохраните текущую конфигурацию или импортируйте JSON.</p> : <ul>{cases.map((item) => <li key={item.id}><button className="caseName" onClick={() => onOpen(item)}><b>{item.title}</b><small>{item.area.name} · {new Date(item.createdAt).toLocaleDateString("ru-RU")}</small></button><div className="caseActions"><button onClick={() => onRename(item.id, window.prompt("Новое название", item.title) ?? item.title)} aria-label="Переименовать кейс">✎</button><button onClick={() => onDuplicate(item)} title="Дублировать">⧉</button><button onClick={() => exportTxt(item)}>TXT</button><button onClick={() => exportJson(item)}>JSON</button><button onClick={() => exportPngCard(item)}>PNG</button><button onClick={() => exportPdf(item)}>PDF</button><button onClick={() => shareCase(item)} title="Скопировать ссылку">↗</button><button onClick={() => window.confirm(`Удалить «${item.title}»?`) && onRemove(item.id)} aria-label="Удалить кейс">×</button></div></li>)}</ul>}</Panel>;
}
