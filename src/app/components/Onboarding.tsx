"use client";

import { useState } from "react";
import { completeOnboarding, setNickname, grantWelcomeBonus } from "../storage";

const STEPS = [
  {
    emoji: "📸",
    title: "買い物中に価格を記録するだけ",
    desc: "見つけた商品の価格をサッと投稿。\nあなたの情報がみんなの節約につながります。",
    bg: "from-orange-400 to-pink-400",
  },
  {
    emoji: "🗺️",
    title: "近くの店の最安値がわかる",
    desc: "地図で近所のスーパーやドラッグストアの\n価格をかんたんに比較できます。",
    bg: "from-blue-400 to-cyan-400",
  },
  {
    emoji: "🤝",
    title: "みんなで節約情報をシェアしよう",
    desc: "投稿するとポイントが貯まってバッジをGET！\nみんなの力でもっとおトクに。",
    bg: "from-green-400 to-emerald-400",
  },
];

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [nickname, setNick] = useState("");

  const isLastStep = step === STEPS.length;

  const handleFinish = () => {
    if (nickname.trim()) {
      setNickname(nickname.trim());
    }
    completeOnboarding();
    grantWelcomeBonus();
    onComplete();
  };

  const handleSkip = () => {
    completeOnboarding();
    grantWelcomeBonus();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col">
      {/* スキップ */}
      <div className="flex justify-end p-4">
        <button
          onClick={handleSkip}
          className="text-sm text-muted hover:text-foreground"
        >
          スキップ
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {!isLastStep ? (
          /* ステップ1-3 */
          <div key={step} className="animate-onboard text-center max-w-sm">
            <div
              className={`w-32 h-32 rounded-full bg-gradient-to-br ${STEPS[step].bg}
                          flex items-center justify-center mx-auto mb-8 shadow-lg`}
            >
              <span className="text-6xl">{STEPS[step].emoji}</span>
            </div>
            <h2 className="text-xl font-bold mb-4 text-foreground">
              {STEPS[step].title}
            </h2>
            <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
              {STEPS[step].desc}
            </p>
          </div>
        ) : (
          /* ニックネーム設定 */
          <div key="nickname" className="animate-onboard text-center max-w-sm w-full">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-orange-400
                            flex items-center justify-center mx-auto mb-8 shadow-lg">
              <span className="text-6xl">👋</span>
            </div>
            <h2 className="text-xl font-bold mb-2 text-foreground">
              ようこそカゴトクへ！
            </h2>
            <p className="text-sm text-muted mb-6">
              ニックネームを設定しましょう（あとで変更できます）
            </p>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNick(e.target.value)}
              placeholder="ニックネーム"
              className="w-full border-2 border-border rounded-2xl px-5 py-3.5 text-center text-base
                         focus:outline-none focus:border-primary transition-colors mb-4"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleFinish()}
            />
          </div>
        )}
      </div>

      {/* 下部ナビ */}
      <div className="px-8 pb-10">
        {/* ドット */}
        <div className="flex justify-center gap-2 mb-6">
          {[...STEPS, null].map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === step ? "bg-primary w-6" : "bg-border"
              }`}
            />
          ))}
        </div>

        {isLastStep ? (
          <button
            onClick={handleFinish}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base
                       hover:bg-primary-hover active:scale-[0.98] transition-all shadow-lg"
          >
            はじめる
          </button>
        ) : (
          <button
            onClick={() => setStep(step + 1)}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base
                       hover:bg-primary-hover active:scale-[0.98] transition-all shadow-lg"
          >
            つぎへ
          </button>
        )}
      </div>
    </div>
  );
}
