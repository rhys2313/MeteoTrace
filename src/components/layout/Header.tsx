"use client";
import { useEffect, useState } from "react";
const links = ["КАРТА", "РАЗВИТИЕ", "СРАВНЕНИЕ", "ГРАФ", "КЕЙСЫ", "ИСТОЧНИКИ"];
export function Header() {
  const [open, setOpen] = useState(false); const [utc, setUtc] = useState("--:--:--");
  useEffect(() => { const update = () => setUtc(new Date().toISOString().slice(11, 19)); update(); const timer = window.setInterval(update, 1000); return () => window.clearInterval(timer); }, []);
  const anchor = (link: string) => link === "КАРТА" ? "workspace" : link === "СРАВНЕНИЕ" ? "comparison" : link === "ГРАФ" ? "trace" : link === "КЕЙСЫ" ? "cases" : link === "ИСТОЧНИКИ" ? "sources" : "timeline";
  return <header className="header"><a className="brand" href="#top">METEO<span>TRACE</span></a><nav className={open ? "nav navOpen" : "nav"} aria-label="Основная навигация">{links.map((link) => <a key={link} href={`#${anchor(link)}`} onClick={() => setOpen(false)}>{link}</a>)}</nav><div className="headerStatus"><span className="statusDot" /> ПРОВЕРКА ИСТОЧНИКОВ · <time>{utc} UTC</time></div><button className="menuButton" onClick={() => setOpen(!open)} aria-label="Открыть меню" aria-expanded={open}>{open ? "×" : "☰"}</button></header>;
}
