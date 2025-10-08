"use client";

export function ConsoleWrapper({ children }: { children: React.ReactNode }) {
  // O script inline no layout.tsx já cuida da supressão de erros
  return <>{children}</>;
}
