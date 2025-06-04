import { getAllContracts } from "@/api-calls/contracts/get-all-contracts";
import { getContractById } from "@/api-calls/contracts/get-contract-by-id";
import { queryOptions } from "@tanstack/react-query";

export function getContracts(page = 1, pageSize = 10, searchQuery?: string) {
  return queryOptions({
    queryKey: ["contract", page, pageSize, searchQuery],
    queryFn: () => getAllContracts(page, pageSize, searchQuery),
    staleTime: 1 * 60 * 1000, // 1 minute - contracts are frequently created and updated
  });
}

export function getContract(id: string) {
  return queryOptions({
    queryKey: ["contract", id],
    queryFn: () => getContractById(String(id)),
    select: (data) => data.data,
    staleTime: 30 * 1000, // 30 seconds - individual contracts are actively being edited
  });
}
