import { getAllElements } from "@/api-calls/elements/get-all-elements";
import { queryOptions } from "@tanstack/react-query";

export function getElements(page = 1, pageSize = 10, searchQuery?: string) {
  return queryOptions({
    queryKey: ["elements", page, pageSize, searchQuery],
    queryFn: () => getAllElements(page, pageSize, searchQuery),
    staleTime: searchQuery && searchQuery.length > 0 
      ? 5 * 60 * 1000 // 5 minutes for search results - less critical for real-time updates
      : 2 * 60 * 1000, // 2 minutes for regular listing - elements are frequently edited during proposal creation
  });
}
