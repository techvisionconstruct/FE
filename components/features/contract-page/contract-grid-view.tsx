import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/shared";
import { FileText, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface ContractGridViewProps {
  contracts: any[];
  proposals?: any[];
  onContractClick?: (contractUuid: string) => void;
}

export function ContractGridView({
  contracts = [],
  proposals = [],
  onContractClick,
}: ContractGridViewProps) {
  console.log("Contracts", contracts);

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText
          className="h-16 w-16 text-muted-foreground mb-4"
          strokeWidth={1}
        />
        <h3 className="text-lg font-medium">No contracts found</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          You haven't created any contracts yet or none match your search.
        </p>
        <Link
          href="/proposals"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90"
        >
          Create Your First Contract
        </Link>
      </div>
    );
  }

  const handleClick = (contract: any) => {
    if (onContractClick) {
      onContractClick(contract.uuid);
    }
  };

  // Helper function to check if a signature exists (text or image)
  const isSignatureProvided = (
    contract: any,
    party: "contractor" | "client"
  ) => {
    // Check flat fields
    if (party === "contractor") {
      if (contract.contractor_initials || contract.contractor_signature)
        return true;
    }
    if (party === "client") {
      if (contract.client_initials || contract.client_signature) return true;
    }

    // Check for older camelCase fallbacks
    if (
      party === "contractor" &&
      (contract.contractorInitials || contract.contractorImage)
    )
      return true;
    if (party === "client" && (contract.clientInitials || contract.clientImage))
      return true;

    // Check in signatures object (optional pattern)
    if (contract.signatures && contract.signatures[party]) {
      return !!contract.signatures[party].value;
    }

    return false;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contracts.map((contract) => {
        const matchingProposal =
          proposals && Array.isArray(proposals)
            ? proposals.find(
                (proposal: any) =>
                  proposal.contract && proposal.contract.id === contract.id
              )
            : undefined;

        return (
          <Card
            key={contract.uuid}
            className="h-full overflow-hidden hover:shadow-md transition-all group cursor-pointer"
            onClick={() => handleClick(contract)}
          >
              <CardHeader className="p-4 pb-3">
                <div className="flex justify-between items-start">
                  <div className="w-full">
                    <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                      {contract.name || "Untitled Contract"}
                    </CardTitle>
                    <CardDescription className="line-clamp-1 mt-1">
                      {matchingProposal && matchingProposal.client_name
                        ? `Client: ${matchingProposal.client_name}`
                        : contract.client_name || "No client specified"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-4">
                {/* Signature Status - Prominent Display */}
                <div className="rounded-lg grid grid-cols-2 gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center gap-2 p-2.5 rounded-md ${
                          isSignatureProvided(contract, "contractor")
                            ? "bg-green-50/80 text-green-700"
                            : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {isSignatureProvided(contract, "contractor") ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/70" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">
                            Contractor
                          </span>
                          <span className="text-xs opacity-80">
                            {isSignatureProvided(contract, "contractor")
                              ? "Signed"
                              : "Pending"}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {`Contractor ${
                        isSignatureProvided(contract, "contractor")
                          ? "Signed"
                          : "Not Signed"
                      }`}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center gap-2 p-2.5 rounded-md ${
                          isSignatureProvided(contract, "client")
                            ? "bg-green-50/80 text-green-700"
                            : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {isSignatureProvided(contract, "client") ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/70" />
                        )}
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">Client</span>
                          <span className="text-xs opacity-80">
                            {isSignatureProvided(contract, "client")
                              ? "Signed"
                              : "Pending"}
                          </span>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {`Client ${
                        isSignatureProvided(contract, "client")
                          ? "Signed"
                          : "Not Signed"
                      }`}
                    </TooltipContent>
                  </Tooltip>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2">
                  {contract.description || "No description provided"}
                </p>
              </CardContent>

              <CardFooter className="p-4 pt-3 flex justify-between items-center border-t bg-muted/5">
                <div className="flex items-center text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                  <span>
                    {contract.contractDate
                      ? formatDistanceToNow(new Date(contract.contractDate), {
                          addSuffix: true,
                        })
                      : "No date"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2.5 hover:bg-primary/10 rounded-full"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">View</span>
                </Button>
              </CardFooter>
            </Card>
        );
      })}
    </div>
  );
}
