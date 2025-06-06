import { getAllProducts } from "@/api-calls/products/get-all-products";
import { queryOptions, infiniteQueryOptions } from "@tanstack/react-query";

export function getProducts(page = 1, pageSize = 10, searchQuery?: string) {
  return queryOptions({
    queryKey: ["product", page, pageSize, searchQuery],
    queryFn: () => getAllProducts(page, pageSize, searchQuery),
    staleTime: 10 * 60 * 1000, // 10 minutes - products are relatively static
  });
}

export function getProductsInfinite(pageSize = 20, searchQuery?: string) {
  return infiniteQueryOptions({
    queryKey: ["products-infinite", pageSize, searchQuery],
    queryFn: ({ pageParam = 1 }) => getAllProducts(pageParam, pageSize, searchQuery),
    getNextPageParam: (lastPage, allPages) => {
      // Check if there are more pages based on API response structure
      if (!lastPage?.data || lastPage.data.length < pageSize) {
        return undefined; // No more pages
      }
      // If we have pagination metadata, use it; otherwise calculate next page
      if (lastPage.meta && lastPage.meta.page < lastPage.meta.pages) {
        return lastPage.meta.page + 1;
      }
      return allPages.length + 1;
    },
    initialPageParam: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes - products are relatively static
  });
}