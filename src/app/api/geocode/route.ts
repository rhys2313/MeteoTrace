import { NextRequest, NextResponse } from "next/server";

type OpenMeteoResult = { name: string; latitude: number; longitude: number; country?: string };
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) return NextResponse.json({ error: "Введите не менее двух символов." }, { status: 400 });
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ru&format=json`, { signal: controller.signal, next: { revalidate: 3600 } });
    const payload = await response.json() as { results?: OpenMeteoResult[] };
    const result = payload.results?.[0];
    if (!response.ok || !result) return NextResponse.json({ error: "Ничего не найдено." }, { status: 404 });
    return NextResponse.json({ name: result.name, country: result.country, lat: result.latitude, lon: result.longitude });
  } catch { return NextResponse.json({ error: "Сервис геокодирования временно недоступен." }, { status: 503 }); }
  finally { clearTimeout(timeout); }
}
