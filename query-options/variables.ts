import { getAllVariables } from "@/api-calls/variables/get-all-variables";
import { queryOptions } from "@tanstack/react-query";

export function getVariables(page = 1, pageSize = 10, searchQuery?: string) {
  return queryOptions({
    queryKey: ["variables", page, pageSize, searchQuery],
    queryFn: () => getAllVariables(page, pageSize, searchQuery),
    staleTime: searchQuery && searchQuery.length > 0 
      ? 5 * 60 * 1000 // 5 minutes for search results - less critical for real-time updates
      : 2 * 60 * 1000, // 2 minutes for regular listing - variables are frequently edited during proposal creation
  });
}
