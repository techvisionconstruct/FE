import { getAllTrades } from "@/api-calls/trades/get-all-trades";
import { queryOptions } from "@tanstack/react-query";

export function getTrades(page = 1, pageSize = 10, searchQuery?: string) {
  return queryOptions({
    queryKey: ["trades", page, pageSize, searchQuery],
    queryFn: () => getAllTrades(page, pageSize, searchQuery),
    staleTime: searchQuery && searchQuery.length > 0 
      ? 8 * 60 * 1000 // 8 minutes for search results - less critical for real-time updates
      : 3 * 60 * 1000, // 3 minutes for regular listing - trades don't change very frequently
  });
}
