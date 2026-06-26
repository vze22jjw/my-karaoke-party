"use client";

import { useLocale } from 'next-intl';
import { usePathname } from '~/navigation';
import { Button } from './ui/ui/button';
import { useState, useRef, useEffect } from 'react';
import { Check, Globe, ChevronUp } from 'lucide-react';
import { cn } from '~/lib/utils';

const LANGUAGES = [
  { code: 'en', label: 'English', flags: ['https://flagcdn.com/gb.svg', 'https://flagcdn.com/us.svg'] },
  { code: 'pt', label: 'Português', flags: ['https://flagcdn.com/br.svg'] },
  { code: 'es', label: 'Español', flags: ['https://flagcdn.com/es.svg'] },
  { code: 'zh', label: '简体中文', flags: ['https://flagcdn.com/cn.svg'] },
] as const;

type Locale = typeof LANGUAGES[number]['code'];

export function LanguageSwitcher() {
  const locale = useLocale();
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('user-locale-preference', code);
    }
    const newPath = `/${code}${pathname}`;
    window.location.href = newPath;
    setIsOpen(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === locale);

  return (
    <div className="relative" ref={containerRef}>
      
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-44 rounded-lg border border-white/10 bg-black/90 p-1 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 z-50">
          <div className="flex flex-col gap-1">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors hover:bg-white/10 text-white/90 hover:text-white text-left w-full gap-2",
                  locale === lang.code ? "bg-white/5 text-white" : ""
                )}
              >
                <span className="flex items-center gap-2 overflow-hidden">
                  <span className="flex items-center gap-1 shrink-0">
                    {lang.flags.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={lang.label}
                        className="object-cover rounded-[1px] border border-white/10"
                        style={{ width: '16px', height: '11px' }}
                      />
                    ))}
                  </span>
                  <span className="truncate">{lang.label}</span>
                </span>
                {locale === lang.code && <Check className="h-3 w-3 text-primary shrink-0" />}
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
