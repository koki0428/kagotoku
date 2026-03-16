"use client";

import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ShoppingCart, Mail, Lock } from "lucide-react";

interface Props {
  onGuest: () => void;
  onLoggedIn: () => void;
}

export default function WelcomeScreen({ onGuest, onLoggedIn }: Props) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [showEmail, setShowEmail] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmail = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    const err =
      mode === "login"
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else if (mode === "signup") {
      setSent(true);
    } else {
      onLoggedIn();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* ロゴ・アイコン */}
        <div className="w-28 h-28 bg-[#1a1a1a] rounded-3xl flex items-center justify-center
                        mb-6 shadow-xl relative">
          <ShoppingCart className="w-14 h-14 text-white" />
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-primary rounded-full
                          flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm font-display">¥</span>
          </div>
        </div>

        <h1 className="text-3xl font-bold gradient-text mb-2">カゴトク</h1>
        <p className="text-sm text-muted mb-10">かしこく買い物、もっとおトク</p>

        {!showEmail && !sent ? (
          <div className="w-full max-w-xs space-y-3">
            {/* Googleログイン */}
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-2.5 bg-primary text-white
                         rounded-2xl py-3.5 text-sm font-bold hover:bg-primary-hover
                         active:scale-[0.98] transition-all shadow-md"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.8" />
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity="0.6" />
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.9" />
              </svg>
              Googleでログイン
            </button>

            {/* メールアドレスで登録 */}
            <button
              onClick={() => setShowEmail(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-border
                         rounded-2xl py-3.5 text-sm font-bold text-foreground
                         hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <Mail className="w-4 h-4" />
              メールアドレスで登録
            </button>

            {/* ゲスト利用 */}
            <div className="pt-4 text-center">
              <button
                onClick={onGuest}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                ゲストとして利用する
              </button>
              <p className="text-[10px] text-muted/70 mt-2">
                ゲストはデータが端末にのみ保存されます
              </p>
            </div>
          </div>
        ) : sent ? (
          /* 確認メール送信完了 */
          <div className="w-full max-w-xs text-center animate-fade-in">
            <Mail className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="text-base font-bold mb-2">確認メールを送信しました</h3>
            <p className="text-sm text-muted mb-6">
              {email} に届いたリンクをクリックして登録を完了してください
            </p>
            <button
              onClick={() => { setSent(false); setShowEmail(false); }}
              className="w-full bg-primary text-white py-3 rounded-2xl font-bold text-sm
                         hover:bg-primary-hover transition-colors"
            >
              戻る
            </button>
          </div>
        ) : (
          /* メールフォーム */
          <div className="w-full max-w-xs animate-fade-in">
            <div className="flex items-center gap-2 mb-5">
              <button
                onClick={() => { setShowEmail(false); setError(""); }}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                ← 戻る
              </button>
              <div className="flex-1" />
              <div className="flex gap-1 text-xs">
                <button
                  onClick={() => { setMode("signup"); setError(""); }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    mode === "signup" ? "bg-primary text-white" : "text-muted"
                  }`}
                >
                  新規登録
                </button>
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    mode === "login" ? "bg-primary text-white" : "text-muted"
                  }`}
                >
                  ログイン
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="メールアドレス"
                  className="w-full border border-border rounded-xl pl-10 pr-4 py-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmail()}
                  placeholder="パスワード（6文字以上）"
                  className="w-full border border-border rounded-xl pl-10 pr-4 py-3 text-sm
                             focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 mb-3">{error}</p>
            )}

            <button
              onClick={handleEmail}
              disabled={loading || !email || !password}
              className="w-full bg-primary text-white py-3 rounded-2xl font-bold text-sm
                         hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? "処理中..."
                : mode === "login"
                  ? "ログイン"
                  : "アカウント作成"}
            </button>
          </div>
        )}
      </div>

      {/* 利用規約リンク */}
      <div className="px-8 pb-8 text-center">
        <p className="text-[10px] text-muted/60">
          続行することで
          <a href="/terms" className="underline">利用規約</a>
          と
          <a href="/privacy" className="underline">プライバシーポリシー</a>
          に同意したものとみなされます
        </p>
      </div>
    </div>
  );
}
