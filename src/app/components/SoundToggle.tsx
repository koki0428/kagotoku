"use client";

import { useState, useEffect } from "react";
import { isSoundEnabled, setSoundEnabled } from "../hooks/useSound";
import { Volume2, VolumeX } from "lucide-react";

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setSoundEnabled(next);
  };

  return (
    <button
      onClick={toggle}
      className="bg-gray-100 rounded-xl w-8 h-8 flex items-center justify-center
                 hover:bg-gray-200 active:scale-90 transition-all border border-border"
      title={enabled ? "効果音をオフにする" : "効果音をオンにする"}
    >
      {enabled ? (
        <Volume2 className="w-4 h-4 text-primary" />
      ) : (
        <VolumeX className="w-4 h-4 text-muted" />
      )}
    </button>
  );
}
