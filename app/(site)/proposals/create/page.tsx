"use client";

import React, { useState } from "react";
import {
  Card,
  Tabs,
  TabsContent,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/shared";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { redirect, useRouter } from "next/navigation";
import { Send } from "lucide-react";

// Import our step components
import TemplateSelectionStep from "@/components/features/create-proposal-page/template-selection-tab";
import ProposalDetailsStep from "@/components/features/create-proposal-page/proposal-details-tab";
import TradesAndElementsStep from "@/components/features/create-proposal-page/trades-and-elements-tab";
import StepIndicator from "@/components/features/create-proposal-page/step-indicator";

import { createProposal } from "@/api-calls/proposals/create-proposal";
import { updateTemplate } from "@/api-calls/templates/update-template";
import { updateProposal } from "@/api-calls/proposals/update-proposal";
import { TradeResponse } from "@/types/trades/dto";
import { VariableResponse } from "@/types/variables/dto";
import { TemplateResponse, TemplateUpdateRequest } from "@/types/templates/dto";
import { ProposalResponse } from "@/types/proposals/dto";
import { CreateContract } from "@/components/features/create-proposal-page/create-contract";
import { createContract } from "@/api-calls/contracts/create-contract";
import { ContractCreateRequest } from "@/types/contracts/dto";
import { getProposalById } from "@/api-calls/proposals/get-proposal-by-id";
import { validateAllProposalFields } from "@/components/features/create-proposal-page/components/validation";

interface ProposalDetailsProps {
  proposal?: ProposalResponse;
}

export default function CreateProposalPage({ proposal }: ProposalDetailsProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<string>("template");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [contractId, setContractId] = useState<string>("");
  const [template, setTemplate] = useState<TemplateResponse | null>(null);
  const [createdProposal, setCreatedProposal] = useState<ProposalResponse>();
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>(
    {}
  );

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    image: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    valid_until: string;
    location: string;
    status: string;
    template: TemplateResponse | null;
  }>({
    name: proposal?.name || "",
    description: proposal?.description || "",
    image: proposal?.image || "",
    client_name: proposal?.client_name || "",
    client_email: proposal?.client_email || "",
    client_phone: proposal?.client_phone || "",
    client_address: proposal?.client_address || "",
    valid_until: proposal?.valid_until
      ? typeof proposal.valid_until === "string"
        ? proposal.valid_until
        : proposal.valid_until.toISOString()
      : "",
    location: "",
    status: proposal?.status || "draft",
    template: proposal?.template || null,
  });

  const [tradeObjects, setTradeObjects] = useState<TradeResponse[]>(
    proposal?.template?.trades || []
  );
  const [variableObjects, setVariableObjects] = useState<VariableResponse[]>(
    proposal?.template?.variables || []
  );

  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [showMissingVariablesDialog, setShowMissingVariablesDialog] =
    useState(false);

  const updateFormData = (data: any) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const validateVariables = () => {
    const usedVariableIds = new Set<string>();

    // Collect all variable IDs used in elements
    tradeObjects.forEach((trade) => {
      trade.elements?.forEach((element) => {
        element.material_formula_variables?.forEach((variable) =>
          usedVariableIds.add(variable.id)
        );
        element.labor_formula_variables?.forEach((variable) =>
          usedVariableIds.add(variable.id)
        );
      });
    });

    // Check if all used variables are in the variable list
    const missing = Array.from(usedVariableIds).filter(
      (id) => !variableObjects.some((variable) => variable.id === id)
    );

    if (missing.length > 0) {
      setMissingVariables(
        missing.map(
          (id) =>
            tradeObjects
              .flatMap((trade) =>
                trade.elements?.flatMap((element) =>
                  element.material_formula_variables
                    ?.concat(element.labor_formula_variables || [])
                    .filter((variable) => variable.id === id)
                )
              )
              .find((variable) => variable?.id === id)?.name ||
            "Unknown Variable"
        )
      );
      setShowMissingVariablesDialog(true);
      return false;
    }

    return true;
  };

  const handleNext = async () => {
    if (currentStep === "details") {
      // Use the shared validation function
      const errors = validateAllProposalFields(formData);
      setDetailsErrors(errors);
      if (Object.keys(errors).length > 0) {
        toast.error("Please fill in all required fields correctly", {
          position: "top-center",
          description:
            "Check the highlighted fields and correct any errors before proceeding",
        });
        return;
      }
      setCurrentStep("trades");
    } else if (currentStep === "template") {
      setCurrentStep("details");
    } else if (currentStep === "trades") {
      try {
        await handleUpdateTemplate();
        if (createdProposal?.id) {
          const updatedProposal = await getProposalById(createdProposal.id);
          setCreatedProposal(updatedProposal.data);
        }
        setCurrentStep("contract");
      } catch (error) {
        console.error("Error updating template:", error);
        toast.error("Failed to update template before proceeding", {
          position: "top-center",
          description:
            "There was an error updating the template. Please try again.",
        });
      }
    }
  };
  const handleUpdateProposal = async () => {
    if (!createdProposal?.id) {
      toast.error("No proposal to update", {
        position: "top-center",
        description:
          "Unable to find the proposal to update. Please try creating a new proposal.",
      });
      return;
    }

    const updatedProposalDetails = {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      image: formData.image,
      client_name: formData.client_name,
      client_email: formData.client_email,
      client_phone: formData.client_phone,
      client_address: formData.client_address,
      valid_until: formData.valid_until,
      location: formData.location,
      template: formData.template?.id || null,
    };

    return new Promise((resolve, reject) => {
      updateProposalMutation.mutate(
        {
          proposalId: createdProposal.id,
          proposal: updatedProposalDetails,
        },
        {
          onSuccess: async (data) => {
            try {
              const updatedProposal = await getProposalById(createdProposal.id);
              setCreatedProposal(updatedProposal.data);
              handleNext();
              resolve(data);
            } catch (error) {
              console.error("Error refreshing proposal:", error);
              handleNext();
              resolve(data);
            }
          },
          onError: (error) => {
            console.error("Error updating proposal:", error);
            reject(error);
          },
        }
      );
    });
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("template");
    } else if (currentStep === "trades") {
      setCurrentStep("details");
    } else if (currentStep === "contract") {
      setCurrentStep("trades");
    }
  };

  const createProposalMutation = useMutation({
    mutationFn: createProposal,
    onSuccess: () => {
      // Removed duplicate toast.success here
    },
    onError: (error: any) => {
      toast.error("Failed to create proposal", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    },
  });

  const createContractMutation = useMutation({
    mutationFn: (contractData: ContractCreateRequest) =>
      createContract(contractData),
    onSuccess: (contractData) => {
      setContractId(contractData.data.id);
      // Removed duplicate toast.success here
    },
    onError: (error: any) => {
      toast.error(
        `Failed to create contract: ${error.message || "Unknown error"}`
      );
    },
  });
  const { mutate: updateTemplateMutation, isPending: isUpdatingTemplate } =
    useMutation({
      mutationFn: (data: {
        templateId: string;
        template: TemplateUpdateRequest;
      }) => updateTemplate(data.templateId, data.template),
      onSuccess: async (data) => {
        toast.success("Template updated successfully");
      },
      onError: (error: any) => {
        toast.error("Failed to update template", {
          description:
            error instanceof Error ? error.message : "Please try again later",
        });
      },
    });

  const updateProposalMutation = useMutation({
    mutationFn: (data: { proposalId: string; proposal: any }) =>
      updateProposal(data.proposalId, data.proposal),
    onSuccess: () => {
      toast.success("Proposal updated successfully!", {
        description: "Your proposal has been saved",
      });
    },
    onError: (error: any) => {
      toast.error("Failed to update proposal", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    },
  });
  console.log("Created Proposal:", createdProposal);
  const handleCreateProposalAndContract = async () => {
    const errors = validateAllProposalFields(formData);
    setDetailsErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields correctly", {
        position: "top-center",
        description:
          "Check the highlighted fields and correct any errors before proceeding",
      });
      return;
    }

    const templateId = formData.template ? formData.template.id : null;

    const proposalDetails = {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      image: formData.image,
      client_name: formData.client_name,
      client_email: formData.client_email,
      client_phone: formData.client_phone,
      client_address: formData.client_address,
      valid_until: formData.valid_until,
      location: formData.location,
      template: templateId || null,
    };

    return new Promise((resolve, reject) => {
      createProposalMutation.mutate(proposalDetails, {
        onSuccess: async (proposalData) => {
          try {
            setTradeObjects(proposalData.data.template.trades);
            setVariableObjects(proposalData.data.template.variables);
            setTemplate(proposalData.data.template);
            setTemplateId(proposalData.data.template.id);
            setCreatedProposal(proposalData.data);

            // Toast for successful proposal creation
            toast.success("Proposal created successfully!");

            const contractDetails = {
              name: proposalData.data.name || "",
              description: proposalData.data.description || "",
              status: proposalData.data.status || undefined,
              contractor_initials: undefined,
              contractor_signature: undefined,
              terms: undefined,
              service_agreement_content: undefined,
              service_agreement_id: undefined,
              proposal_id: proposalData.data.id || undefined,
            };
            createContractMutation.mutate(contractDetails, {
              onSuccess: (contractData) => {
                setContractId(contractData.data.id);
                toast.success("Contract created successfully!");
                resolve(proposalData);
              },
              onError: (error) => {
                toast.error("Failed to create contract", {
                  description:
                    error instanceof Error
                      ? error.message
                      : "Please try again later",
                });
              },
            });
          } catch (error) {
            toast.error("Proposal created but contract creation failed", {
              position: "top-center",
              description:
                "The proposal was created successfully, but there was an error creating the contract",
            });
            resolve(proposalData);
          }
          handleNext();
        },
        onError: (error) => {
          reject(error);
          toast.error("Failed to create proposal", {
            description:
              error instanceof Error ? error.message : "Please try again later",
          });
        },
      });
    });
  };

  const handleUpdateTemplate = async () => {
    if (!templateId) {
      toast.error("Template ID is missing", {
        position: "top-center",
        description: "Unable to find the template to update. Please try again.",
      });
      return Promise.reject("Template ID is missing");
    }

    const tradesAndVariables = {
      trades: tradeObjects.map((trade) => trade.id),
      variables: variableObjects.map((variable) => variable.id),
    };

    return new Promise((resolve, reject) => {
      updateTemplateMutation(
        { templateId, template: tradesAndVariables },
        {
          onSuccess: async (data) => {
            // Wait for proposal refresh here
            if (createdProposal?.id) {
              try {
                const updatedProposal = await getProposalById(
                  createdProposal.id
                );
                setCreatedProposal(updatedProposal.data);
                resolve(data);
              } catch (error) {
                reject(error);
              }
            } else {
              resolve(data);
            }
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });
  };
  const [isSending, setIsSending] = useState(false);
  const [isElementsUpdating, setIsElementsUpdating] = useState(false);
  const sendProposalToClient = async () => {
    const proposalToSend = createdProposal || proposal;
    if (!proposalToSend?.id) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    setIsSending(true);
    try {
      const response = await fetch(`${API_URL}/v1/proposals/send/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proposal_id: proposalToSend.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send proposal");
      }

      alert("Proposal has been sent to the client successfully.");

      router.push("/proposals");
    } catch (error) {
      console.error("Error sending proposal:", error);
      alert(
        error instanceof Error
          ? error.message
          : "An error occurred while sending the proposal."
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container">
      <div className="mb-4">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold">Create New Proposal</h1>
            <p className="text-muted-foreground text-sm">
              Create a new proposal by following the steps below.
            </p>
          </div>
          {(currentStep === "trades" || currentStep === "contract") && (
            <div className="flex flex-row gap-2 justify-end mt-6">
              {currentStep === "trades" && (
                <>
                  <Button
                    onClick={() => {
                      if (!validateVariables()) {
                        setShowMissingVariablesDialog(true); // Show dialog if validation fails
                        return;
                      }
                      handleUpdateTemplate();
                      redirect("/proposals");
                    }}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    variant="outline"
                    className="mb-4"
                    onClick={() => {
                      if (!validateVariables()) {
                        setShowMissingVariablesDialog(true); // Show dialog if validation fails
                        return;
                      }
                      sendProposalToClient();
                    }}
                    disabled={
                      isSending ||
                      (!createdProposal && !proposal) ||
                      !(createdProposal?.client_email || proposal?.client_email)
                    }
                  >
                    {isSending ? (
                      <span className="inline-flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                        Sending...
                      </span>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" /> Send Proposal to
                        Client
                      </>
                    )}
                  </Button>
                </>
              )}

              {currentStep === "contract" && (
                <>
                  {" "}
                  <Button
                    onClick={() => {
                      if (!validateVariables()) {
                        setShowMissingVariablesDialog(true); // Show dialog if validation fails
                        return;
                      }
                      handleUpdateTemplate();
                      redirect("/proposals");
                    }}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    variant="outline"
                    className="mb-4"
                    onClick={() => {
                      sendProposalToClient();
                    }}
                    disabled={
                      isSending ||
                      (!createdProposal && !proposal) ||
                      !(createdProposal?.client_email || proposal?.client_email)
                    }
                  >
                    {isSending ? (
                      <span className="inline-flex items-center">
                        <span className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></span>
                        Sending...
                      </span>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" /> Send Contract to
                        Client
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <Card className="w-full">
        <div className="w-full mx-auto pl-6 pr-8 py-6 border-b">
          <StepIndicator
            steps={[
              "Template Selection",
              "Proposal Details",
              "Trades & Elements",
              "Create Contract",
            ]}
            currentStep={
              currentStep === "template"
                ? 0
                : currentStep === "details"
                ? 1
                : currentStep === "trades"
                ? 2
                : 3
            }
          />
        </div>

        <Tabs value={currentStep} className="w-full">
          <TabsContent value="template" className="p-6 template-tab-content">
            <TemplateSelectionStep
              data={formData.template}
              updateData={(template) => updateFormData({ template })}
            />
            <div className="flex justify-end mt-6">
              <Button onClick={handleNext}>Next: Proposal Details</Button>
            </div>
          </TabsContent>

          <TabsContent value="details" className="p-6 details-tab-content">
            <ProposalDetailsStep
              data={{
                name: formData.name,
                description: formData.description,
                image: formData.image,
                client_name: formData.client_name,
                client_email: formData.client_email,
                client_phone: formData.client_phone,
                client_address: formData.client_address,
                valid_until: formData.valid_until,
                location: formData.location,
              }}
              updateData={(data) => updateFormData(data)}
              errors={detailsErrors}
            />
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>{" "}
              <Button
                onClick={() => {
                  if (createdProposal?.id) {
                    handleUpdateProposal();
                  } else {
                    handleCreateProposalAndContract();
                  }
                }}
                disabled={
                  createProposalMutation.isPending ||
                  createContractMutation.isPending ||
                  updateProposalMutation.isPending
                }
                className="flex items-center gap-2"
              >
                {createProposalMutation.isPending ||
                createContractMutation.isPending ||
                updateProposalMutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    {createdProposal?.id ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  "Next: Trades & Elements"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="trades" className="p-6 trades-tab-content">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 trade-column">
                {/* Trade column contents */}
              </div>
              <div className="variable-column">
                {/* Variable column contents */}
              </div>
            </div>{" "}
            <TradesAndElementsStep
              data={{
                trades: tradeObjects,
                variables: variableObjects,
              }}
              templateId={templateId}
              template={formData.template}
              updateTrades={(trades) => {
                setTradeObjects(trades);
                updateFormData({
                  trades: trades.map((trade) => trade.id),
                });
                // Update the created proposal with the new trades
                if (
                  createdProposal &&
                  createdProposal.template &&
                  createdProposal.template.id
                ) {
                  setCreatedProposal({
                    ...createdProposal,
                    template: {
                      ...createdProposal.template,
                      trades: trades,
                    },
                  });
                }
              }}
              updateVariables={(variables) => {
                setVariableObjects(variables);
                updateFormData({
                  variables: variables.map((variable) => variable.id),
                });
                // Update the created proposal with the new variables
                if (
                  createdProposal &&
                  createdProposal.template &&
                  createdProposal.template.id
                ) {
                  setCreatedProposal({
                    ...createdProposal,
                    template: {
                      ...createdProposal.template,
                      variables: variables,
                    },
                  });
                }
              }}
              onElementsUpdatingChange={setIsElementsUpdating}
            />
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>{" "}
              <Button
                onClick={handleNext}
                disabled={isUpdatingTemplate || isElementsUpdating}
                className="flex items-center gap-2"
              >
                {isUpdatingTemplate || isElementsUpdating ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 mr-2"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />{" "}
                    </svg>
                    {isElementsUpdating
                      ? "Waiting for elements..."
                      : "Updating..."}
                  </>
                ) : (
                  "Next: Create Contract"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="contract" className="p-6 contract-tab-content">
            {/* Only render CreateContract if we have a proposal */}

            <CreateContract
              contract_id={contractId}
              proposal={createdProposal}
            />

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Missing Variables Dialog */}
      {/* <Dialog
        open={showMissingVariablesDialog}
        onOpenChange={setShowMissingVariablesDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Missing Variables</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              The following variables are used in elements but are missing from
              the variable list:
            </p>
            <ul className="mt-2 list-disc pl-5">
              {missingVariables.map((variable, index) => (
                <li key={index}>{variable}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-destructive font-medium">
              Please add these variables to proceed.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMissingVariablesDialog(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                // Add missing variables to the variable list
                const variablesToAdd = tradeObjects
                  .flatMap((trade) =>
                    trade.elements?.flatMap((element) =>
                      element.material_formula_variables
                        ?.concat(element.labor_formula_variables || [])
                        .filter((variable) =>
                          missingVariables.includes(variable.name)
                        )
                    )
                  )
                  .filter(
                    (variable, index, self) =>
                      variable &&
                      !variableObjects.some((v) => v.id === variable.id) &&
                      self.findIndex((v) => v?.id === variable.id) === index
                  );

                if (variablesToAdd.length > 0) {
                  const updatedVariables = [
                    ...variableObjects,
                    ...variablesToAdd,
                  ];
                  setVariableObjects(
                    updatedVariables.filter(
                      (v): v is VariableResponse => v !== undefined
                    )
                  );
                  toast.success(
                    `${variablesToAdd.length} variable(s) added successfully.`
                  );
                }

                setShowMissingVariablesDialog(false);
              }}
            >
              Add Variable/s
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </div>
  );
}
