"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getAlertCount } from "../storage";
import { Home, Newspaper, CalendarDays, Heart, MapPin, type LucideIcon } from "lucide-react";

const tabs: { href: string; label: string; icon: LucideIcon; hasAlert?: boolean }[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/flyer", label: "チラシ", icon: Newspaper },
  { href: "/calendar", label: "家計簿", icon: CalendarDays },
  { href: "/favorites", label: "お気に入り", icon: Heart, hasAlert: true },
  { href: "/map", label: "お店", icon: MapPin },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-[0_-2px_8px_rgba(0,0,0,0.06)] z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2.5 text-xs transition-colors relative
                ${active ? "text-primary font-bold" : "text-muted"}`}
            >
              <span className="mb-0.5 relative">
                <Icon className="w-5 h-5" />
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
