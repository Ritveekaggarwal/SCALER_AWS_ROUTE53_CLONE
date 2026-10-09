"use client";

import "@cloudscape-design/global-styles/index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { FlashProvider } from "@/components/flash";
import { ThemeProvider } from "@/components/theme";

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 10_000 } } }),
  );
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <FlashProvider>{children}</FlashProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
