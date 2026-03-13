"use client";

import { useState, useMemo, useCallback } from "react";
import Header from "../components/Header";
import Toast from "../components/Toast";
import { useSound } from "../hooks/useSound";
import {
  getShoppingList,
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  cleanupCompletedItems,
} from "../storage";
import type { ShoppingItem } from "../types";

export default function ShoppingListPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [input, setInput] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);
  const { play } = useSound();

  const items = useMemo(() => {
    void refreshKey;
    cleanupCompletedItems();
    return getShoppingList();
  }, [refreshKey]);

  const activeItems = items.filter((i) => !i.completed);
  const completedItems = items.filter((i) => i.completed);

  const handleAdd = useCallback(() => {
    const name = input.trim();
    if (!name) return;
    play("favorite");
    addShoppingItem(name);
    setInput("");
    setRefreshKey((k) => k + 1);
    setToastMsg(`「${name}」を追加しました (+2pt)`);
    setShowToast(true);
  }, [input, play]);

  const handleToggle = useCallback(
    (id: string, current: boolean) => {
      play(current ? "search" : "post");
      toggleShoppingItem(id);
      setRefreshKey((k) => k + 1);
    },
    [play]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteShoppingItem(id);
      setRefreshKey((k) => k + 1);
    },
    []
  );

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <Toast
        message={toastMsg}
        show={showToast}
        type="success"
        onClose={() => setShowToast(false)}
      />

      <main className="max-w-lg mx-auto px-4 mt-6 space-y-5">
        {/* 入力フォーム */}
        <div className="bg-card-bg rounded-2xl shadow-md p-4 border border-border/50">
          <h2 className="font-bold text-base mb-3">📝 買い物リスト</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="商品名を入力..."
              className="flex-1 border border-border rounded-xl px-4 py-3 text-sm bg-background
                         focus:outline-none focus:ring-2 focus:ring-primary/40
                         placeholder:text-muted/50"
              autoFocus
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="bg-primary text-white px-5 py-3 rounded-xl font-medium
                         hover:bg-primary-hover active:scale-95 transition-all shadow-sm
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              追加
            </button>
          </div>
        </div>

        {/* 未購入リスト */}
        <section className="bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
            🛒 未購入
            {activeItems.length > 0 && (
              <span className="text-xs font-normal text-muted">
                ({activeItems.length}件)
              </span>
            )}
          </h3>

          {activeItems.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">🛒</p>
              <p className="text-sm text-muted">
                リストが空です
                <br />
                商品名を入力して追加しよう
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activeItems.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </section>

        {/* 購入済み */}
        {completedItems.length > 0 && (
          <section className="bg-card-bg rounded-2xl shadow-sm border border-border/50 p-4">
            <h3 className="font-bold text-sm mb-3 text-muted flex items-center gap-1.5">
              ✅ 購入済み
              <span className="text-xs font-normal">
                ({completedItems.length}件 · 24時間後に自動削除)
              </span>
            </h3>
            <ul className="space-y-2">
              {completedItems.map((item) => (
                <ShoppingItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 bg-background rounded-xl p-3">
      <button
        onClick={() => onToggle(item.id, item.completed)}
        className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center
                    transition-colors ${
                      item.completed
                        ? "bg-accent border-accent text-white"
                        : "border-border hover:border-primary"
                    }`}
      >
        {item.completed && <span className="text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            item.completed ? "line-through text-muted" : ""
          }`}
        >
          {item.productName}
        </p>
        <p className="text-[10px] text-muted">
          {new Date(item.addedAt).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
          に追加
        </p>
      </div>

      {!item.completed && (
        <a
          href={`/?q=${encodeURIComponent(item.productName)}`}
          className="text-[10px] text-primary font-medium border border-primary/30
                     rounded-lg px-2 py-1 hover:bg-primary/5 transition-colors shrink-0"
        >
          最安値チェック
        </a>
      )}

      <button
        onClick={() => onDelete(item.id)}
        className="text-muted hover:text-red-500 transition-colors shrink-0 text-sm"
      >
        ✕
      </button>
    </li>
  );
}
