"use client";

import { useCallback } from "react";

export function useConfetti() {
  const fire = useCallback(async () => {
    const confetti = (await import("canvas-confetti")).default;

    // Center burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#e8725a", "#f093a0", "#c084fc", "#fbbf24", "#34d399"],
    });

    // Side cannons
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ["#e8725a", "#f093a0", "#c084fc"],
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ["#e8725a", "#f093a0", "#c084fc"],
      });
    }, 150);
  }, []);

  return { fire };
}
