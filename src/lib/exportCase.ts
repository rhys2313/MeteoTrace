import { MeteoCase } from "@/types";
import { productById } from "@/config/products";
import { formatCoordinates } from "./coordinates";
import { encodeCaseForUrl, normalizeMeteoCase } from "./caseSchema";

function download(filename: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportJson(meteoCase: MeteoCase) {
  download(`meteotrace-${meteoCase.id}.json`, "application/json", JSON.stringify(normalizeMeteoCase(meteoCase), null, 2));
}

export function exportTxt(meteoCase: MeteoCase) {
  const products = meteoCase.products.map((id) => productById(id).name).join(", ");
  const text = `METEOTRACE — МЕТЕОРОЛОГИЧЕСКИЙ КЕЙС\n\nНазвание: ${meteoCase.title}\nОбласть: ${meteoCase.area.name}\nКоординаты: ${formatCoordinates(meteoCase.area)}\nПериод: ${meteoCase.startTime} — ${meteoCase.endTime}\nИсточник: EUMETSAT (${meteoCase.mode})\nПродукты: ${products}\nКадр A: ${meteoCase.frameA + 1}\nКадр B: ${meteoCase.frameB + 1}\n\nЗАМЕТКА\n${meteoCase.note || "—"}\n\nПРЕДУПРЕЖДЕНИЕ\nМатериал сформирован исследовательским инструментом MeteoTrace и не является официальным прогнозом.`;
  download(`meteotrace-${meteoCase.id}.txt`, "text/plain;charset=utf-8", text);
}

export async function exportPdf(meteoCase: MeteoCase) {
  const { jsPDF } = await import("jspdf"); const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFontSize(16); pdf.text("MeteoTrace — исследовательский кейс", 16, 18); pdf.setFontSize(10);
  const lines = [
    `Название: ${meteoCase.title}`, `Область: ${meteoCase.area.name}`, `Координаты: ${formatCoordinates(meteoCase.area)}`,
    `Период: ${meteoCase.startTime} — ${meteoCase.endTime}`, `Источник: ${meteoCase.source ?? "eumetsat"} (${meteoCase.mode})`,
    `Заметка: ${meteoCase.note || "—"}`, "Ограничение: отчёт не является официальным прогнозом погоды.",
  ]; pdf.text(lines, 16, 32, { maxWidth: 178, lineHeightFactor: 1.6 }); pdf.save(`meteotrace-${meteoCase.id}.pdf`);
}

export function exportPngCard(meteoCase: MeteoCase) {
  const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 630; const ctx = canvas.getContext("2d"); if (!ctx) return;
  ctx.fillStyle = "#080a0b"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = "#8d989d"; ctx.strokeRect(30, 30, 1140, 570); ctx.fillStyle = "#edf0f2"; ctx.font = "bold 42px monospace"; ctx.fillText("METEOTRACE / CASE", 70, 110); ctx.font = "bold 30px monospace"; ctx.fillText(meteoCase.title.slice(0, 54), 70, 178); ctx.font = "22px monospace"; ctx.fillStyle = "#c3cbd0"; [meteoCase.area.name, formatCoordinates(meteoCase.area), `${meteoCase.startTime} — ${meteoCase.endTime}`, "Research tool · not an official forecast"].forEach((line, index) => ctx.fillText(line, 70, 255 + index * 58));
  // Canvas blobs need a binary object URL; the text download helper is intentionally not used here.
  canvas.toBlob((blob) => { if (!blob) return; const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `meteotrace-${meteoCase.id}.png`; anchor.click(); URL.revokeObjectURL(url); });
}

export async function shareCase(meteoCase: MeteoCase) {
  const url = `${window.location.origin}${window.location.pathname}#case=${encodeCaseForUrl(meteoCase)}`;
  await navigator.clipboard?.writeText(url); return url;
}
