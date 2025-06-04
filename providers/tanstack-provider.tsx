"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

interface TanstackProviderProps {
  children: React.ReactNode;
}

export const TanstackProvider = ({ children }: TanstackProviderProps) => {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Global defaults for maximum performance
        staleTime: 1 * 60 * 1000, // 1 minute default staleTime
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time (formerly cacheTime)
        refetchOnWindowFocus: false, // Disable refetch on window focus for better UX
        refetchOnReconnect: true, // Keep refetch on reconnect for data consistency
        retry: (failureCount, error) => {
          // Smart retry logic: retry network errors but not 4xx errors
          if (failureCount >= 2) return false;
          if (error instanceof Error && error.message.includes('4')) return false;
          return true;
        },
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};