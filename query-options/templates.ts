import { getAllTemplates } from "@/api-calls/templates/get-all-templates";
import { getTemplateById } from "@/api-calls/templates/get-template-by-id";
import { queryOptions } from "@tanstack/react-query";

export function getTemplates(page = 1, pageSize = 10, searchQuery?: string) {
  return queryOptions({
    queryKey: ["template", page, pageSize, searchQuery],
    queryFn: () => getAllTemplates(page, pageSize, searchQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes - templates change less frequently
  });
}

export function getTemplate(id: string) {
  return queryOptions({
    queryKey: ["template", id],
    queryFn: () => getTemplateById(String(id)),
    select: (data) => data.data,
    staleTime: 5 * 60 * 1000, // 5 minutes - individual templates change less frequently
  });
}
