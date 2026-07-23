"use client";
import { useEffect, useRef, useState } from "react";

export function usePlayback(total: number) {
  const [frame, setFrame] = useState(6);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    timer.current = window.setInterval(() => setFrame((value) => value >= total - 1 ? 0 : value + 1), 1100 / speed);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [playing, speed, total]);
  return { frame, setFrame: (value: number) => setFrame(Math.max(0, Math.min(total - 1, value))), playing, setPlaying, speed, setSpeed };
}
