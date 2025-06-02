import React, { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/shared";
import { ConfirmationDialog } from "./confirmation-dialog";
import { ProposalResponse } from "@/types/proposals/dto";
import { replaceVariableIdsWithNames } from "@/helpers/replace-variable-ids-with-names";

interface ProposalDetailsProps {
  proposal: ProposalResponse;
}

export function ProposalDetails({ proposal }: ProposalDetailsProps) {
  const [isSending, setIsSending] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const sendProposalToClient = async () => {
    if (!proposal.id) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    setIsSending(true);
    try {
      const response = await fetch(`${API_URL}/v1/proposals/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposal_id: proposal.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send proposal");
      }

      // Show success message
      alert("Proposal has been sent to the client successfully.");
    } catch (error) {
      console.error("Error sending proposal:", error);
      // Show error message
      alert(
        error instanceof Error
          ? error.message
          : "An error occurred while sending the proposal."
      );
    } finally {
      setIsSending(false);
      setShowConfirmDialog(false);
    }
  };

  const handleSendClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmSend = () => {
    sendProposalToClient();
  };

  const handleCancelSend = () => {
    setShowConfirmDialog(false);
  };

  // State to track which variable types are expanded
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>(
    {}
  );

  return (
    <>
      <ConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelSend}
        onConfirm={handleConfirmSend}
        title="Send Proposal to Client"
        message={`Are you sure you want to send this proposal to ${proposal?.client_name} (${proposal?.client_email})? This action cannot be undone.`}
        confirmText="Send Proposal"
        cancelText="Cancel"
        isLoading={isSending}
      />

      <div className="w-full max-w-8xl relative left-1/2 right-1/2 -translate-x-1/2 h-48 md:h-64 mb-4">
        <img
          src={
            proposal?.image ||
            "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b"
          }
          alt={proposal?.name || "Proposal Image"}
          className="w-full h-full object-cover object-center rounded-2xl shadow"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div className="flex flex-col lg:flex-row lg:items-start gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-bold mb-2 tracking-tight leading-tight">
                {proposal?.name}
              </h2>
              <p className="text-lg text-muted-foreground mb-2">
                {proposal?.description}
              </p>
              {proposal.template?.variables &&
                proposal.template.variables.length > 0 && (
                  <div className="mt-4 w-full">
                    <h3 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                      Variables
                    </h3>
                    {(() => {
                      // Group variables by variable_type name
                      const groupedVariables: Record<
                        string,
                        typeof proposal.template.variables
                      > = {};
                      proposal.template.variables.forEach((variable) => {
                        const typeName =
                          variable.variable_type?.name || "Other";
                        if (!groupedVariables[typeName]) {
                          groupedVariables[typeName] = [];
                        }
                        groupedVariables[typeName].push(variable);
                      });

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-4">
                          {Object.entries(groupedVariables).map(
                            ([typeName, variables]) => {
                              return (
                                <div key={typeName}>
                                  <h4 className="text-sm font-semibold mb-3 text-foreground">
                                    {typeName}
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {(() => {
                                      const isExpanded =
                                        expandedTypes[typeName] || false;
                                      const visibleVariables = isExpanded
                                        ? variables
                                        : variables.slice(0, 3);

                                      return (
                                        <>
                                          {visibleVariables.map((variable) => (
                                            <span
                                              key={variable.id}
                                              className="rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground border transition-colors hover:bg-muted"
                                            >
                                              {variable.name}
                                              {variable.value !== undefined && (
                                                <span className="ml-1 font-normal">
                                                  : {variable.value}{" "}
                                                  {variable.variable_type?.unit}
                                                </span>
                                              )}
                                            </span>
                                          ))}
                                          {variables.length > 3 &&
                                            !isExpanded && (
                                              <button
                                                onClick={() =>
                                                  setExpandedTypes((prev) => ({
                                                    ...prev,
                                                    [typeName]: true,
                                                  }))
                                                }
                                                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 transition-colors hover:bg-primary/20 cursor-pointer"
                                              >
                                                +{variables.length - 3} more
                                              </button>
                                            )}
                                          {isExpanded &&
                                            variables.length > 3 && (
                                              <button
                                                onClick={() =>
                                                  setExpandedTypes((prev) => ({
                                                    ...prev,
                                                    [typeName]: false,
                                                  }))
                                                }
                                                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 transition-colors hover:bg-primary/20 cursor-pointer"
                                              >
                                                Show less
                                              </button>
                                            )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
            </div>
            <div className="w-full lg:w-[380px] flex-shrink-0">
              <Button
                variant="outline"
                className="w-full mb-4"
                onClick={handleSendClick}
                disabled={isSending || !proposal.client_email}
              >
                {isSending ? (
                  <span className="inline-flex items-center">
                    <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Send to Client
                  </>
                )}
              </Button>

              <div className="my-0 p-4 rounded-lg border bg-muted/30">
                <h3 className="text-lg font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                  Client Details
                </h3>
                <div className="grid grid-cols-1 gap-y-2 text-sm">
                  <div>
                    <span className="font-medium">Client Name:</span>{" "}
                    {proposal?.client_name}
                  </div>
                  <div>
                    <span className="font-medium">Client Email:</span>{" "}
                    {proposal?.client_email}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span>{" "}
                    {proposal?.client_phone}
                  </div>
                  <div>
                    <span className="font-medium">Address:</span>{" "}
                    {proposal?.client_address}
                  </div>
                </div>
              </div>

              {/* Total Cost Summary Card */}
              <div className="mt-4 p-4 rounded-lg border bg-primary/10">
                <h3 className="text-lg font-semibold mb-2 text-primary uppercase tracking-wider">
                  Total Estimate
                </h3>
                <div className="text-3xl font-bold text-primary">
                  $ {proposal.total_cost}
                </div>
              </div>
            </div>
          </div>
          {proposal.template?.trades && proposal.template.trades.length > 0 && (
            <div className="mt-8 w-full">
              <h3 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
                Trades
              </h3>
              <div className="flex flex-col gap-4 w-full">
                {proposal.template.trades.map((trade) => {
                  return (
                    <div
                      key={trade.id}
                      className="rounded-lg border border-border bg-muted/40 px-4 py-3 hover:bg-accent/40 transition-colors w-full"
                    >                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          {trade.image ? (
                            <div className="h-10 w-10 overflow-hidden rounded-lg flex-shrink-0">
                              <img 
                                src={trade.image} 
                                alt={trade.name} 
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                          <h4 className="font-medium text-base mb-1">
                            {trade.name}
                          </h4>
                        </div>
                        <div className="text-sm font-medium">Subtotal:</div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {trade.description}
                      </p>
                      {trade.elements && trade.elements.length > 0 && (
                        <div className="mt-2 w-full">
                          <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                            Elements
                          </div>
                          <div className="flex flex-col gap-1 w-full">
                            {trade.elements.map((element) => {
                              return (
                                <div
                                  key={element.id}
                                  className="flex flex-col p-4 rounded border bg-background w-full"
                                >
                                  <div className="flex items-start justify-between">                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">                                        {element.image ? (
                                          <div className="h-9 w-9 overflow-hidden rounded-lg flex-shrink-0">
                                            <img 
                                              src={element.image} 
                                              alt={element.name} 
                                              className="h-full w-full object-cover"
                                            />
                                          </div>
                                        ) : null}
                                        <div className="font-medium text-sm">
                                          {element.name}
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground line-clamp-1">
                                        {element.description}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 ml-2">
                                      <div className="flex items-center gap-2 flex-wrap justify-end">
                                        <span className="inline-block rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground border">
                                          Material: $
                                          {Number(
                                            element.material_cost || 0
                                          ).toFixed(2)}
                                        </span>
                                        <span className="inline-block rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground border">
                                          Labor: $
                                          {Number(
                                            element.labor_cost || 0
                                          ).toFixed(2)}
                                        </span>
                                        <span className="inline-block rounded-full bg-muted px-3 py-0.5 text-xs font-medium text-muted-foreground border">
                                          Markup: {element.markup || 0}%
                                        </span>                                        <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium border border-primary/20 text-primary">
                                          Total: $
                                          {((Number(element.material_cost || 0) +
                                            Number(element.labor_cost || 0)))}                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Formulas (smaller, less prominent) */}
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    {element.material_cost_formula && (
                                      <div className="p-1.5 rounded-md bg-muted/30 border-l border-primary/30">
                                        <div className="text-[10px] uppercase font-medium text-muted-foreground">
                                          Material Formula
                                        </div>
                                        <div className="text-[11px] font-mono tracking-tighter leading-none truncate text-muted-foreground">
                                          {element.material_cost_formula
                                            ? replaceVariableIdsWithNames(
                                                element.material_cost_formula,
                                                proposal.template?.variables ||
                                                  [],
                                                element.material_formula_variables ||
                                                  []
                                              )
                                            : ""}
                                        </div>
                                      </div>
                                    )}
                                    {element.labor_cost_formula && (
                                      <div className="p-1.5 rounded-md bg-muted/30 border-l border-primary/30">
                                        <div className="text-[10px] uppercase font-medium text-muted-foreground">
                                          Labor Formula
                                        </div>
                                        <div className="text-[11px] font-mono tracking-tighter leading-none truncate text-muted-foreground">
                                          {element.labor_cost_formula
                                            ? replaceVariableIdsWithNames(
                                                element.labor_cost_formula,
                                                proposal.template?.variables ||
                                                  [],
                                                element.labor_formula_variables ||
                                                  []
                                              )
                                            : ""}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
