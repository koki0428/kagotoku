"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getProfile } from "../storage";
import LoginModal from "./LoginModal";
import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const profile = getProfile();
    setNickname(profile.nickname || "");
  }, [user]);

  const displayName = nickname || "ゲスト";

  return (
    <>
      <header className="bg-white py-4 px-4 shadow-sm border-b border-border">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">
              <span className="gradient-text flex items-center gap-1.5">
                <ShoppingCart className="w-6 h-6 text-primary" />
                カゴトク
              </span>
            </h1>
            <p className="text-sm text-muted mt-1">
              かしこく買い物、もっとおトク
            </p>
          </div>
          <div className="relative">
            {user ? (
              <Link
                href="/mypage"
                className="bg-[#FAFAFA] rounded-xl px-3 py-2 text-sm font-medium text-foreground
                           hover:bg-gray-100 transition-colors flex items-center gap-1.5
                           border border-border"
              >
                <User className="w-4 h-4 text-muted" />
                {displayName}
              </Link>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="bg-primary text-white rounded-xl px-3 py-2 text-sm font-medium
                           hover:bg-primary-hover transition-colors"
              >
                ログイン
              </button>
            )}
          </div>
        </div>
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
