"use client";

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '~/navigation';
import { Button } from './ui/ui/button';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggle = () => {
    const nextLocale = locale === 'en' ? 'pt' : 'en';
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Button onClick={toggle} variant="ghost" size="sm" className="text-white/80 hover:text-white">
      {locale === 'en' ? '🇧🇷 PT' : '🇺🇸 EN'}
    </Button>
  );
}
