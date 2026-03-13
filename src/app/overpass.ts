import { OverpassStore, ShopType } from "./types";

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const SHOP_TYPES: ShopType[] = ["supermarket", "chemist", "convenience"];

export async function fetchNearbyShops(
  lat: number,
  lng: number,
  radiusM: number = 5000
): Promise<OverpassStore[]> {
  // Overpass QL: スーパー・ドラッグストア・コンビニを一括取得
  const shopFilter = SHOP_TYPES.map(
    (t) => `node["shop"="${t}"](around:${radiusM},${lat},${lng});`
  ).join("\n");
  const wayFilter = SHOP_TYPES.map(
    (t) => `way["shop"="${t}"](around:${radiusM},${lat},${lng});`
  ).join("\n");

  const query = `
[out:json][timeout:15];
(
${shopFilter}
${wayFilter}
);
out center;
`.trim();

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!res.ok) {
    throw new Error(`Overpass API error: ${res.status}`);
  }

  const json = await res.json();
  const elements: OverpassElement[] = json.elements ?? [];

  const stores: OverpassStore[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const elLat = el.lat ?? el.center?.lat;
    const elLon = el.lon ?? el.center?.lon;
    if (!elLat || !elLon) continue;

    const name = el.tags?.name ?? el.tags?.["name:ja"] ?? "名称不明";
    const shopTag = el.tags?.shop as ShopType | undefined;
    if (!shopTag || !SHOP_TYPES.includes(shopTag)) continue;

    // 同名＋近接（50m以内）の重複を排除
    const dedupeKey = `${name}_${elLat.toFixed(3)}_${elLon.toFixed(3)}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    stores.push({
      id: el.id,
      name,
      lat: elLat,
      lng: elLon,
      shopType: shopTag,
      posts: [],
    });
  }

  return stores;
}

export const SHOP_TYPE_LABELS: Record<ShopType, string> = {
  supermarket: "スーパー",
  chemist: "ドラッグストア",
  convenience: "コンビニ",
};

export const SHOP_TYPE_COLORS: Record<ShopType, string> = {
  supermarket: "#2563eb",   // 青
  chemist: "#16a34a",       // 緑
  convenience: "#ea580c",   // オレンジ
};
