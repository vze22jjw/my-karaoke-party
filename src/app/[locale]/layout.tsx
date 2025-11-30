import "~/styles/globals.css";
import { TRPCReactProvider } from "~/trpc/react";
import { Roboto_Slab, Roboto_Mono } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AxiomWebVitals } from "next-axiom";
import { Toaster } from "~/components/ui/ui/sonner";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from "next/navigation";
import { env } from "~/env";
import { GlobalFooter } from "~/components/global-footer";

const APP_NAME = "My Karaoke Party";
const APP_DEFAULT_TITLE = "My Karaoke Party";
const APP_TITLE_TEMPLATE = "%s - My Karaoke Party";
const APP_DESCRIPTION = "Host a karaoke party with your friends!";

const roboto_slab = Roboto_Slab({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-slab",
});

const roboto_mono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!['en', 'pt'].includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const showFooter = env.NEXT_PUBLIC_SHOW_FOOTER === "true";

  return (
    <html
      lang={locale}
      data-theme="synthwave"
      className={`theme-custom ${roboto_slab.variable} ${roboto_mono.variable}`}
    >
      <head>
      </head>
      <body className="bg-gradient min-h-screen">
        <NextIntlClientProvider messages={messages}>
            <TRPCReactProvider>{children}</TRPCReactProvider>
            <Analytics />
            <SpeedInsights />
            <AxiomWebVitals />
            <Toaster />
            {showFooter && <GlobalFooter />}

        </NextIntlClientProvider>
      </body>
    </html>
  );
}
