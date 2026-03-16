"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Crown, Ban, Bell, Zap, Check, Minus, PartyPopper } from "lucide-react";

export default function PremiumPage() {
  return (
    <Suspense>
      <PremiumContent />
    </Suspense>
  );
}

function PremiumContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const success = searchParams.get("success") === "true";
  const canceled = searchParams.get("canceled") === "true";

  // プレミアム状態チェック
  useEffect(() => {
    if (!user) {
      setCheckingStatus(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, premium_expires_at")
        .eq("id", user.id)
        .single();

      if (data) {
        const active = data.is_premium && data.premium_expires_at &&
          new Date(data.premium_expires_at).getTime() > Date.now();
        setIsPremium(!!active);
        setExpiresAt(data.premium_expires_at);
      }
      setCheckingStatus(false);
    })();
  }, [user, success]);

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "エラーが発生しました");
      }
    } catch {
      alert("エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Ban, title: "広告を完全非表示", desc: "すべての広告が非表示になります" },
    { icon: Bell, title: "価格アラート無制限", desc: "お気に入り商品の価格変動を通知" },
    { icon: Crown, title: "プレミアムバッジ", desc: "プロフィールに特別なバッジを表示" },
    { icon: Zap, title: "優先サポート", desc: "お問い合わせに優先的に対応" },
  ];

  return (
    <div className="min-h-screen pb-24">
      {/* ヘッダー */}
      <div className="hero-gradient text-foreground px-4 pt-8 pb-10 shadow-lg">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="text-foreground/60 hover:text-foreground transition-colors text-sm">
            ← ホームに戻る
          </Link>
          <div className="mt-4 text-center">
            <Crown className="w-10 h-10 text-primary mx-auto mb-2" />
            <h1 className="text-2xl font-bold">カゴトク プレミアム</h1>
            <p className="text-sm opacity-85 mt-1">もっと快適に、もっとおトクに</p>
          </div>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 -mt-4 space-y-4">
        {/* 成功メッセージ */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center animate-fade-in">
            <PartyPopper className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-600">プレミアムに登録しました！</p>
            <p className="text-xs text-emerald-500 mt-1">すべての特典をお楽しみください</p>
          </div>
        )}

        {/* キャンセルメッセージ */}
        {canceled && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center animate-fade-in">
            <p className="text-sm text-amber-600">決済がキャンセルされました</p>
          </div>
        )}

        {/* プレミアム加入済み */}
        {!checkingStatus && isPremium && (
          <div className="bg-card-bg rounded-2xl shadow-sm border border-border p-5 text-center">
            <Crown className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-bold text-base">プレミアム会員</p>
            <p className="text-xs text-muted mt-1">
              有効期限：{expiresAt ? new Date(expiresAt).toLocaleDateString("ja-JP") : "—"}
            </p>
            <div className="mt-4 bg-accent/10 rounded-xl px-3 py-2">
              <p className="text-xs text-accent font-medium">すべての特典が有効です</p>
            </div>
          </div>
        )}

        {/* 特典一覧 */}
        <div className="bg-card-bg rounded-2xl shadow-sm border border-border p-5">
          <h2 className="font-bold text-base mb-4 text-center">プレミアム特典</h2>
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f.title} className="flex items-start gap-3 bg-background rounded-xl p-3">
                <f.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-xs text-muted mt-0.5">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* 料金カード */}
        {!isPremium && (
          <div className="bg-card-bg rounded-2xl shadow-md border-2 border-primary/30 p-5 text-center">
            <p className="text-xs text-muted mb-1">月額プラン</p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-primary">¥300</span>
              <span className="text-sm text-muted">/月</span>
            </div>
            <p className="text-xs text-muted mt-2 mb-5">いつでもキャンセル可能</p>

            {user ? (
              <button
                onClick={handleSubscribe}
                disabled={loading || checkingStatus}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm
                           hover:bg-primary-hover active:scale-95 transition-all shadow-sm
                           disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "処理中..." : "プレミアムに登録する"}
              </button>
            ) : (
              <div>
                <p className="text-xs text-muted mb-3">
                  プレミアムへの登録にはログインが必要です
                </p>
                <Link
                  href="/"
                  className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm
                             hover:bg-primary-hover transition-colors"
                >
                  ログインする
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 比較表 */}
        <div className="bg-card-bg rounded-2xl shadow-sm border border-border p-5">
          <h2 className="font-bold text-base mb-4 text-center">プラン比較</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted">機能</th>
                <th className="text-center py-2 font-medium text-muted w-20">無料</th>
                <th className="text-center py-2 font-medium text-primary w-20">プレミアム</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                { name: "価格投稿・検索", free: true, premium: true },
                { name: "チラシ読み取り", free: true, premium: true },
                { name: "家計簿・リスト", free: true, premium: true },
                { name: "ポイントシステム", free: true, premium: true },
                { name: "広告非表示", free: false, premium: true },
                { name: "価格アラート無制限", free: false, premium: true },
                { name: "プレミアムバッジ", free: false, premium: true },
                { name: "優先サポート", free: false, premium: true },
              ].map((row) => (
                <tr key={row.name}>
                  <td className="py-2.5">{row.name}</td>
                  <td className="text-center py-2.5">
                    {row.free ? <Check className="w-4 h-4 text-accent inline-block" /> : <Minus className="w-4 h-4 text-muted inline-block" />}
                  </td>
                  <td className="text-center py-2.5">
                    {row.premium ? <Check className="w-4 h-4 text-primary inline-block" /> : <Minus className="w-4 h-4 text-muted inline-block" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
