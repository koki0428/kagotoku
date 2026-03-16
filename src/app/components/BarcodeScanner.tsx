"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

interface Props {
  onDetected: (code: string, productName: string | null) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "scanning" | "found" | "error">("loading");
  const [message, setMessage] = useState("カメラを起動中...");
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const lookupProduct = useCallback(async (code: string): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status === 1 && data.product) {
        return (
          data.product.product_name_ja ||
          data.product.product_name ||
          data.product.generic_name ||
          null
        );
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let stopped = false;

    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        if (!videoRef.current) return;

        setStatus("scanning");
        setMessage("バーコードをカメラに映してください");

        const controls = await reader.decodeFromVideoDevice(
          undefined, // use default camera (environment)
          videoRef.current,
          async (result, error, ctrls) => {
            if (stopped) return;
            if (result) {
              stopped = true;
              const code = result.getText();
              setStatus("found");
              setMessage(`JAN: ${code} — 商品を検索中...`);
              ctrls.stop();

              const name = await lookupProduct(code);
              onDetected(code, name);
            }
            // error is normal when no barcode is found
          }
        );

        controlsRef.current = controls;
      } catch {
        if (!stopped) {
          setStatus("error");
          setMessage("カメラを起動できませんでした");
        }
      }
    };

    start();

    return () => {
      stopped = true;
      controlsRef.current?.stop();
    };
  }, [lookupProduct, onDetected]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-white text-sm font-medium">{message}</p>
        <button
          onClick={() => {
            controlsRef.current?.stop();
            onClose();
          }}
          className="text-white text-2xl hover:opacity-70"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* カメラプレビュー */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        {/* スキャンガイド */}
        {status === "scanning" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-32 border-2 border-white/60 rounded-xl relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-3 border-l-3 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-3 border-r-3 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-3 border-l-3 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-3 border-r-3 border-white rounded-br-lg" />
              {/* スキャンライン */}
              <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-primary/80 animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="px-4 py-6 text-center">
        {status === "error" && (
          <button
            onClick={onClose}
            className="bg-card-bg text-foreground px-6 py-3 rounded-xl font-medium border border-border"
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
