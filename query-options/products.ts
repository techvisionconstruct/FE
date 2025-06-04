import { getAllProducts } from "@/api-calls/products/get-all-products";
import { queryOptions } from "@tanstack/react-query";

export function getProducts(page = 1, pageSize = 10, searchQuery?: string) {
  return queryOptions({
    queryKey: ["product", page, pageSize, searchQuery],
    queryFn: () => getAllProducts(page, pageSize, searchQuery),
    staleTime: 10 * 60 * 1000, // 10 minutes - products are relatively static
  });
}