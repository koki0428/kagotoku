"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Header from "../components/Header";
import ExpenseModal from "../components/ExpenseModal";
import PieChart from "../components/PieChart";
import BarChart from "../components/BarChart";
import ReceiptModal from "../components/ReceiptModal";
import Toast from "../components/Toast";
import {
  getPosts,
  savePosts,
  getDailySummaries,
  getMonthlySummaries,
  getYearlySummaries,
  getCategorySummary,
  getBudget,
  setBudget,
} from "../storage";
import type { Category, PricePost } from "../types";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "../types";

type ViewMode = "day" | "month" | "year";

export default function CalendarPage() {
  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [refreshKey, setRefreshKey] = useState(0);

  // モーダル
  const [modalDate, setModalDate] = useState<string | null>(null);

  // 予算編集
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  // レシートスキャン
  const receiptCameraRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    storeName: string;
    date: string;
    items: { name: string; price: number; category: Category }[];
    total: number;
  } | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [showToast, setShowToast] = useState(false);

  const yearMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  const allPosts = useMemo(() => {
    void refreshKey;
    return getPosts();
  }, [refreshKey]);

  const totalSpent = useMemo(
    () => allPosts.reduce((sum, p) => sum + p.price, 0),
    [allPosts]
  );

  // 日別
  const dailySummaries = useMemo(
    () => {
      void refreshKey;
      return getDailySummaries(currentYear, currentMonth);
    },
    [currentYear, currentMonth, refreshKey]
  );
  const monthTotal = useMemo(
    () => dailySummaries.reduce((s, d) => s + d.total, 0),
    [dailySummaries]
  );

  // 月別
  const monthlySummaries = useMemo(
    () => getMonthlySummaries(currentYear),
    [currentYear, refreshKey]
  );
  const yearTotal = useMemo(
    () => monthlySummaries.reduce((s, m) => s + m.total, 0),
    [monthlySummaries]
  );

  // 年別
  const yearlySummaries = useMemo(() => {
    void refreshKey;
    return getYearlySummaries();
  }, [refreshKey]);

  // カテゴリ別
  const categorySummary = useMemo(
    () => {
      void refreshKey;
      return getCategorySummary(currentYear, currentMonth);
    },
    [currentYear, currentMonth, refreshKey]
  );

  // 先月の支出合計
  const prevMonthTotal = useMemo(() => {
    void refreshKey;
    const pm = currentMonth === 1 ? 12 : currentMonth - 1;
    const py = currentMonth === 1 ? currentYear - 1 : currentYear;
    const summaries = getDailySummaries(py, pm);
    return summaries.reduce((s, d) => s + d.total, 0);
  }, [currentYear, currentMonth, refreshKey]);

  // 過去6ヶ月の支出データ（棒グラフ用）
  const past6Months = useMemo(() => {
    void refreshKey;
    const result: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m <= 0) { m += 12; y--; }
      const summaries = getDailySummaries(y, m);
      const total = summaries.reduce((s, d) => s + d.total, 0);
      result.push({ label: `${m}月`, value: total });
    }
    return result;
  }, [currentYear, currentMonth, refreshKey]);

  // 予算
  const budget = useMemo(() => {
    void refreshKey;
    return getBudget(yearMonth);
  }, [yearMonth, refreshKey]);

  const budgetRemaining = budget !== null ? budget - monthTotal : null;
  const budgetPct =
    budget !== null && budget > 0
      ? Math.min(100, (monthTotal / budget) * 100)
      : 0;

  // 入力がある日のセット
  const datesWithData = useMemo(() => {
    const set = new Set<string>();
    for (const s of dailySummaries) set.add(s.date);
    return set;
  }, [dailySummaries]);

  // カレンダーグリッド
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells: (null | {
      day: number;
      dateStr: string;
      total: number;
      count: number;
      hasData: boolean;
    })[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const summary = dailySummaries.find((s) => s.date === dateStr);
      cells.push({
        day: d,
        dateStr,
        total: summary?.total ?? 0,
        count: summary?.count ?? 0,
        hasData: datesWithData.has(dateStr),
      });
    }
    return cells;
  }, [currentYear, currentMonth, dailySummaries, datesWithData]);

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = useCallback((dateStr: string) => {
    setModalDate(dateStr);
  }, []);

  const handleReceiptCapture = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setScanning(true);
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();

        if (res.ok && data.items) {
          setReceiptData(data);
        } else {
          const detail = data.detail ? `\n${data.detail}` : "";
          setToastMsg((data.error || "レシートを読み取れませんでした") + detail);
          setShowToast(true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        setToastMsg("読み取りに失敗しました。" + (msg || "もう一度お試しください"));
        setShowToast(true);
      } finally {
        setScanning(false);
        if (receiptCameraRef.current) receiptCameraRef.current.value = "";
      }
    },
    []
  );

  const handleReceiptConfirm = useCallback(
    (data: { storeName: string; date: string; items: { name: string; price: number; category: Category }[]; total: number }) => {
      const posts = getPosts();
      for (const item of data.items) {
        const newPost: PricePost = {
          id: crypto.randomUUID(),
          productName: item.name,
          storeName: data.storeName,
          price: item.price,
          location: "",
          category: item.category,
          postedAt: new Date(data.date + "T12:00:00").toISOString(),
        };
        posts.unshift(newPost);
      }
      savePosts(posts);
      setReceiptData(null);
      setRefreshKey((k) => k + 1);
      setToastMsg(`📋 ${data.items.length}件の支出を登録しました`);
      setShowToast(true);
    },
    []
  );

  const handleSaveBudget = () => {
    const val = Number(budgetInput);
    if (val > 0) {
      setBudget(yearMonth, val);
      setRefreshKey((k) => k + 1);
    }
    setEditingBudget(false);
    setBudgetInput("");
  };

  return (
    <div className="min-h-screen pb-20">
      <Header />
      <Toast message={toastMsg} show={showToast} type="success" onClose={() => setShowToast(false)} />
      <input
        ref={receiptCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleReceiptCapture}
      />
      <main className="max-w-lg mx-auto px-4 mt-6 space-y-5">
        {/* レシートスキャンボタン */}
        <button
          onClick={() => receiptCameraRef.current?.click()}
          disabled={scanning}
          className="w-full gradient-btn text-white
                     rounded-2xl py-3.5 font-bold text-sm shadow-md
                     hover:opacity-90 active:scale-[0.98] transition-all
                     flex items-center justify-center gap-2
                     disabled:opacity-50"
        >
          {scanning ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent
                               rounded-full animate-spin" />
              レシートを解析中...
            </>
          ) : (
            <>
              <span>📷</span>
              レシートを撮影して自動入力
            </>
          )}
        </button>

        {/* 累計サマリー */}
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 text-center">
          <p className="text-xs text-muted mb-1">これまでの支出合計</p>
          <p className="text-3xl font-bold text-primary">
            ¥{totalSpent.toLocaleString()}
          </p>
          <p className="text-xs text-muted mt-1">{allPosts.length}件</p>
        </div>

        {/* タブ */}
        <div className="flex bg-card-bg rounded-xl border border-border overflow-hidden">
          {(["day", "month", "year"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors
                ${viewMode === mode ? "bg-primary text-white" : "text-muted hover:bg-primary/5"}`}
            >
              {mode === "day" ? "日" : mode === "month" ? "月" : "年"}
            </button>
          ))}
        </div>

        {/* ===== 日別ビュー ===== */}
        {viewMode === "day" && (
          <>
            <section className="bg-card-bg rounded-2xl shadow-sm border border-border p-4">
              {/* 月ナビ */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  className="text-primary text-lg px-2 hover:bg-primary/10 rounded-lg"
                >
                  ◀
                </button>
                <h2 className="font-bold text-base">
                  {currentYear}年{currentMonth}月
                </h2>
                <button
                  onClick={nextMonth}
                  className="text-primary text-lg px-2 hover:bg-primary/10 rounded-lg"
                >
                  ▶
                </button>
              </div>

              {/* 予算プログレスバー */}
              <div className="mb-4 py-3 px-3 bg-background rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-muted">
                    今月の支出
                  </p>
                  {budget !== null ? (
                    <button
                      onClick={() => {
                        setBudgetInput(String(budget));
                        setEditingBudget(true);
                      }}
                      className="text-[10px] text-primary hover:underline"
                    >
                      予算: ¥{budget.toLocaleString()}
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingBudget(true)}
                      className="text-[10px] text-primary hover:underline"
                    >
                      + 予算を設定
                    </button>
                  )}
                </div>

                <p className="text-2xl font-bold text-foreground mb-1">
                  ¥{monthTotal.toLocaleString()}
                </p>

                {budget !== null && (
                  <>
                    <div className="h-2.5 bg-border rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          budgetPct >= 100
                            ? "bg-red-500"
                            : budgetPct >= 80
                              ? "bg-yellow-500"
                              : "bg-accent"
                        }`}
                        style={{ width: `${budgetPct}%` }}
                      />
                    </div>
                    <p
                      className={`text-xs font-medium ${
                        budgetRemaining! < 0 ? "text-red-500" : "text-accent"
                      }`}
                    >
                      {budgetRemaining! >= 0
                        ? `あと ¥${budgetRemaining!.toLocaleString()} 使えます`
                        : `¥${Math.abs(budgetRemaining!).toLocaleString()} オーバー`}
                    </p>
                  </>
                )}

                {/* 予算編集 */}
                {editingBudget && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="number"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      placeholder="月の予算額"
                      className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveBudget}
                      className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      設定
                    </button>
                    <button
                      onClick={() => setEditingBudget(false)}
                      className="text-muted text-sm px-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* カレンダーグリッド */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {["日", "月", "火", "水", "木", "金", "土"].map((d) => (
                  <div key={d} className="py-1 text-muted font-medium">
                    {d}
                  </div>
                ))}
                {calendarDays.map((cell, i) => (
                  <button
                    key={i}
                    onClick={() => cell && handleDateClick(cell.dateStr)}
                    disabled={!cell}
                    className={`py-1 rounded-lg min-h-[52px] flex flex-col items-center justify-start
                      transition-colors
                      ${!cell ? "" : "hover:bg-primary/10 active:bg-primary/20 cursor-pointer"}
                      ${cell?.hasData ? "bg-primary/10 border border-primary/20" : ""}
                    `}
                  >
                    {cell && (
                      <>
                        <span className="text-xs text-foreground">
                          {cell.day}
                        </span>
                        {cell.total > 0 ? (
                          <span className="text-[10px] font-bold text-primary mt-0.5">
                            ¥{cell.total.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] text-border mt-0.5">
                            +
                          </span>
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>

              {/* 日別リスト */}
              {dailySummaries.length > 0 && (
                <ul className="mt-4 divide-y divide-border">
                  {dailySummaries.map((s) => (
                    <li
                      key={s.date}
                      className="py-2.5 flex justify-between items-center cursor-pointer hover:bg-primary/5 rounded-lg px-2 -mx-2"
                      onClick={() => handleDateClick(s.date)}
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(
                            s.date + "T00:00:00"
                          ).toLocaleDateString("ja-JP", {
                            month: "long",
                            day: "numeric",
                            weekday: "short",
                          })}
                        </p>
                        <p className="text-xs text-muted">{s.count}件</p>
                      </div>
                      <p className="text-base font-bold text-primary">
                        ¥{s.total.toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* ===== 月別ビュー ===== */}
        {viewMode === "month" && (
          <>
            <section className="bg-card-bg rounded-2xl shadow-sm border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentYear(currentYear - 1)}
                  className="text-primary text-lg px-2 hover:bg-primary/10 rounded-lg"
                >
                  ◀
                </button>
                <h2 className="font-bold text-base">{currentYear}年</h2>
                <button
                  onClick={() => setCurrentYear(currentYear + 1)}
                  className="text-primary text-lg px-2 hover:bg-primary/10 rounded-lg"
                >
                  ▶
                </button>
              </div>

              <div className="text-center mb-4 py-2 bg-background rounded-xl">
                <p className="text-xs text-muted">年間合計</p>
                <p className="text-2xl font-bold text-foreground">
                  ¥{yearTotal.toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                  const data = monthlySummaries.find((s) => s.month === m);
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setCurrentMonth(m);
                        setViewMode("day");
                      }}
                      className={`rounded-xl p-3 text-center transition-colors
                        ${data ? "bg-primary/10 hover:bg-primary/20" : "bg-background hover:bg-border/30"}`}
                    >
                      <p className="text-sm font-medium">{m}月</p>
                      {data ? (
                        <p className="text-xs font-bold text-primary mt-1">
                          ¥{data.total.toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-xs text-muted mt-1">—</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 先月比較カード */}
            {(monthTotal > 0 || prevMonthTotal > 0) && (
              <section className={`rounded-2xl shadow-sm border p-4 text-center ${
                prevMonthTotal > 0 && monthTotal <= prevMonthTotal
                  ? "bg-accent/10 border-accent/20"
                  : prevMonthTotal > 0
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-card-bg border-border"
              }`}>
                <h2 className="font-bold text-sm mb-2">
                  📈 先月との比較
                </h2>
                {prevMonthTotal > 0 ? (
                  <>
                    <p className={`text-2xl font-bold ${
                      monthTotal <= prevMonthTotal ? "text-accent" : "text-amber-400"
                    }`}>
                      {monthTotal <= prevMonthTotal
                        ? `¥${(prevMonthTotal - monthTotal).toLocaleString()} 節約！`
                        : `¥${(monthTotal - prevMonthTotal).toLocaleString()} 多く使用`}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      先月: ¥{prevMonthTotal.toLocaleString()} → 今月: ¥{monthTotal.toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">
                    先月のデータがありません
                  </p>
                )}
              </section>
            )}

            {/* カテゴリ別ドーナツグラフ */}
            {categorySummary.length > 0 && (
              <section className="bg-card-bg rounded-2xl shadow-sm border border-border p-4">
                <h2 className="font-bold text-base mb-3">
                  🍩 {currentMonth}月 カテゴリ別
                </h2>
                <div className="flex justify-center">
                  <PieChart
                    data={categorySummary.map((c) => ({
                      label: CATEGORY_LABELS[c.category],
                      value: c.total,
                      color: CATEGORY_COLORS[c.category],
                    }))}
                  />
                </div>
              </section>
            )}

            {/* 過去6ヶ月の支出推移 */}
            {past6Months.some((m) => m.value > 0) && (
              <section className="bg-card-bg rounded-2xl shadow-sm border border-border p-4">
                <h2 className="font-bold text-base mb-3">
                  📊 支出推移（過去6ヶ月）
                </h2>
                <BarChart data={past6Months} height={140} />
              </section>
            )}
          </>
        )}

        {/* ===== 年別ビュー ===== */}
        {viewMode === "year" && (
          <section className="bg-card-bg rounded-2xl shadow-sm border border-border p-4">
            <h2 className="font-bold text-base mb-4 text-center">
              年別サマリー
            </h2>
            {yearlySummaries.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">
                まだデータがありません
              </p>
            ) : (
              <ul className="space-y-2">
                {yearlySummaries.map((s) => (
                  <li
                    key={s.year}
                    className="flex justify-between items-center bg-background rounded-xl p-4 cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => {
                      setCurrentYear(s.year);
                      setViewMode("month");
                    }}
                  >
                    <div>
                      <p className="text-base font-bold">{s.year}年</p>
                      <p className="text-xs text-muted">{s.count}件</p>
                    </div>
                    <p className="text-xl font-bold text-primary">
                      ¥{s.total.toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {/* 支出入力モーダル */}
      {modalDate && (
        <ExpenseModal
          date={modalDate}
          onClose={() => setModalDate(null)}
          onSaved={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* レシート確認モーダル */}
      {receiptData && (
        <ReceiptModal
          data={receiptData}
          onConfirm={handleReceiptConfirm}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
}
