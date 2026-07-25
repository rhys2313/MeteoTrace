"use client";
/* eslint-disable @next/next/no-img-element -- these are provider-owned, time-addressed rasters. */

import { type CSSProperties, useEffect, useState } from "react";
import { ComparisonMode, Frame } from "@/types";
import { Panel } from "@/components/common/Panel";

type Props = {
  frames: Frame[];
  frameA: number;
  frameB: number;
  onFrameA: (value: number) => void;
  onFrameB: (value: number) => void;
  imageUrlForFrame: (index: number) => string | undefined;
  sourceLabel: string;
};

export function ComparisonPanel({ frames, frameA, frameB, onFrameA, onFrameB, imageUrlForFrame, sourceLabel }: Props) {
  const [split, setSplit] = useState(52);
  const [mode, setMode] = useState<Exclude<ComparisonMode, "difference">>("split");
  const [showA, setShowA] = useState(true);
  const [opacity, setOpacity] = useState(50);
  const imageA = imageUrlForFrame(frameA);
  const imageB = imageUrlForFrame(frameB);

  useEffect(() => {
    if (mode !== "blink") return;
    const timer = window.setInterval(() => setShowA((value) => !value), 650);
    return () => window.clearInterval(timer);
  }, [mode]);

  const field = (label: "A" | "B", image: string | undefined, frame: Frame | undefined, className: string, style?: CSSProperties) => <div className={`compareField ${className}`} style={style}>{image ? <img src={image} alt={`Реальный кадр ${label}: ${frame?.label ?? ""}`} /> : <p>Кадр недоступен</p>}<b>{label}</b><span>{frame?.label ?? "—"}</span></div>;
  return <Panel title="СРАВНЕНИЕ РЕАЛЬНЫХ КАДРОВ · A / B" className="comparison"><div className="compareToolbar"><label>КАДР A <select value={frameA} onChange={(event) => onFrameA(Number(event.target.value))}>{frames.map((frame) => <option key={frame.id} value={frame.index}>{frame.label}</option>)}</select></label><label>КАДР B <select value={frameB} onChange={(event) => onFrameB(Number(event.target.value))}>{frames.map((frame) => <option key={frame.id} value={frame.index}>{frame.label}</option>)}</select></label><small>{sourceLabel}</small></div><div className="modeButtons" role="group" aria-label="Режим сравнения кадров">{(["split", "horizontal", "opacity", "blink"] as const).map((item) => <button type="button" key={item} className={mode === item ? "active" : ""} onClick={() => setMode(item)}>{({ split: "ВЕРТ.", horizontal: "ГОРИЗ.", opacity: "ПРОЗР.", blink: "МИГАНИЕ" })[item]}</button>)}<button type="button" disabled title="Разность отключена: текущие WMS/XYZ-кадры являются визуализациями без совместимых численных растров.">РАЗНОСТЬ</button></div><div className={`compareCanvas ${mode}`}>
    {field("A", imageA, frames[frameA], "fieldA", mode === "blink" && !showA ? { opacity: 0 } : mode === "opacity" ? { opacity: opacity / 100 } : undefined)}
    {mode !== "blink" ? field("B", imageB, frames[frameB], "fieldB", mode === "split" ? { clipPath: `inset(0 0 0 ${split}%)` } : mode === "horizontal" ? { clipPath: `inset(${split}% 0 0 0)` } : mode === "opacity" ? { opacity: 1 - opacity / 100 } : undefined) : null}
    {mode === "blink" ? field(showA ? "A" : "B", showA ? imageA : imageB, showA ? frames[frameA] : frames[frameB], "fieldBlink") : null}
    {(mode === "split" || mode === "horizontal") ? <input className={`comparisonSlider ${mode}`} type="range" min="0" max="100" value={split} onChange={(event) => setSplit(Number(event.target.value))} aria-label="Граница сравнения кадров" /> : null}
    {mode === "opacity" ? <label className="opacityControl">A: {opacity}%<input type="range" min="0" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></label> : null}
  </div><p className="hint">A/B использует настоящие растры текущего источника. «Разность» отключена: без совместимой численной сетки или подтверждённой палитры корректный метеорологический расчёт невозможен.</p></Panel>;
}
