import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";

const intlMiddleware = createMiddleware({
  locales: ['en', 'pt', 'es', 'zh', 'ja', 'fr'],
  defaultLocale: env.NEXT_PUBLIC_DEFAULT_LOCALE,
  localePrefix: 'always' 
});

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Intercept playwright report requests
  if (pathname.startsWith('/reports')) {
    const serveReports = env.SERVE_PLAYWRIGHT_REPORTS === 'true';
    if (!serveReports) {
      return new NextResponse("Not Found", { status: 404 });
    }
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel).*)', '/reports/:path*']
};
