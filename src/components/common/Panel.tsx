import { ReactNode } from "react";
export function Panel({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title && <p className="panelLabel">{title}</p>}{children}</section>;
}
