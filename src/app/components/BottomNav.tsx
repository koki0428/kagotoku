"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getAlertCount } from "../storage";

const tabs = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/flyer", label: "チラシ", icon: "📰" },
  { href: "/calendar", label: "家計簿", icon: "📅" },
  { href: "/favorites", label: "お気に入り", icon: "💛", hasAlert: true },
  { href: "/map", label: "お店", icon: "🗺️" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    setAlertCount(getAlertCount());
    const interval = setInterval(() => setAlertCount(getAlertCount()), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.3)] z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2.5 text-xs transition-colors relative
                ${active ? "text-primary font-bold" : "text-muted"}`}
            >
              <span className="text-xl mb-0.5 relative">
                {tab.icon}
                {tab.hasAlert && alertCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px]
                                   font-bold w-4 h-4 rounded-full flex items-center justify-center
                                   animate-alert-pulse">
                    {alertCount}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
