"use client";
/* eslint-disable @next/next/no-img-element -- this panel displays real provider frame rasters. */

import { Frame } from "@/types";
import { Panel } from "@/components/common/Panel";

export function AtmosphericTraceGraph({ frames, imageUrlForFrame, sourceLabel, productTitle }: { frames: Frame[]; imageUrlForFrame: (index: number) => string | undefined; sourceLabel: string; productTitle: string }) {
  const selected = frames.length > 4 ? [0, Math.floor((frames.length - 1) / 3), Math.floor((frames.length - 1) * 2 / 3), frames.length - 1] : frames.map((frame) => frame.index);
  return <Panel title="ПОСЛЕДОВАТЕЛЬНОСТЬ РЕАЛЬНЫХ КАДРОВ" className="tracePanel"><div className="sequenceMeta"><span>{sourceLabel}</span><span>{productTitle}</span><span>WMS/XYZ визуализация</span></div><div className="frameSequence">{selected.map((index) => <figure key={frames[index]?.id}><img src={imageUrlForFrame(index)} alt={`Кадр ${frames[index]?.label ?? ""}`} /><figcaption>{frames[index]?.label ?? "—"}</figcaption></figure>)}</div><p className="traceCaption">Это визуальная последовательность реальных кадров и их метаданных. Численный временной ряд не показан: активный источник не предоставляет разрешённого численного значения пикселя.</p></Panel>;
}
