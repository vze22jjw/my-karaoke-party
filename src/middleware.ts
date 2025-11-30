import createMiddleware from 'next-intl/middleware';
import { env } from "~/env"; // Import env

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['en', 'pt'],

  // FIX: Use env var for default locale
  defaultLocale: env.NEXT_PUBLIC_DEFAULT_LOCALE,
  
  // Optional: Always redirect to /en or /pt
  localePrefix: 'always' 
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
