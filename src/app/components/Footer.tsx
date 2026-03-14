import Link from "next/link";

export default function Footer() {
  return (
    <footer className="pb-20 pt-6 px-4">
      <div className="max-w-lg mx-auto border-t border-border pt-4">
        <div className="flex items-center justify-center gap-4 text-xs text-muted">
          <Link href="/privacy" className="hover:text-primary transition-colors">
            プライバシーポリシー
          </Link>
          <span className="text-border">|</span>
          <Link href="/terms" className="hover:text-primary transition-colors">
            利用規約
          </Link>
        </div>
        <p className="text-center text-[10px] text-muted/60 mt-2">
          &copy; 2026 カゴトク
        </p>
      </div>
    </footer>
  );
}
