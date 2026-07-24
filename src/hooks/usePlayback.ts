"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function usePlayback(total: number) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!playing || total < 2) return;
    timer.current = window.setInterval(() => setFrame((value) => value >= total - 1 ? 0 : value + 1), 1100 / speed);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [playing, speed, total]);
  useEffect(() => { setFrame((value) => Math.max(0, Math.min(Math.max(0, total - 1), value))); }, [total]);
  const setClampedFrame = useCallback((value: number) => setFrame(Math.max(0, Math.min(Math.max(0, total - 1), value))), [total]);
  return { frame, setFrame: setClampedFrame, playing, setPlaying, speed, setSpeed };
}
