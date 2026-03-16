"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { PricePost, AmazonProduct } from "./types";
import {
  searchPosts,
  addPost,
  getRecentPosts,
  getTodaySavings,
  getMonthSavings,
  getProfile,
  getBadge,
  isOnboarded,
  isFavorited,
  addFavorite,
  isAdFreeActive,
  getValidPoints,
} from "./storage";
import { searchAmazon } from "./mockAmazon";
import { fetchSharedPosts, fetchRecentSharedPosts, insertSharedPost } from "./lib/supabaseSync";
import { useAuth } from "./contexts/AuthContext";
import PointsAnimation from "./components/PointsAnimation";
import Onboarding from "./components/Onboarding";
import Toast from "./components/Toast";
import UserBadge from "./components/UserBadge";
import PushNotificationBanner from "./components/PushNotificationBanner";
import SoundToggle from "./components/SoundToggle";
import BarcodeScanner from "./components/BarcodeScanner";
import WelcomeScreen from "./components/WelcomeScreen";
import CloudSyncBanner from "./components/CloudSyncBanner";
import { useSound } from "./hooks/useSound";
import { useScrollFadeIn } from "./hooks/useScrollFadeIn";
import { useConfetti } from "./hooks/useConfetti";
import { useCountUp } from "./hooks/useCountUp";
import Link from "next/link";
import { Camera, ScanBarcode, MapPin, Heart, Package, ShoppingBag, Tag, Megaphone, Crown, Zap, ExternalLink } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<PricePost[]>([]);
  const [amazonResults, setAmazonResults] = useState<AmazonProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  const [storeName, setStoreName] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [showPointsAnim, setShowPointsAnim] = useState(false);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [recognizing, setRecognizing] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [adFree, setAdFree] = useState(false);
  const [showBarcode, setShowBarcode] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isPremium, setIsPremium] = useState(false);
  const { play } = useSound();
  const { fire: fireConfetti } = useConfetti();
  const [heartBurstId, setHeartBurstId] = useState<string | null>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);

  // Scroll fade-in refs
  const feedSection = useScrollFadeIn();
  const adSection = useScrollFadeIn();
  const badgeSection = useScrollFadeIn();

  useEffect(() => {
    setAdFree(isAdFreeActive());
  }, [refreshKey]);

  // プレミアム状態チェック
  useEffect(() => {
    if (!user) { setIsPremium(false); return; }
    (async () => {
      const { supabase } = await import("./lib/supabase");
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, premium_expires_at")
        .eq("id", user.id)
        .single();
      if (data?.is_premium && data.premium_expires_at &&
          new Date(data.premium_expires_at).getTime() > Date.now()) {
        setIsPremium(true);
        setAdFree(true);
      }
    })().catch(() => {});
  }, [user, refreshKey]);

  // 初回訪問・オンボーディングチェック
  useEffect(() => {
    if (!isOnboarded()) {
      if (user) {
        // ログイン済みならウェルカムをスキップしてオンボーディングへ
        setShowWelcome(false);
        setShowOnboarding(true);
      } else if (!loading) {
        // 未ログイン確定ならウェルカム表示
        setShowWelcome(true);
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
        },
        () => {}
      );
    }
  }, []);

  const profile = useMemo(() => {
    void refreshKey;
    return getProfile();
  }, [refreshKey]);
  const heroPoints = useMemo(() => {
    void refreshKey;
    return getValidPoints();
  }, [refreshKey]);
  const badge = useMemo(() => getBadge(heroPoints), [heroPoints]);
  const todaySavings = useMemo(() => {
    void refreshKey;
    return getTodaySavings();
  }, [refreshKey]);
  const monthSavings = useMemo(() => {
    void refreshKey;
    return getMonthSavings();
  }, [refreshKey]);

  // Count-up animations for savings
  const animatedTodaySavings = useCountUp(todaySavings, 800);
  const animatedMonthSavings = useCountUp(monthSavings, 1000);

  const [recentPosts, setRecentPosts] = useState<PricePost[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const shared = await fetchRecentSharedPosts(8);
        if (!cancelled) setRecentPosts(shared.length > 0 ? shared : getRecentPosts(8));
      } catch {
        if (!cancelled) setRecentPosts(getRecentPosts(8));
      }
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  /** Supabaseで検索し、フォールバックとしてlocalStorageも使う */
  const doSearch = useCallback(async (term: string) => {
    setSearching(true);
    setAmazonResults(searchAmazon(term));
    try {
      const shared = await fetchSharedPosts(term);
      // Supabase結果があればそちらを優先、なければlocalStorage
      setPosts(shared.length > 0 ? shared : searchPosts(term));
    } catch {
      setPosts(searchPosts(term));
    } finally {
      setSearching(false);
    }
    setHasSearched(true);
  }, []);

  // URL の ?q= パラメータで自動検索（買い物リストからの遷移）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) {
      setQuery(q);
      doSearch(q);
      // URLからパラメータを削除
      window.history.replaceState({}, "", "/");
    }
  }, [doSearch]);

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    play("search");
    doSearch(query.trim());
  }, [query, play, doSearch]);

  const handlePost = useCallback(async () => {
    if (!query.trim() || !storeName.trim() || !price) return;
    play("post");
    const postData = {
      productName: query.trim(),
      storeName: storeName.trim(),
      price: Number(price),
      location: location.trim(),
      lat: userLat,
      lng: userLng,
    };
    // localStorageに保存（オフラインフォールバック＋ポイント加算）
    addPost(postData);
    // Supabaseに保存（共有用）
    insertSharedPost(user?.id ?? null, postData).catch(() => {});
    // 検索結果を更新
    doSearch(query.trim());
    setStoreName("");
    setPrice("");
    setLocation("");
    setShowPointsAnim(true);
    setRefreshKey((k) => k + 1);
    fireConfetti();
    setTimeout(() => {
      play("coin");
      setShowPointsAnim(false);
    }, 2500);
  }, [query, storeName, price, location, userLat, userLng, play, user, doSearch, fireConfetti]);

  const handleFavorite = useCallback((productName: string) => {
    play("favorite");
    addFavorite(productName);
    setHeartBurstId(productName);
    setTimeout(() => setHeartBurstId(null), 600);
    setRefreshKey((k) => k + 1);
  }, [play]);

  /** 認識結果から検索を実行し、結果にスクロールする */
  const executeSearchAndScroll = useCallback(
    (productName: string, recognizedPrice?: number) => {
      setQuery(productName);
      doSearch(productName);
      if (recognizedPrice) setPrice(String(recognizedPrice));
      // 次のレンダリング後にスクロール
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    },
    [doSearch]
  );

  const handleBarcodeDetected = useCallback(
    (code: string, productName: string | null) => {
      setShowBarcode(false);
      if (productName) {
        play("receipt");
        setToastMsg(`📦 ${productName}（JAN: ${code}）`);
        setShowToast(true);
        executeSearchAndScroll(productName);
      } else {
        play("search");
        setToastMsg(`バーコード: ${code}（商品名が見つかりませんでした）`);
        setShowToast(true);
        setQuery(code);
      }
    },
    [play, executeSearchAndScroll]
  );

  /** レシートの商品一覧から最大の節約効果がある商品を選ぶ */
  const pickBestSavingsItem = useCallback(
    (items: { name: string; price: number }[]): { name: string; price: number } | null => {
      if (items.length === 0) return null;
      if (items.length === 1) return items[0];

      let bestItem = items[0];
      let bestSavings = 0;

      for (const item of items) {
        const existingPosts = searchPosts(item.name);
        const amazonItems = searchAmazon(item.name);
        const allPricesForItem = [
          ...existingPosts.map((p) => p.price),
          ...amazonItems.map((a) => a.price),
          item.price,
        ];
        if (allPricesForItem.length >= 2) {
          const itemSavings = Math.max(...allPricesForItem) - Math.min(...allPricesForItem);
          if (itemSavings > bestSavings) {
            bestSavings = itemSavings;
            bestItem = item;
          }
        }
      }
      return bestItem;
    },
    []
  );

  const handleCameraCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setRecognizing(true);
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/recognize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();

        if (!res.ok) {
          play("error");
          setToastMsg(data.error || "認識に失敗しました");
          setShowToast(true);
          return;
        }

        if (data.type === "receipt" && data.items?.length > 0) {
          // レシート: 最大節約効果の商品を選択
          play("receipt");
          const best = pickBestSavingsItem(data.items);
          if (best) {
            const storeLabel = data.storeName ? `（${data.storeName}）` : "";
            setToastMsg(
              data.items.length > 1
                ? `📸 レシートから${data.items.length}商品を認識${storeLabel} → 「${best.name}」を比較中`
                : `📸 「${best.name}」¥${best.price.toLocaleString()} を認識しました${storeLabel}`
            );
            setShowToast(true);
            executeSearchAndScroll(best.name, best.price);
          } else {
            play("error");
            setToastMsg("レシートの商品を読み取れませんでした");
            setShowToast(true);
          }
        } else if (data.productName) {
          // 商品写真
          play("search");
          const priceLabel = data.price ? ` ¥${Number(data.price).toLocaleString()}` : "";
          setToastMsg(`📸 「${data.productName}」${priceLabel} を認識しました`);
          setShowToast(true);
          executeSearchAndScroll(data.productName, data.price ?? undefined);
        } else {
          play("error");
          setToastMsg("商品を認識できませんでした。もう一度お試しください");
          setShowToast(true);
        }
      } catch {
        play("error");
        setToastMsg("認識に失敗しました。もう一度お試しください");
        setShowToast(true);
      } finally {
        setRecognizing(false);
        if (cameraRef.current) cameraRef.current.value = "";
      }
    },
    [executeSearchAndScroll, pickBestSavingsItem, play]
  );

  const allPrices = [
    ...posts.map((p) => p.price),
    ...amazonResults.map((a) => a.price),
  ];
  const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
  const savings = maxPrice - minPrice;

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "たった今";
    if (mins < 60) return `${mins}分前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}時間前`;
    return `${Math.floor(hrs / 24)}日前`;
  };

  // Ripple effect on search button
  const handleRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - btn.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - btn.getBoundingClientRect().top - radius}px`;
    circle.classList.add("ripple-effect");
    btn.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  }, []);

  if (showWelcome) {
    return (
      <WelcomeScreen
        onGuest={() => { setShowWelcome(false); setShowOnboarding(true); }}
        onLoggedIn={() => { setShowWelcome(false); setShowOnboarding(true); }}
      />
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => { setShowOnboarding(false); setRefreshKey((k) => k + 1); }} />;
  }

  return (
    <div className="min-h-screen pb-20">
      <PointsAnimation points={10} show={showPointsAnim} />
      <Toast message={toastMsg} show={showToast} type="success" onClose={() => setShowToast(false)} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCameraCapture}
      />

      {/* ===== ヒーローセクション ===== */}
      <div className="hero-gradient text-foreground px-4 pt-8 pb-10 shadow-lg animate-hero-in">
        <div className="max-w-lg mx-auto">
          {/* ユーザー情報 */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/mypage" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <span className="text-2xl">{badge.emoji}</span>
              <div>
                <p className="font-bold text-sm">
                  {profile.nickname || "ゲスト"}
                </p>
                <p className="text-xs text-foreground/70">{badge.label}</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <SoundToggle />
              <div className="bg-white/80 backdrop-blur border border-border rounded-xl px-3 py-1.5">
                <p className="text-sm font-bold">
                  {heroPoints}<span className="text-xs font-normal ml-0.5">pt</span>
                </p>
              </div>
            </div>
          </div>

          {/* キャッチコピー */}
          <h1 className="text-2xl font-bold mb-1">今日いくら節約できる？</h1>
          <p className="text-sm text-foreground/70 mb-6">
            みんなの投稿で、いちばんおトクを見つけよう
          </p>

          {/* 節約カード */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/80 backdrop-blur-md border border-border rounded-2xl p-4 text-center
                            animate-card-stagger" style={{ animationDelay: "0.2s" }}>
              <p className="text-xs text-foreground/70 mb-1">今日の節約額</p>
              <p className="text-2xl font-bold font-display">
                ¥{animatedTodaySavings.toLocaleString()}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-md border border-border rounded-2xl p-4 text-center
                            animate-card-stagger" style={{ animationDelay: "0.35s" }}>
              <p className="text-xs text-foreground/70 mb-1">今月の累計節約</p>
              <p className="text-2xl font-bold font-display">
                ¥{animatedMonthSavings.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 -mt-4 space-y-5">
        {/* ===== 検索フォーム ===== */}
        <div className="bg-card-bg rounded-2xl shadow-md p-4 border border-border/50
                        animate-float-up" style={{ animationDelay: "0.4s" }}>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="商品名で価格をさがす..."
              className="min-w-0 flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background
                         focus:outline-none focus:ring-2 focus:ring-primary/40
                         placeholder:text-muted/50"
            />
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={recognizing}
              className="shrink-0 w-10 h-10 flex items-center justify-center border border-border
                         bg-background rounded-xl hover:border-primary hover:text-primary
                         transition-colors disabled:opacity-40"
              title="写真で商品を認識"
            >
              {recognizing ? (
                <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent
                                 rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setShowBarcode(true)}
              className="shrink-0 w-10 h-10 flex items-center justify-center border border-border
                         bg-background rounded-xl hover:border-primary hover:text-primary
                         transition-colors"
              title="バーコードスキャン"
            >
              <ScanBarcode className="w-4 h-4" />
            </button>
            <button
              ref={searchBtnRef}
              onClick={(e) => { handleRipple(e); handleSearch(); }}
              disabled={searching}
              className="ripple-btn shrink-0 bg-primary text-white px-4 py-2.5 rounded-xl
                         text-sm font-medium hover:bg-primary-hover active:scale-95
                         transition-all shadow-sm disabled:opacity-60"
            >
              {searching ? "..." : "さがす"}
            </button>
          </div>
        </div>

        {hasSearched ? (
          <div ref={resultsRef} className="space-y-5">
            {/* 節約額 */}
            {allPrices.length >= 2 && (
              <div className="bg-rose-50 border border-rose-100
                              rounded-2xl p-5 text-center shadow-sm">
                <p className="text-sm text-accent font-medium mb-1">
                  最大おトク額
                </p>
                <p className="text-4xl font-bold font-display text-accent">
                  ¥{savings.toLocaleString()}
                </p>
                <p className="text-xs text-muted mt-2">
                  最安 ¥{minPrice.toLocaleString()} 〜 最高 ¥{maxPrice.toLocaleString()}
                </p>
              </div>
            )}

            {/* みんなの投稿 */}
            <section className="bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> みんなの投稿価格</h2>
                <div className="flex items-center gap-2">
                  {!isFavorited(query) && (
                    <button
                      onClick={() => handleFavorite(query.trim())}
                      className={`text-xs text-muted border border-border rounded-lg px-2.5 py-1
                                 hover:border-primary hover:text-primary transition-colors relative
                                 ${heartBurstId === query.trim() ? "animate-heart-burst" : ""}`}
                    >
                      <Heart className="w-3.5 h-3.5 inline-block mr-0.5" /> お気に入り
                      {heartBurstId === query.trim() && (
                        <>
                          {[...Array(6)].map((_, i) => (
                            <Heart
                              key={i}
                              className="heart-particle w-3 h-3 text-primary"
                              style={{
                                "--tx": `${Math.cos((i * 60 * Math.PI) / 180) * 24}px`,
                                "--ty": `${Math.sin((i * 60 * Math.PI) / 180) * 24}px`,
                              } as React.CSSProperties}
                            />
                          ))}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowPostForm(!showPostForm)}
                    className="text-sm text-primary font-medium hover:underline"
                  >
                    {showPostForm ? "とじる" : "+ 投稿"}
                  </button>
                </div>
              </div>

              {isFavorited(query) && (
                <p className="text-xs text-primary mb-2 flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> お気に入り登録済み</p>
              )}

              {showPostForm && (
                <div className="bg-background rounded-xl p-4 mb-4 space-y-3">
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="お店の名前（例：イオン○○店）"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="価格（例：198）"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="場所（例：横浜市青葉区）"
                    className="w-full border border-border rounded-lg px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handlePost}
                    disabled={!storeName.trim() || !price}
                    className="w-full bg-primary text-white py-2.5 rounded-xl font-medium
                               hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed
                               active:scale-95 transition-all"
                  >
                    この価格を投稿する
                  </button>
                </div>
              )}

              {posts.length === 0 ? (
                <p className="text-sm text-muted py-4 text-center">
                  まだ投稿がありません。最初の投稿をしてみよう！
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {posts.map((post) => (
                    <li key={post.id} className="py-3 flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{post.storeName}</p>
                        <p className="text-xs text-muted">
                          {post.location && `${post.location} · `}
                          {new Date(post.postedAt).toLocaleDateString("ja-JP")}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        ¥{post.price.toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Amazon */}
            <section className="bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4">
              <h2 className="font-bold text-base mb-3 flex items-center gap-1.5"><Package className="w-4 h-4 text-primary" /> Amazon 参考価格</h2>
              <p className="text-xs text-muted mb-3">※ モックデータ（後日API連携予定）</p>
              <ul className="divide-y divide-border/60">
                {amazonResults.map((item, i) => (
                  <li key={i} className="py-3 flex items-center gap-2">
                    <a
                      href={`https://www.amazon.co.jp/s?k=${encodeURIComponent(item.title)}&tag=kagotoku-22`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm flex-1 min-w-0 truncate hover:text-primary transition-colors"
                    >
                      {item.title}
                    </a>
                    <p className="text-lg font-bold whitespace-nowrap shrink-0">
                      ¥{item.price.toLocaleString()}
                    </p>
                    <a
                      href={`https://www.amazon.co.jp/s?k=${encodeURIComponent(item.title)}&tag=kagotoku-22`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-primary font-medium flex items-center gap-0.5
                                 hover:underline transition-colors whitespace-nowrap"
                    >
                      Amazonで見る <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <>
            {/* ===== クラウド同期バナー ===== */}
            <CloudSyncBanner />

            {/* ===== プッシュ通知バナー ===== */}
            <PushNotificationBanner />

            {/* ===== バッジカード ===== */}
            <div ref={badgeSection.ref} className={badgeSection.isVisible ? "animate-scroll-in" : "animate-scroll-hidden"}>
              <UserBadge onRedeem={() => setRefreshKey((k) => k + 1)} />
            </div>

            {/* ===== 広告エリア ===== */}
            {!adFree && (
              <div ref={adSection.ref} className={`bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4 text-center
                          ${adSection.isVisible ? "animate-scroll-in" : "animate-scroll-hidden"}`}>
                <p className="text-[10px] text-muted mb-2">広告</p>
                <div className="bg-card-bg border border-border rounded-xl py-6 px-4">
                  <p className="text-sm font-medium text-foreground/60">
                    <Megaphone className="w-4 h-4 inline-block mr-1" /> スポンサー広告エリア
                  </p>
                  <p className="text-xs text-muted mt-1">
                    1000ptで1ヶ月非表示にできます
                  </p>
                </div>
                {!isPremium && (
                  <Link
                    href="/premium"
                    className="inline-block mt-3 text-xs text-primary font-medium
                               hover:underline transition-colors"
                  >
                    <Crown className="w-3.5 h-3.5 inline-block mr-0.5" /> 月額¥300で広告を完全非表示にする →
                  </Link>
                )}
              </div>
            )}

            {/* ===== リアルタイムフィード ===== */}
            <section ref={feedSection.ref} className={`bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4
                        ${feedSection.isVisible ? "animate-scroll-in" : "animate-scroll-hidden"}`}>
              <h2 className="font-bold text-base mb-3 flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" /> 最近の投稿</h2>
              {recentPosts.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="w-10 h-10 text-primary/40 mx-auto mb-3" />
                  <p className="text-sm text-muted">
                    まだ投稿がありません
                    <br />
                    商品を検索して最初の投稿をしよう！
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recentPosts.map((post, i) => (
                    <li
                      key={post.id}
                      className="animate-feed-in flex items-center gap-3 bg-white
                                 rounded-xl p-3 hover:bg-primary/5 transition-colors cursor-pointer"
                      style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}
                      onClick={() => {
                        setQuery(post.productName);
                        doSearch(post.productName);
                      }}
                    >
                      <div className="w-9 h-9 bg-primary/5 rounded-full flex items-center
                                      justify-center shrink-0">
                        <Tag className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {post.productName}
                        </p>
                        <p className="text-xs text-muted truncate">
                          {post.storeName} · {timeAgo(post.postedAt)}
                        </p>
                      </div>
                      <p className="text-base font-bold text-primary shrink-0">
                        ¥{post.price.toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>

      {/* バーコードスキャナー */}
      {showBarcode && (
        <BarcodeScanner
          onDetected={handleBarcodeDetected}
          onClose={() => setShowBarcode(false)}
        />
      )}
    </div>
  );
}
