"use client";

import { useEffect, useState } from "react";

interface Props {
  points: number;
  show: boolean;
}

export default function PointsAnimation({ points, show }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
      <div className="animate-points-float text-center">
        <p className="text-5xl mb-2">🎉</p>
        <div className="bg-primary text-white rounded-2xl px-6 py-3 shadow-lg">
          <p className="text-lg font-bold">ありがとう！</p>
          <p className="text-2xl font-bold">+{points}ポイント獲得</p>
        </div>
      </div>
    </div>
  );
}
