"use client";

import { useState } from "react";
import type { Category } from "../types";
import { CATEGORY_LABELS } from "../types";

interface ReceiptItem {
  name: string;
  price: number;
  category: Category;
}

interface ReceiptData {
  storeName: string;
  date: string;
  items: ReceiptItem[];
  total: number;
}

interface Props {
  data: ReceiptData;
  onConfirm: (data: ReceiptData) => void;
  onClose: () => void;
}

export default function ReceiptModal({ data, onConfirm, onClose }: Props) {
  const [storeName, setStoreName] = useState(data.storeName);
  const [date, setDate] = useState(data.date);
  const [items, setItems] = useState<ReceiptItem[]>(data.items);

  const updateItem = (index: number, field: keyof ReceiptItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === "price" ? Number(value) : value } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);

  const handleConfirm = () => {
    onConfirm({ storeName, date, items, total });
  };

  return (
    <div className="fixed inset-0 z-[100] animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-card-bg rounded-t-3xl animate-slide-up
                      max-h-[85vh] overflow-y-auto">
        <div className="p-5">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">📋 レシート内容の確認</h2>
            <button onClick={onClose} className="text-muted text-lg px-2">✕</button>
          </div>

          {/* 店名・日付 */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs text-muted mb-1 block">店名</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1 block">日付</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* 商品リスト */}
          <div className="mb-4">
            <p className="text-xs text-muted mb-2">商品（{items.length}件）</p>
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="bg-background rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(i, "name", e.target.value)}
                      className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      onClick={() => removeItem(i)}
                      className="text-muted text-sm hover:text-red-500 px-1"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => updateItem(i, "price", e.target.value)}
                      className="w-24 border border-border rounded-lg px-2.5 py-1.5 text-sm text-right
                                 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <span className="text-xs text-muted">円</span>
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(i, "category", e.target.value)}
                      className="flex-1 border border-border rounded-lg px-2 py-1.5 text-xs
                                 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 合計 */}
          <div className="bg-primary/10 rounded-xl p-3 mb-4 flex justify-between items-center">
            <p className="text-sm font-medium">合計</p>
            <p className="text-xl font-bold text-primary">
              ¥{total.toLocaleString()}
            </p>
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 border border-border py-3 rounded-xl text-sm font-medium
                         text-muted hover:bg-background transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleConfirm}
              disabled={items.length === 0 || !storeName.trim()}
              className="flex-1 bg-primary text-white py-3 rounded-xl text-sm font-bold
                         hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed
                         active:scale-95 transition-all"
            >
              {items.length}件を登録する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
