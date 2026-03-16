"use client";

import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <WifiOff className="w-12 h-12 text-muted mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">オフラインです</h1>
        <p className="text-sm text-muted mb-6">
          インターネットに接続されていません。
          <br />
          接続が回復したら自動的に復帰します。
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium
                     hover:bg-primary-hover active:scale-95 transition-all"
        >
          再読み込み
        </button>
      </div>
    </div>
  );
}
