import React from "react";
import { Badge } from "@/components/shared";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { ProposalResponse } from "@/types/proposals/dto";
import { ProposalDropdownMenu } from "./proposal-dropdown-menu";

interface ProposalListProps {
  proposals: ProposalResponse[];
  onDeleteProposal?: (proposalId: string) => void;
  isDeleting?: boolean;
}

export function ProposalList({ proposals, onDeleteProposal, isDeleting }: ProposalListProps) {
  const handleDelete = (proposalId: string) => {
    if (onDeleteProposal) {
      onDeleteProposal(proposalId);
    }
  };

  if (proposals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" strokeWidth={1} />
        <h3 className="text-lg font-medium">No proposals found</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          You haven't created any proposals yet or none match your search.
        </p>
        <Link
          href="/proposals/create"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90"
        >
          Create Your First Proposal
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border overflow-hidden shadow-sm">
        {proposals.map((proposal, index) => (
          <div
            key={proposal.id}
            className={[
              "relative flex p-5 transition-colors hover:bg-accent/30",
              index !== proposals.length - 1 ? "border-b" : "",
              index % 2 === 0 ? "bg-background" : "bg-muted/20",
            ].join(" ")}
          >
            <Link href={`/proposals/${proposal.id}`} className="flex gap-5 flex-1 pr-10">
              <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0 border">
                <Image
                  src={proposal.image || "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b"}
                  alt={proposal.name}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium mb-1">{proposal.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {proposal.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-2">
                  {proposal.template?.trades?.map((trade) => (
                    <Badge key={trade.id} variant="secondary" className="text-xs">
                      {trade.name}
                    </Badge>
                  ))}
                </div>

                {proposal.template?.variables && proposal.template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {proposal.template?.variables?.slice(0, 3).map((variable) => (
                      <Badge key={variable.id} variant="outline" className="text-xs">
                        {variable.name}
                      </Badge>
                    ))}
                    {proposal.template?.variables && proposal.template.variables.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{proposal.template?.variables?.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(proposal.updated_at), "MM/dd/yyyy")}
              </div>
            </Link>

            {/* Positioned dropdown menu */}
            <div className="absolute top-4 right-4">
              <ProposalDropdownMenu
                proposalId={proposal.id}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
