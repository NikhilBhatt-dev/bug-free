"use client";

import { Toaster } from "sonner";
import { AppProvider } from "@/context/app-context";

export function Providers({ children }) {
  return (
    <AppProvider>
      {children}
      <Toaster theme="dark" position="top-right" richColors />
    </AppProvider>
  );
}
