"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { OverpassStore, ShopType, PricePost } from "../types";
import { SHOP_TYPE_LABELS, SHOP_TYPE_COLORS } from "../overpass";

// SVG マーカー生成（色指定可能）
function createColoredIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z"
            fill="${color}" stroke="#fff" stroke-width="2"/>
      <circle cx="14" cy="14" r="6" fill="#fff"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [28, 40],
    iconAnchor: [14, 40],
    popupAnchor: [0, -36],
  });
}

const icons: Record<ShopType, L.DivIcon> = {
  supermarket: createColoredIcon(SHOP_TYPE_COLORS.supermarket),
  chemist: createColoredIcon(SHOP_TYPE_COLORS.chemist),
  convenience: createColoredIcon(SHOP_TYPE_COLORS.convenience),
};

const userIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="8" fill="#e8725a" stroke="#fff" stroke-width="3"/>
    </svg>`,
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function FlyToUser({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 14);
  }, [map, lat, lng]);
  return null;
}

// ===== ヘルパー =====

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "たった今";
  if (mins < 60) return `${mins}分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}時間前`;
  return `${Math.floor(hrs / 24)}日前`;
}

function avgPrice(posts: PricePost[]): number | null {
  if (posts.length === 0) return null;
  return posts.reduce((s, p) => s + p.price, 0) / posts.length;
}

interface TrendResult {
  diff: number;
  arrow: string;
  color: string;
  label: string;
}

function calcTrend(
  posts: PricePost[],
  recentDays: number,
  compareDays: number,
  label: string
): TrendResult | null {
  const now = Date.now();
  const recentCutoff = now - recentDays * 86400000;
  const compareCutoffStart = now - compareDays * 86400000;

  const recentPosts = posts.filter(
    (p) => new Date(p.postedAt).getTime() > recentCutoff
  );
  const comparePosts = posts.filter((p) => {
    const t = new Date(p.postedAt).getTime();
    return t > compareCutoffStart && t <= recentCutoff;
  });

  const recentAvg = avgPrice(recentPosts);
  const compareAvg = avgPrice(comparePosts);
  if (recentAvg === null || compareAvg === null) return null;

  const diff = Math.round(recentAvg - compareAvg);
  if (diff > 0) return { diff, arrow: "\u2191", color: "#ef4444", label };
  if (diff < 0) return { diff: Math.abs(diff), arrow: "\u2193", color: "#22c55e", label };
  return { diff: 0, arrow: "\u2192", color: "#888", label };
}

/** 14日分の日別平均価格スパークライン */
function Sparkline({ posts }: { posts: PricePost[] }) {
  const now = Date.now();
  const dayMs = 86400000;
  // 過去14日の日別平均
  const dailyAvgs: (number | null)[] = [];
  for (let d = 13; d >= 0; d--) {
    const dayStart = now - (d + 1) * dayMs;
    const dayEnd = now - d * dayMs;
    const dayPosts = posts.filter((p) => {
      const t = new Date(p.postedAt).getTime();
      return t >= dayStart && t < dayEnd;
    });
    dailyAvgs.push(avgPrice(dayPosts));
  }

  const values = dailyAvgs.filter((v): v is number => v !== null);
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const w = 160;
  const h = 32;
  const pad = 2;

  // データポイント（nullはスキップ）
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < dailyAvgs.length; i++) {
    const v = dailyAvgs[i];
    if (v === null) continue;
    points.push({
      x: pad + (i / 13) * (w - pad * 2),
      y: pad + (1 - (v - min) / range) * (h - pad * 2),
    });
  }

  if (points.length < 2) return null;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const trendUp = lastPoint.y < firstPoint.y;

  return (
    <div style={{ marginTop: 6 }}>
      <p style={{ fontSize: 10, color: "#888", margin: "0 0 2px" }}>
        過去14日間の価格推移
      </p>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        style={{ display: "block" }}
      >
        {/* グリッド線 */}
        <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2}
              stroke="#e0d8cf" strokeWidth={0.5} strokeDasharray="2 2" />
        {/* ライン */}
        <path
          d={pathD}
          fill="none"
          stroke={trendUp ? "#22c55e" : "#ef4444"}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 最終ポイント */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={2.5}
          fill={trendUp ? "#22c55e" : "#ef4444"}
        />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#aaa" }}>
        <span>14日前</span>
        <span>今日</span>
      </div>
    </div>
  );
}

// ===== メインコンポーネント =====

interface StoreMapProps {
  userLat: number;
  userLng: number;
  stores: OverpassStore[];
  onPostClick: (store: OverpassStore) => void;
}

export default function StoreMap({
  userLat,
  userLng,
  stores,
  onPostClick,
}: StoreMapProps) {
  return (
    <MapContainer
      center={[userLat, userLng]}
      zoom={14}
      className="w-full rounded-2xl z-0"
      style={{ height: "380px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToUser lat={userLat} lng={userLng} />

      {/* 5km圏 */}
      <Circle
        center={[userLat, userLng]}
        radius={5000}
        pathOptions={{
          color: "#e8725a",
          fillColor: "#e8725a",
          fillOpacity: 0.06,
          weight: 1.5,
          dashArray: "6 4",
        }}
      />

      {/* 現在地 */}
      <Marker position={[userLat, userLng]} icon={userIcon}>
        <Popup>
          <span style={{ fontWeight: 600 }}>📍 現在地</span>
        </Popup>
      </Marker>

      {/* 店舗マーカー */}
      {stores.map((store) => {
        const yesterdayTrend = calcTrend(store.posts, 1, 2, "昨日より");
        const weekTrend = calcTrend(store.posts, 1, 7, "先週より");

        return (
          <Marker
            key={`${store.id}-${store.lat}`}
            position={[store.lat, store.lng]}
            icon={icons[store.shopType]}
          >
            <Popup>
              <div style={{ minWidth: 180, maxWidth: 220 }}>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    margin: "0 0 2px",
                  }}
                >
                  {store.name}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: SHOP_TYPE_COLORS[store.shopType],
                    margin: "0 0 6px",
                    fontWeight: 600,
                  }}
                >
                  {SHOP_TYPE_LABELS[store.shopType]}
                </p>

                {store.posts.length > 0 && (
                  <>
                    {/* 投稿一覧（最新3件） */}
                    <div style={{ margin: "0 0 6px" }}>
                      {store.posts
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.postedAt).getTime() -
                            new Date(a.postedAt).getTime()
                        )
                        .slice(0, 3)
                        .map((post) => (
                          <div
                            key={post.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "3px 0",
                              borderBottom: "1px solid #f0ebe4",
                              fontSize: 11,
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ fontWeight: 500 }}>
                                {post.productName}
                              </span>
                              <span
                                style={{
                                  color: "#aaa",
                                  marginLeft: 4,
                                  fontSize: 10,
                                }}
                              >
                                {timeAgo(post.postedAt)}
                              </span>
                            </div>
                            <span
                              style={{
                                fontWeight: 700,
                                color: "#e8725a",
                                marginLeft: 6,
                                whiteSpace: "nowrap",
                              }}
                            >
                              ¥{post.price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      {store.posts.length > 3 && (
                        <p
                          style={{
                            fontSize: 10,
                            color: "#aaa",
                            textAlign: "center",
                            margin: "3px 0 0",
                          }}
                        >
                          他{store.posts.length - 3}件
                        </p>
                      )}
                    </div>

                    {/* 価格トレンド */}
                    {(yesterdayTrend || weekTrend) && (
                      <div
                        style={{
                          background: "#faf7f2",
                          borderRadius: 8,
                          padding: "5px 8px",
                          margin: "0 0 6px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: 10,
                            color: "#888",
                            margin: "0 0 3px",
                            fontWeight: 600,
                          }}
                        >
                          価格トレンド
                        </p>
                        {yesterdayTrend && (
                          <p style={{ fontSize: 11, margin: "0 0 1px" }}>
                            <span
                              style={{
                                color: yesterdayTrend.color,
                                fontWeight: 700,
                              }}
                            >
                              {yesterdayTrend.arrow}
                            </span>{" "}
                            {yesterdayTrend.label}
                            <span
                              style={{
                                fontWeight: 700,
                                color: yesterdayTrend.color,
                              }}
                            >
                              {yesterdayTrend.diff > 0
                                ? ` ¥${yesterdayTrend.diff}${yesterdayTrend.arrow === "\u2191" ? "高い" : "安い"}`
                                : " 変化なし"}
                            </span>
                          </p>
                        )}
                        {weekTrend && (
                          <p style={{ fontSize: 11, margin: 0 }}>
                            <span
                              style={{
                                color: weekTrend.color,
                                fontWeight: 700,
                              }}
                            >
                              {weekTrend.arrow}
                            </span>{" "}
                            {weekTrend.label}
                            <span
                              style={{
                                fontWeight: 700,
                                color: weekTrend.color,
                              }}
                            >
                              {weekTrend.diff > 0
                                ? ` ¥${weekTrend.diff}${weekTrend.arrow === "\u2191" ? "高い" : "安い"}`
                                : " 変化なし"}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* スパークライン */}
                    <Sparkline posts={store.posts} />
                  </>
                )}

                {store.posts.length === 0 && (
                  <p style={{ fontSize: 11, color: "#888", margin: "0 0 6px" }}>
                    まだ投稿がありません
                  </p>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPostClick(store);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "6px 0",
                    marginTop: 6,
                    background: "#e8725a",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🏷️ 価格を投稿する
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
