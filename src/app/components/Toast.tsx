"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Info, AlertTriangle, X } from "lucide-react";

interface ToastProps {
  message: string;
  type?: "success" | "info" | "warning";
  show: boolean;
  onClose: () => void;
  duration?: number;
}

const ICONS = {
  success: <CheckCircle className="w-5 h-5 shrink-0" />,
  info: <Info className="w-5 h-5 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0" />,
};

const BG_COLORS = {
  success: "bg-accent text-white",
  info: "bg-primary text-white",
  warning: "bg-yellow-500 text-white",
};

export default function Toast({
  message,
  type = "info",
  show,
  onClose,
  duration = 3000,
}: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show && !visible) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] max-w-sm w-[calc(100%-2rem)]
                  ${BG_COLORS[type]} rounded-2xl px-4 py-3 shadow-lg
                  flex items-center gap-2.5 transition-all duration-300
                  ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
    >
      {ICONS[type]}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
