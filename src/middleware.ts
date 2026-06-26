import createMiddleware from 'next-intl/middleware';
import { env } from "~/env";

export default createMiddleware({
  locales: ['en', 'pt', 'es', 'zh', 'ja', 'fr'],

  defaultLocale: env.NEXT_PUBLIC_DEFAULT_LOCALE,
  
  localePrefix: 'always' 
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
