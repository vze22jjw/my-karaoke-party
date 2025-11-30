"use client";

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '~/navigation';
import { Button } from './ui/ui/button';
import { useState, useRef, useEffect } from 'react';
import { Check, Globe, ChevronUp } from 'lucide-react';
import { cn } from '~/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧🇺🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
] as const;

type Locale = typeof LANGUAGES[number]['code'];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const switchLanguage = (code: Locale) => {
    router.replace(pathname, { locale: code });
    setIsOpen(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === locale);

  return (
    <div className="relative" ref={containerRef}>
      
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-40 rounded-lg border border-white/10 bg-black/90 p-1 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 z-50">
          <div className="flex flex-col gap-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors hover:bg-white/10 text-white/90 hover:text-white text-left w-full",
                  locale === lang.code ? "bg-white/5 text-white" : ""
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
                {locale === lang.code && <Check className="h-3 w-3 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <Button 
        onClick={() => setIsOpen(!isOpen)} 
        variant="ghost" 
        size="sm" 
        className={cn(
            "text-white/80 hover:text-white font-medium gap-2 h-8 px-2", 
            isOpen && "bg-white/10 text-white"
        )}
        title="Change Language"
      >
        <Globe className="h-4 w-4" />
        <span>{currentLang?.code.toUpperCase()}</span>
        <ChevronUp className={cn("h-3 w-3 transition-transform duration-200", isOpen ? "rotate-180" : "")} />
      </Button>
    </div>
  );
}
