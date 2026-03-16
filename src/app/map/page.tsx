"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Header from "../components/Header";
import PointsAnimation from "../components/PointsAnimation";
import { addPost, getPosts, getWeeklyRanking, cleanupOldPosts } from "../storage";
import { OverpassStore, ShopType } from "../types";
import {
  fetchNearbyShops,
  SHOP_TYPE_LABELS,
  SHOP_TYPE_COLORS,
} from "../overpass";

const StoreMap = dynamic(() => import("../components/StoreMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] rounded-2xl bg-border/30 flex items-center justify-center">
      <p className="text-muted text-sm">地図を読み込み中…</p>
    </div>
  ),
});

export default function MapPage() {
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Overpass
  const [overpassStores, setOverpassStores] = useState<OverpassStore[]>([]);
  const [shopLoading, setShopLoading] = useState(false);
  const [shopError, setShopError] = useState<string | null>(null);

  // フィルター
  const [filter, setFilter] = useState<ShopType | "all">("all");

  // 投稿フォーム
  const [targetStore, setTargetStore] = useState<OverpassStore | null>(null);
  const [productName, setProductName] = useState("");
  const [postPrice, setPostPrice] = useState("");
  const [showPointsAnim, setShowPointsAnim] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);

  // 14日以上古い投稿を自動クリーンアップ
  useEffect(() => {
    const removed = cleanupOldPosts(14);
    if (removed > 0) {
      console.log(`[cleanup] ${removed}件の古い投稿を削除しました`);
      setRefreshKey((k) => k + 1);
    }
  }, []);

  // 位置情報取得
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("お使いのブラウザでは位置情報を取得できません");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError(
              "位置情報の許可が必要です。ブラウザの設定を確認してください"
            );
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError("位置情報を取得できませんでした");
            break;
          default:
            setGeoError("位置情報の取得がタイムアウトしました");
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Overpass API で店舗取得
  useEffect(() => {
    if (userLat === null || userLng === null) return;
    let cancelled = false;
    setShopLoading(true);
    setShopError(null);

    fetchNearbyShops(userLat, userLng, 5000)
      .then((stores) => {
        if (cancelled) return;
        setOverpassStores(stores);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Overpass fetch failed:", err);
        setShopError(
          "店舗データの取得に失敗しました。時間を置いて再試行してください"
        );
      })
      .finally(() => {
        if (!cancelled) setShopLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userLat, userLng]);

  // 投稿データを店舗に紐づけ
  const storesWithPosts = useMemo(() => {
    void refreshKey;
    const posts = getPosts().filter(
      (p) => p.lat !== undefined && p.lng !== undefined
    );

    return overpassStores.map((store) => {
      const matched = posts.filter((p) => {
        if (p.storeName === store.name) return true;
        const dLat = (p.lat! - store.lat) * 111320;
        const dLng =
          (p.lng! - store.lng) *
          111320 *
          Math.cos((store.lat * Math.PI) / 180);
        return Math.sqrt(dLat * dLat + dLng * dLng) < 50;
      });
      return { ...store, posts: matched };
    });
  }, [overpassStores, refreshKey]);

  // フィルタ適用
  const filteredStores = useMemo(
    () =>
      filter === "all"
        ? storesWithPosts
        : storesWithPosts.filter((s) => s.shopType === filter),
    [storesWithPosts, filter]
  );

  // 店舗種別ごとの数
  const countByType = useMemo(() => {
    const counts = { supermarket: 0, chemist: 0, convenience: 0 };
    for (const s of overpassStores) counts[s.shopType]++;
    return counts;
  }, [overpassStores]);

  // ランキング
  const ranking = useMemo(() => {
    void refreshKey;
    return getWeeklyRanking();
  }, [refreshKey]);

  // マーカーの「価格を投稿する」クリック
  const handlePostClick = useCallback((store: OverpassStore) => {
    setTargetStore(store);
    setProductName("");
    setPostPrice("");
    setTimeout(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }, []);

  // 投稿実行
  const handleSubmitPost = useCallback(() => {
    if (!targetStore || !productName.trim() || !postPrice) return;
    addPost({
      productName: productName.trim(),
      storeName: targetStore.name,
      price: Number(postPrice),
      location: "",
      lat: targetStore.lat,
      lng: targetStore.lng,
    });
    setPostPrice("");
    setProductName("");
    setShowPointsAnim(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setShowPointsAnim(false), 2500);
  }, [targetStore, productName, postPrice]);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "たった今";
    if (mins < 60) return `${mins}分前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}時間前`;
    return `${Math.floor(hrs / 24)}日前`;
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <PointsAnimation points={10} show={showPointsAnim} />

      <main className="max-w-lg mx-auto px-4 mt-6 space-y-5">
        {/* ステータス */}
        {loading && (
          <div className="bg-card-bg rounded-2xl border border-border p-8 text-center">
            <p className="text-3xl mb-3">📡</p>
            <p className="text-sm text-muted">現在地を取得中…</p>
          </div>
        )}

        {geoError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
            <p className="text-sm text-red-400">{geoError}</p>
          </div>
        )}

        {userLat !== null && userLng !== null && (
          <>
            {/* 地図 */}
            <div className="bg-card-bg rounded-2xl shadow-sm border border-border p-3">
              <h2 className="font-bold text-base mb-2">
                🗺️ 近くのお店（5km圏内）
              </h2>

              {shopLoading && (
                <div className="w-full h-[380px] rounded-2xl bg-border/20 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted">周辺の店舗を検索中…</p>
                </div>
              )}

              {shopError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2">
                  <p className="text-xs text-red-400">{shopError}</p>
                </div>
              )}

              {!shopLoading && !shopError && (
                <StoreMap
                  userLat={userLat}
                  userLng={userLng}
                  stores={filteredStores}
                  onPostClick={handlePostClick}
                />
              )}

              {/* 凡例 */}
              {!shopLoading && (
                <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                  {(
                    ["supermarket", "chemist", "convenience"] as ShopType[]
                  ).map((type) => (
                    <span key={type} className="flex items-center gap-1">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: SHOP_TYPE_COLORS[type] }}
                      />
                      {SHOP_TYPE_LABELS[type]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* フィルターボタン */}
            {!shopLoading && overpassStores.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setFilter("all")}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
                    ${filter === "all" ? "bg-primary text-white" : "bg-card-bg text-muted border border-border"}`}
                >
                  すべて ({overpassStores.length})
                </button>
                {(
                  ["supermarket", "chemist", "convenience"] as ShopType[]
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors
                      ${filter === type ? "text-white" : "bg-card-bg text-muted border border-border"}`}
                    style={
                      filter === type
                        ? { backgroundColor: SHOP_TYPE_COLORS[type] }
                        : undefined
                    }
                  >
                    {SHOP_TYPE_LABELS[type]} ({countByType[type]})
                  </button>
                ))}
              </div>
            )}

            {/* 投稿フォーム（店舗選択時） */}
            {targetStore && (
              <section
                ref={formRef}
                className="bg-card-bg rounded-2xl shadow-sm border-2 border-primary p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-base">
                      🏷️ {targetStore.name}
                    </h3>
                    <p
                      className="text-xs font-medium mt-0.5"
                      style={{
                        color: SHOP_TYPE_COLORS[targetStore.shopType],
                      }}
                    >
                      {SHOP_TYPE_LABELS[targetStore.shopType]}
                    </p>
                  </div>
                  <button
                    onClick={() => setTargetStore(null)}
                    className="text-muted text-lg hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="商品名（例：牛乳）"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="number"
                    value={postPrice}
                    onChange={(e) => setPostPrice(e.target.value)}
                    placeholder="価格（例：198）"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleSubmitPost}
                    disabled={!productName.trim() || !postPrice}
                    className="w-full bg-primary text-white py-2.5 rounded-lg font-medium
                               hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed
                               active:scale-95 transition-all"
                  >
                    この価格を投稿する
                  </button>
                </div>
              </section>
            )}

            {/* 今週の投稿ランキング */}
            {ranking.length > 0 && (
              <section className="bg-card-bg rounded-2xl shadow-sm border border-border p-4">
                <h2 className="font-bold text-base mb-3">
                  🏅 今週の投稿ランキング
                </h2>
                <ul className="space-y-2">
                  {ranking.map((entry, i) => (
                    <li
                      key={entry.nickname}
                      className="flex items-center gap-3 bg-background rounded-xl p-3"
                    >
                      <span
                        className={`text-lg font-bold shrink-0 w-7 text-center ${
                          i === 0
                            ? "text-yellow-500"
                            : i === 1
                              ? "text-gray-400"
                              : i === 2
                                ? "text-amber-500"
                                : "text-muted"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium truncate">
                        {entry.nickname}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        {entry.weeklyPosts}件
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 店舗リスト */}
            {!shopLoading && filteredStores.length > 0 && (
              <section className="bg-card-bg rounded-2xl shadow-sm border border-border p-4">
                <h2 className="font-bold text-base mb-3">📋 店舗一覧</h2>
                <ul className="space-y-2">
                  {filteredStores.map((store) => (
                    <li
                      key={`${store.id}-${store.lat}`}
                      onClick={() => handlePostClick(store)}
                      className="bg-background rounded-xl p-3 cursor-pointer hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {store.name}
                          </p>
                          <p
                            className="text-xs font-medium mt-0.5"
                            style={{
                              color: SHOP_TYPE_COLORS[store.shopType],
                            }}
                          >
                            {SHOP_TYPE_LABELS[store.shopType]}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          {store.posts.length > 0 ? (
                            <>
                              <p className="text-base font-bold text-primary">
                                ¥
                                {Math.min(
                                  ...store.posts.map((p) => p.price)
                                ).toLocaleString()}
                                ~
                              </p>
                              <p className="text-xs text-muted">
                                {store.posts.length}件 ·{" "}
                                {timeAgo(
                                  store.posts.reduce((latest, p) =>
                                    p.postedAt > latest.postedAt ? p : latest
                                  ).postedAt
                                )}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-muted">投稿なし</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {/* 位置情報なし */}
        {!loading && geoError && (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">📍</p>
            <p className="text-sm text-muted">
              位置情報を許可すると
              <br />
              近くのお店の価格が見られます
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
