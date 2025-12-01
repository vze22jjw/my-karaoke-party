"use client";

import { usePathname } from "~/navigation";
import { LanguageSwitcher } from "~/components/language-switcher";
import { Link } from "~/navigation";
import { env } from "~/env";
import { cn } from "~/lib/utils";

export function GlobalFooter() {
  const pathname = usePathname();

  if (pathname?.includes("/player")) {
    return null;
  }
  const isHomePage = pathname === "/" || pathname === "/en" || pathname === "/pt";

  return (
    <footer 
      className={cn(
        "fixed bottom-4 z-50 flex items-center bg-black/20 backdrop-blur-sm p-1 rounded-full border border-white/5 shadow-sm transition-all right-4"
      )}
    >
      <LanguageSwitcher />

      {isHomePage && (
        <div className="flex items-center animate-in fade-in slide-in-from-right-2">
          <div className="h-4 w-[1px] bg-white/20 mx-1" />
          <Link 
            href="/about" 
            className="text-xs text-white/50 hover:text-white hover:underline transition-colors font-mono mr-3"
            aria-label="View App Information"
          >
            v{env.NEXT_PUBLIC_MKP_APP_VER}
          </Link>
        </div>
      )}
    </footer>
  );
}
