"use client";

import React from "react";
import { getProposalById } from "@/api-calls/proposals/get-proposal-by-id";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ProposalDetails } from "@/components/features/client/proposal-details";
import { ContractDetails } from "@/components/features/client/contract-details";
import { ProposalDetailedLoader } from "@/components/features/client/loader-detailed";

export default function ProposalById() {
  const { id } = useParams();
  const proposal = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => getProposalById(String(id)),
    refetchOnWindowFocus: true,
  });

  if (proposal.isLoading) {
    return <ProposalDetailedLoader />;
  }

  if (proposal.isError) {
    return (
      <div className="p-0 mx-auto max-w-7xl">
        <div className="flex items-center justify-center p-8 rounded-xl border border-red-200 bg-red-50/70 my-8">
          <div className="text-red-500 flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Error loading proposal details. Please try again later.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-12 pb-16">
      {proposal?.data && (
        <>
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
              <div className="flex items-center">
                <span className="h-5 w-1.5 bg-primary rounded-full mr-3"></span>
                <h2 className="text-xl font-semibold text-gray-800">
                  Proposal Details
                </h2>
              </div>
            </div>
            <div className="p-6">
              <ProposalDetails proposal={proposal?.data.data} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
              <div className="flex items-center">
                <span className="h-5 w-1.5 bg-primary rounded-full mr-3"></span>
                <h2 className="text-xl font-semibold text-gray-800">
                  Contract Details
                </h2>
              </div>
            </div>
            <div className="p-6">
              <ContractDetails proposal={proposal?.data.data} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
