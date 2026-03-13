"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-5xl mb-4">📡</p>
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
