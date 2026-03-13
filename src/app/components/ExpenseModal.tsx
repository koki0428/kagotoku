"use client";

import { useState, useCallback } from "react";
import { Category, CATEGORY_LABELS, PricePost } from "../types";
import { addPost, getPostsByDate } from "../storage";

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

  const existing = getPostsByDate(date);

  const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const handleSubmit = useCallback(() => {
    if (!productName.trim() || !price) return;

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

    setProductName("");
    setPrice("");
    setStoreName("");
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSaved();
    }, 800);
  }, [productName, price, storeName, category, date, onSaved]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" />

      {/* modal */}
      <div className="relative w-full max-w-lg bg-card-bg rounded-t-3xl sm:rounded-2xl p-5 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-base">{dateLabel}</h2>
          <button
            onClick={onClose}
            className="text-muted text-xl hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* 入力フォーム */}
        <div className="space-y-3 mb-5">
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

        {/* 既存データ */}
        {existing.length > 0 && (
          <div>
            <p className="text-xs text-muted mb-2">
              この日の記録（{existing.length}件）
            </p>
            <ul className="divide-y divide-border">
              {existing.map((post) => (
                <li
                  key={post.id}
                  className="py-2 flex justify-between items-center"
                >
                  <div>
                    <p className="text-sm font-medium">{post.productName}</p>
                    <p className="text-xs text-muted">
                      {post.storeName}
                      {post.category
                        ? ` · ${CATEGORY_LABELS[post.category]}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-base font-bold text-primary">
                    ¥{post.price.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
