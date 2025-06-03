"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent, Alert } from "@/components/shared";
import { ProposalDetails } from "@/components/features/proposal-page/proposal-details";
import { ContractDetails } from "@/components/features/proposal-page/contract-details";
import { ProposalDetailedLoader } from "@/components/features/proposal-page/loader-detailed";
import { getProposal } from "@/query-options/proposals";
import { AlertError } from "@/components/features/alert-error/alert-error";

export default function ProposalById() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>("proposal");

  useEffect(() => {
    if (pathname.includes("/contract")) {
      setActiveTab("contract");
    } else {
      setActiveTab("proposal");
    }
  }, [pathname]);

  const {
    data: proposal,
    isPending,
    isError,
  } = useQuery(getProposal(id as string));

  const handleTabChange = (value: string) => {
    setActiveTab(value);

    if (value === "proposal") {
      router.push(`/proposals/${id}`);
    } else if (value === "contract") {
      router.push(`/proposals/${id}/contract`);
    }
  };

  if (isPending) {
    return <ProposalDetailedLoader />;
  }

  if (isError) {
    return <AlertError resource="proposal" />;
  }
  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="proposal" className="flex-1">
            Proposal Details
          </TabsTrigger>
          <TabsTrigger value="contract" className="flex-1">
            Contract Details
          </TabsTrigger>
        </TabsList>
        <TabsContent value="proposal">
          <ProposalDetails proposal={proposal} />
        </TabsContent>
        <TabsContent value="contract">
          <ContractDetails proposal={proposal} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
