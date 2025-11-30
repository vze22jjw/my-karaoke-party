"use client";

import { usePathname } from "~/navigation";
import { LanguageSwitcher } from "~/components/language-switcher";
import { Link } from "~/navigation";
import { env } from "~/env";

export function GlobalFooter() {
  const pathname = usePathname();

  // Logic: If path includes '/player', returns null (renders nothing)
  if (pathname?.includes("/player")) {
    return null;
  }

  return (
    <footer className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-black/20 backdrop-blur-sm p-2 rounded-full border border-white/5">
      <LanguageSwitcher />
      <div className="h-4 w-[1px] bg-white/20" />
      <Link 
        href="/about" 
        className="text-xs text-white/50 hover:text-white hover:underline transition-colors font-mono mr-2"
        aria-label="View App Information"
      >
        v{env.NEXT_PUBLIC_MKP_APP_VER}
      </Link>
    </footer>
  );
}
