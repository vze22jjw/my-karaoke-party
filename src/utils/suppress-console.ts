/**
 * Suprime avisos e erros específicos no console durante o desenvolvimento
 * NOTA: Desabilitado em favor do script inline no layout.tsx que executa mais cedo
 */
export function suppressDevelopmentWarnings() {
  // Desabilitado - usando script inline no layout.tsx
  return;

  // Salvar as funções originais
  const originalError = console.error;
  const originalWarn = console.warn;

  // Lista de mensagens para suprimir
  const suppressPatterns = [
    /WebSocket connection.*failed/i,
    /Failed to execute 'postMessage'.*youtube\.com/i,
    /apple-mobile-web-app-capable.*deprecated/i,
    /Error.*eval.*chunk-KZ3GGBVP/i, // Específico do PartySocket
  ];

  // Sobrescrever console.error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    // Converter todos os argumentos para string para análise
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" ");

    const shouldSuppress = suppressPatterns.some((pattern) =>
      pattern.test(message)
    );

    if (!shouldSuppress) {
      originalError.apply(console, args);
    }
  };

  // Sobrescrever console.warn
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.warn = (...args: any[]) => {
    const message = args.map(arg => {
      if (typeof arg === 'string') return arg;
      if (arg instanceof Error) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }).join(" ");

    const shouldSuppress = suppressPatterns.some((pattern) =>
      pattern.test(message)
    );

    if (!shouldSuppress) {
      originalWarn.apply(console, args);
    }
  };

  // Interceptar erros de WebSocket especificamente
  if (window.WebSocket) {
    const OriginalWebSocket = window.WebSocket;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomWebSocket = function(this: any, url: string, protocols?: string | string[]) {
      const ws = new OriginalWebSocket(url, protocols);

      // Suprimir eventos de erro do WebSocket do PartyKit
      ws.addEventListener('error', (event) => {
        if (url.includes('127.0.0.1:1999') || url.includes('partykit')) {
          event.stopImmediatePropagation();
        }
      });

      return ws;
    };

    // Copiar propriedades estáticas
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    Object.setPrototypeOf(CustomWebSocket, OriginalWebSocket);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    CustomWebSocket.prototype = OriginalWebSocket.prototype;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (window as any).WebSocket = CustomWebSocket;
  }
}
