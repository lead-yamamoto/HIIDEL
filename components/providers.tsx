"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./theme-provider";
import GoogleAuthChecker from "./GoogleAuthChecker";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <GoogleAuthChecker>{children}</GoogleAuthChecker>
        <Toaster position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}
