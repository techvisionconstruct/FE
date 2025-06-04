import { getAllProposals } from "@/api-calls/proposals/get-all-proposals";
import { getProposalById } from "@/api-calls/proposals/get-proposal-by-id";
import { queryOptions } from "@tanstack/react-query";

export function getProposals(page = 1, pageSize = 10, searchQuery?: string) {
  return queryOptions({
    queryKey: ["proposal", page, pageSize, searchQuery],
    queryFn: () => getAllProposals(page, pageSize, searchQuery),
    staleTime: 1 * 60 * 1000, // 1 minute - proposals are frequently created and updated
  });
}

export function getProposal(id: string) {
  return queryOptions({
    queryKey: ["proposal", id],
    queryFn: () => getProposalById(String(id)),
    select: (data) => data.data,
    staleTime: 30 * 1000, // 30 seconds - individual proposals are actively being edited
  });
}
