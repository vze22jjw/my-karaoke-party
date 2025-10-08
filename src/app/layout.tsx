import "~/styles/globals.css";

import { TRPCReactProvider } from "~/trpc/react";

import { Roboto_Slab, Roboto_Mono } from "next/font/google";
import { type Metadata, type Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AxiomWebVitals } from "next-axiom";
import { Toaster } from "~/components/ui/ui/sonner";
import { ConsoleWrapper } from "~/components/console-wrapper";

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
    // startUpImage: [],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="synthwave"
      className={`theme-custom ${roboto_slab.variable} ${roboto_mono.variable}`}
    >
      <head>
        {process.env.NODE_ENV === "development" && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  // Salvar referências originais
                  const originalError = console.error;
                  const originalWarn = console.warn;
                  const originalLog = console.log;

                  // Função helper para verificar se deve suprimir
                  function shouldSuppress(args) {
                    try {
                      // Tentar obter a stack trace para identificar a origem
                      const stack = new Error().stack || '';

                      // Suprimir se vier do chunk do PartySocket
                      if (stack.includes('chunk-KZ3GGBVP') || stack.includes('partysocket')) {
                        return true;
                      }

                      // Converter argumentos para string
                      const msg = args.map(a => {
                        if (typeof a === 'string') return a;
                        if (a && typeof a === 'object') {
                          return JSON.stringify(a);
                        }
                        return String(a);
                      }).join(' ');

                      // Lista de padrões para suprimir
                      const patterns = [
                        'WebSocket connection',
                        'ws://127.0.0.1:1999',
                        'partykit',
                        'postMessage',
                        'youtube.com',
                        'Image with src',
                        'has either width or height'
                      ];

                      return patterns.some(pattern => msg.includes(pattern));
                    } catch (e) {
                      return false;
                    }
                  }

                  // Interceptar console.error
                  console.error = function(...args) {
                    if (!shouldSuppress(args)) {
                      originalError.apply(console, args);
                    }
                  };

                  // Interceptar console.warn
                  console.warn = function(...args) {
                    if (!shouldSuppress(args)) {
                      originalWarn.apply(console, args);
                    }
                  };

                  // Interceptar console.log (às vezes os erros vão para o log)
                  console.log = function(...args) {
                    if (!shouldSuppress(args)) {
                      originalLog.apply(console, args);
                    }
                  };

                  // Adicionar um event listener global para erros não capturados
                  window.addEventListener('error', function(e) {
                    if (e.message && (
                      e.message.includes('WebSocket') ||
                      e.message.includes('partykit') ||
                      e.message.includes('127.0.0.1:1999')
                    )) {
                      e.preventDefault();
                      e.stopPropagation();
                      return false;
                    }
                  }, true);
                })();
              `,
            }}
          />
        )}
      </head>
      <body className="bg-gradient min-h-screen">
        <ConsoleWrapper>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Analytics />
          <SpeedInsights />
          <AxiomWebVitals />
          <Toaster />
        </ConsoleWrapper>
      </body>
    </html>
  );
}
