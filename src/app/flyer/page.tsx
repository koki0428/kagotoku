"use client";

import { useState, useRef, useCallback } from "react";
import { addPost, addPoints } from "../storage";
import { useSound } from "../hooks/useSound";
import PointsAnimation from "../components/PointsAnimation";
import Toast from "../components/Toast";

interface FlyerItem {
  name: string;
  price: number;
  originalPrice: number | null;
  note: string | null;
  selected: boolean;
}

export default function FlyerPage() {
  const [storeName, setStoreName] = useState("");
  const [storeNameFromAI, setStoreNameFromAI] = useState("");
  const [items, setItems] = useState<FlyerItem[]>([]);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState(false);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [showPointsAnim, setShowPointsAnim] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"success" | "warning">("success");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { play } = useSound();

  const showMsg = (msg: string, type: "success" | "warning" = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
  };

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // プレビュー表示
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      setRecognizing(true);
      setRecognized(false);
      setItems([]);

      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/flyer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();

        if (!res.ok) {
          play("error");
          showMsg(data.error || "チラシの認識に失敗しました", "warning");
          return;
        }

        if (data.storeName) {
          setStoreNameFromAI(data.storeName);
          if (!storeName) setStoreName(data.storeName);
        }

        if (data.items?.length > 0) {
          play("receipt");
          setItems(
            data.items.map((item: Omit<FlyerItem, "selected">) => ({
              ...item,
              selected: true,
            }))
          );
          setRecognized(true);
          showMsg(`📰 ${data.items.length}件の特売商品を検出しました`);
        } else {
          play("error");
          showMsg("特売商品を検出できませんでした", "warning");
        }
      } catch {
        play("error");
        showMsg("認識に失敗しました。もう一度お試しください", "warning");
      } finally {
        setRecognizing(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [storeName, play]
  );

  const toggleItem = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateItem = (index: number, field: "name" | "price", value: string) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [field]: field === "price" ? Number(value) || 0 : value }
          : item
      )
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = useCallback(() => {
    const finalStore = storeName.trim();
    if (!finalStore) {
      showMsg("店舗名を入力してください", "warning");
      return;
    }
    const selected = items.filter((item) => item.selected && item.name && item.price > 0);
    if (selected.length === 0) {
      showMsg("投稿する商品を選択してください", "warning");
      return;
    }

    setPosting(true);

    // 各商品を投稿（最初の投稿のみaddPostでポイント加算、残りはポイントなし）
    for (let i = 0; i < selected.length; i++) {
      const item = selected[i];
      addPost({
        productName: item.name,
        storeName: finalStore,
        price: item.price,
        location: "",
      });
    }

    // チラシ投稿ボーナス: +50pt（addPostの+10ptとは別に+40pt追加で合計50pt相当）
    // addPostで1件目に+10pt付与済みなので、差分の40ptを追加
    addPoints(40, false);

    play("coin");
    setShowPointsAnim(true);
    setPosted(true);
    setPosting(false);
    showMsg(`📰 ${selected.length}件の特売情報を投稿しました！ +50pt`);

    setTimeout(() => setShowPointsAnim(false), 2500);
  }, [storeName, items, play]);

  const handleReset = () => {
    setItems([]);
    setRecognized(false);
    setPosted(false);
    setPreviewUrl(null);
    setStoreName("");
    setStoreNameFromAI("");
  };

  const selectedCount = items.filter((item) => item.selected).length;

  return (
    <div className="min-h-screen pb-24">
      <PointsAnimation points={50} show={showPointsAnim} />
      <Toast message={toastMsg} show={showToast} type={toastType} onClose={() => setShowToast(false)} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageSelect}
      />

      {/* ヘッダー */}
      <div className="hero-gradient text-white px-4 pt-8 pb-10 shadow-lg">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-bold mb-1">📰 チラシ投稿</h1>
          <p className="text-sm opacity-85">
            チラシの写真から特売情報を自動で読み取り
          </p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {/* 店舗名入力 */}
        <div className="bg-card-bg rounded-2xl shadow-md border border-border/50 p-4">
          <label className="text-sm font-bold mb-2 block">店舗名</label>
          <input
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="お店の名前（例：イオン○○店）"
            className="w-full border border-border rounded-xl px-4 py-3 text-base bg-background
                       focus:outline-none focus:ring-2 focus:ring-primary/40
                       placeholder:text-muted/50"
          />
          {storeNameFromAI && storeNameFromAI !== storeName && (
            <button
              onClick={() => setStoreName(storeNameFromAI)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              AIが検出した店舗名を使う: {storeNameFromAI}
            </button>
          )}
        </div>

        {/* チラシ撮影・アップロード */}
        {!recognized && !posted && (
          <div className="bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4">
            <label className="text-sm font-bold mb-3 block">チラシ写真</label>

            {previewUrl && (
              <div className="mb-3 rounded-xl overflow-hidden border border-border">
                <img src={previewUrl} alt="チラシプレビュー" className="w-full" />
              </div>
            )}

            {recognizing ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent
                                rounded-full animate-spin mb-3" />
                <p className="text-sm text-muted">チラシを解析中...</p>
                <p className="text-xs text-muted mt-1">特売商品と価格を読み取っています</p>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-medium text-sm
                             hover:bg-primary-hover active:scale-95 transition-all shadow-sm
                             flex items-center justify-center gap-2"
                >
                  <span className="text-lg">📷</span>
                  撮影する
                </button>
                <button
                  onClick={() => {
                    if (fileRef.current) {
                      fileRef.current.removeAttribute("capture");
                      fileRef.current.click();
                      setTimeout(() => fileRef.current?.setAttribute("capture", "environment"), 100);
                    }
                  }}
                  className="flex-1 border border-border bg-background py-3 rounded-xl font-medium text-sm
                             hover:border-primary hover:text-primary transition-colors
                             flex items-center justify-center gap-2"
                >
                  <span className="text-lg">🖼️</span>
                  画像を選択
                </button>
              </div>
            )}
          </div>
        )}

        {/* 抽出結果の確認・編集 */}
        {recognized && !posted && (
          <div className="bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm">抽出された特売商品</h2>
              <span className="text-xs text-muted">{selectedCount}/{items.length}件選択中</span>
            </div>

            {previewUrl && (
              <div className="mb-3 rounded-xl overflow-hidden border border-border max-h-40">
                <img src={previewUrl} alt="チラシ" className="w-full object-cover" />
              </div>
            )}

            <ul className="space-y-2">
              {items.map((item, i) => (
                <li
                  key={i}
                  className={`rounded-xl border p-3 transition-colors ${
                    item.selected
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-background opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* チェックボックス */}
                    <button
                      onClick={() => toggleItem(i)}
                      className={`mt-1 w-5 h-5 rounded-md border-2 flex items-center justify-center
                                  shrink-0 transition-colors ${
                                    item.selected
                                      ? "bg-primary border-primary text-white"
                                      : "border-border"
                                  }`}
                    >
                      {item.selected && <span className="text-xs">✓</span>}
                    </button>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* 商品名 */}
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(i, "name", e.target.value)}
                        className="w-full text-sm font-medium bg-transparent border-b border-border/50
                                   focus:outline-none focus:border-primary pb-0.5"
                      />
                      {/* 価格行 */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">¥</span>
                        <input
                          type="number"
                          value={item.price || ""}
                          onChange={(e) => updateItem(i, "price", e.target.value)}
                          className="w-20 text-sm font-bold text-primary bg-transparent border-b
                                     border-border/50 focus:outline-none focus:border-primary pb-0.5"
                        />
                        {item.originalPrice && (
                          <span className="text-xs text-muted line-through">
                            ¥{item.originalPrice.toLocaleString()}
                          </span>
                        )}
                        {item.note && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            {item.note}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 削除 */}
                    <button
                      onClick={() => removeItem(i)}
                      className="text-muted hover:text-red-400 transition-colors shrink-0 mt-1"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            {/* 投稿ボタン */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-xl border border-border text-sm font-medium
                           hover:bg-background transition-colors"
              >
                やり直す
              </button>
              <button
                onClick={handlePost}
                disabled={posting || selectedCount === 0 || !storeName.trim()}
                className="flex-1 bg-primary text-white py-3 rounded-xl font-medium text-sm
                           hover:bg-primary-hover active:scale-95 transition-all shadow-sm
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {posting ? "投稿中..." : `${selectedCount}件を投稿する（+50pt）`}
              </button>
            </div>
          </div>
        )}

        {/* 投稿完了 */}
        {posted && (
          <div className="bg-card-bg rounded-2xl shadow-sm border border-border/50 p-6 text-center">
            <p className="text-4xl mb-3">🎉</p>
            <h2 className="font-bold text-lg mb-2">投稿完了！</h2>
            <p className="text-sm text-muted mb-5">
              チラシの特売情報をみんなと共有しました
            </p>
            <button
              onClick={handleReset}
              className="bg-primary text-white px-6 py-3 rounded-xl font-medium text-sm
                         hover:bg-primary-hover active:scale-95 transition-all shadow-sm"
            >
              別のチラシを投稿する
            </button>
          </div>
        )}

        {/* 使い方ガイド */}
        {!recognized && !posted && !recognizing && (
          <div className="bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4">
            <h3 className="font-bold text-sm mb-3">使い方</h3>
            <ol className="space-y-2">
              {[
                { step: "1", text: "店舗名を入力します" },
                { step: "2", text: "チラシの写真を撮影またはアップロード" },
                { step: "3", text: "AIが特売商品と価格を自動で読み取り" },
                { step: "4", text: "内容を確認・修正して投稿！" },
              ].map((item) => (
                <li key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center
                                   justify-center text-xs font-bold shrink-0">
                    {item.step}
                  </span>
                  <span className="text-sm text-muted pt-0.5">{item.text}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 bg-accent/10 rounded-xl px-3 py-2 text-center">
              <p className="text-xs font-medium text-accent">
                チラシ投稿で +50pt 獲得！
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
