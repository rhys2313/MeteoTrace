"use client";
import { Frame } from "@/types";
import { Panel } from "@/components/common/Panel";

export function Timeline({ frames, frame, setFrame, playing, setPlaying, speed, setSpeed }: { frames: Frame[]; frame: number; setFrame: (index: number) => void; playing: boolean; setPlaying: (value: boolean) => void; speed: number; setSpeed: (value: number) => void }) {
  const current = frames[frame];
  if (!current) return <Panel title="ВРЕМЕННАЯ ШКАЛА · UTC" className="timeline"><p className="hint">Ожидание реальных временных меток источника…</p></Panel>;
  return <Panel title="ВРЕМЕННАЯ ШКАЛА · UTC" className="timeline" ><div className="timelineTop"><div className="playback"><button onClick={() => setFrame(0)} aria-label="Первый кадр">|◀</button><button onClick={() => setFrame(frame - 1)} aria-label="Предыдущий кадр">◀</button><button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? "Пауза" : "Воспроизвести"}>{playing ? "Ⅱ" : "▶"}</button><button onClick={() => setFrame(frame + 1)} aria-label="Следующий кадр">▶</button><button onClick={() => setFrame(frames.length - 1)} aria-label="Последний кадр">▶|</button></div><output>{current.label}</output><label className="speed">СКОРОСТЬ <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select></label></div><input className="frameRange" type="range" min="0" max={frames.length - 1} value={frame} onChange={(event) => setFrame(Number(event.target.value))} aria-label="Выбрать временной кадр" /><div className="frameLabels"><span>{frames[0].label}</span><span>КАДР {frame + 1} / {frames.length}</span><span>{frames.at(-1)?.label}</span></div></Panel>;
}
