"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Category, CATEGORY_LABELS, PricePost } from "../types";
import { addPost, getPostsByDate, deletePost, searchPosts } from "../storage";
import { useSound } from "../hooks/useSound";
import { Lightbulb, Sparkles, Trash2, X } from "lucide-react";

interface Props {
  date: string; // YYYY-MM-DD
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES: Category[] = ["food", "daily", "drink", "other"];

export default function ExpenseModal({ date, onClose, onSaved }: Props) {
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [saved, setSaved] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { play } = useSound();
  const [comparison, setComparison] = useState<{
    enteredPrice: number;
    communityMin: number | null;
    communityStore: string | null;
    savings: number;
  } | null>(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // iOS キーボード表示時の対応
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      const isKb = vv.height < window.innerHeight * 0.75;
      setKeyboardOpen(isKb);
      if (modalRef.current) {
        if (isKb) {
          modalRef.current.style.maxHeight = `${vv.height - 20}px`;
          modalRef.current.style.bottom = `${window.innerHeight - vv.height - vv.offsetTop}px`;
        } else {
          modalRef.current.style.maxHeight = "";
          modalRef.current.style.bottom = "";
        }
      }
    };

    vv.addEventListener("resize", handleResize);
    vv.addEventListener("scroll", handleResize);
    return () => {
      vv.removeEventListener("resize", handleResize);
      vv.removeEventListener("scroll", handleResize);
    };
  }, []);

  void refreshKey;
  const existing = getPostsByDate(date);

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const handleSubmit = useCallback(() => {
    if (!productName.trim() || !price) return;
    play("receipt");

    // postedAtを指定日に設定するためaddPostを拡張せず直接保存
    const post: PricePost = {
      id: crypto.randomUUID(),
      productName: productName.trim(),
      storeName: storeName.trim() || "未入力",
      price: Number(price),
      location: "",
      category,
      postedAt: date + "T12:00:00.000Z",
    };

    // storage直接操作（addPostだとポイント加算が重複するため）
    const raw = localStorage.getItem("kagotoku_prices");
    const posts: PricePost[] = raw ? JSON.parse(raw) : [];
    posts.unshift(post);
    localStorage.setItem("kagotoku_prices", JSON.stringify(posts));

    // ポイント加算
    const profileRaw = localStorage.getItem("kagotoku_profile");
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      profile.points += 10;
      profile.postCount += 1;
      localStorage.setItem("kagotoku_profile", JSON.stringify(profile));
    }

    // 価格比較を計算
    const enteredPrice = Number(price);
    const communityPosts = searchPosts(productName.trim()).filter(
      (p) => p.id !== post.id
    );
    if (communityPosts.length > 0) {
      const cheapest = communityPosts.reduce((min, p) =>
        p.price < min.price ? p : min
      );
      const diff = enteredPrice - cheapest.price;
      setComparison({
        enteredPrice,
        communityMin: cheapest.price,
        communityStore: cheapest.storeName,
        savings: diff,
      });
    } else {
      setComparison(null);
    }

    setProductName("");
    setPrice("");
    setStoreName("");
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSaved();
    }, 1500);
  }, [productName, price, storeName, category, date, onSaved, play]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* modal */}
      <div
        ref={modalRef}
        className={`relative w-full max-w-lg bg-card-bg rounded-t-3xl sm:rounded-2xl
                    animate-slide-up max-h-[60vh] flex flex-col transition-all
                    ${keyboardOpen ? "mb-0" : ""}`}
      >
        {/* ヘッダー（固定） */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="font-bold text-base">{dateLabel}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* スクロール可能エリア */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 overscroll-contain">
          {/* 入力フォーム */}
          <div className="space-y-3 mb-4">
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="商品名（例：牛乳、洗剤）"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="金額（例：198）"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="お店の名前（任意）"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {/* カテゴリ選択 */}
            <div>
              <p className="text-xs text-muted mb-2">カテゴリ</p>
              <div className="flex gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                      ${category === cat
                        ? "bg-primary text-white"
                        : "bg-background text-muted border border-border"
                      }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 価格比較結果 */}
          {saved && comparison && (
            <div className={`rounded-xl p-4 text-center animate-fade-in mb-4 ${
              comparison.savings > 0
                ? "bg-amber-50 border border-amber-200"
                : "bg-emerald-50 border border-emerald-200"
            }`}>
              {comparison.savings > 0 ? (
                <>
                  <p className="text-sm font-bold text-amber-600 mb-1 inline-flex items-center gap-1 justify-center">
                    <Lightbulb className="w-4 h-4" /> ¥<span className="font-display">{comparison.savings.toLocaleString()}</span>円 お得に買えた店があります！
                  </p>
                  <p className="text-xs text-amber-500">
                    {comparison.communityStore} で ¥<span className="font-display">{comparison.communityMin?.toLocaleString()}</span>
                    （あなた: ¥<span className="font-display">{comparison.enteredPrice.toLocaleString()}</span>）
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-emerald-500 mb-1 inline-flex items-center gap-1 justify-center">
                    <Sparkles className="w-4 h-4" /> 最安値で買えています！
                  </p>
                  {comparison.communityMin && (
                    <p className="text-xs text-emerald-500">
                      他の投稿: ¥<span className="font-display">{comparison.communityMin.toLocaleString()}</span>
                      （あなた: ¥<span className="font-display">{comparison.enteredPrice.toLocaleString()}</span>）
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* 既存データ */}
          {existing.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-2">
                この日の記録（<span className="font-display">{existing.length}</span>件）
              </p>
              <ul className="divide-y divide-border">
                {existing.map((post) => (
                  <li
                    key={post.id}
                    className="py-2 flex justify-between items-center gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.productName}</p>
                      <p className="text-xs text-muted">
                        {post.storeName}
                        {post.category
                          ? ` · ${CATEGORY_LABELS[post.category]}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-base font-bold text-primary shrink-0">
                      ¥<span className="font-display">{post.price.toLocaleString()}</span>
                    </p>
                    <button
                      onClick={() => setDeleteTarget(post.id)}
                      className="text-muted hover:text-red-500 transition-colors shrink-0 p-1"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 送信ボタン（固定フッター） */}
        <div className="shrink-0 px-5 pb-5 pt-2 border-t border-border/50 bg-card-bg
                        rounded-b-none sm:rounded-b-2xl"
             style={{ paddingBottom: keyboardOpen ? "env(safe-area-inset-bottom, 12px)" : undefined }}>
          <button
            onClick={handleSubmit}
            disabled={!productName.trim() || !price}
            className="w-full bg-primary text-white py-3 rounded-xl font-medium
                       hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed
                       active:scale-95 transition-all"
          >
            {saved ? "保存しました！" : "支出を記録する"}
          </button>
        </div>

        {/* 削除確認モーダル */}
        {deleteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
            <div className="relative bg-card-bg rounded-2xl shadow-xl p-5 w-full max-w-xs animate-slide-up">
              <p className="text-sm font-bold text-center mb-2">本当に削除しますか？</p>
              <p className="text-xs text-muted text-center mb-4">
                この記録は元に戻せません
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium
                             hover:bg-background transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    play("error");
                    deletePost(deleteTarget);
                    setDeleteTarget(null);
                    setRefreshKey((k) => k + 1);
                    onSaved();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium
                             hover:bg-red-600 active:scale-95 transition-all"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
