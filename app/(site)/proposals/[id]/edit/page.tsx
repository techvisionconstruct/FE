"use client";

import React, { useState, useEffect } from "react";
import { Card, Tabs, TabsContent, Button } from "@/components/shared";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, HelpCircle, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// Import components from create proposal page
import TemplateSelectionStep from "@/components/features/create-proposal-page/template-selection-tab";
import ProposalDetailsTab from "@/components/features/create-proposal-page/proposal-details-tab";
import TradesAndElementsStep from "@/components/features/create-proposal-page/trades-and-elements-tab";
import StepIndicator from "@/components/features/create-proposal-page/step-indicator";

// Import types and APIs
import {
  ProposalCreateRequest,
  ProposalUpdateRequest,
} from "@/types/proposals/dto";
import { TradeResponse } from "@/types/trades/dto";
import { VariableResponse } from "@/types/variables/dto";
import { TemplateResponse } from "@/types/templates/dto";
import { updateProposal } from "@/api-calls/proposals/update-proposal";
import { getProposal } from "@/query-options/proposals";

export default function EditProposal() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const proposalId = Array.isArray(id) ? id[0] : (id as string);
  const [currentStep, setCurrentStep] = useState<number>(0); // Changed to number
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    image: string;
    client_name: string;
    client_email: string;
    client_phone: string;
    client_address: string;
    valid_until: string;
    project_location: string;
    status: string;
    template: TemplateResponse | null;
  }>({
    name: "",
    description: "",
    image: "",
    client_name: "",
    client_email: "",
    client_phone: "",
    client_address: "",
    valid_until: "",
    project_location: "",
    status: "draft",
    template: null,
  });

  // Track if image has been changed to know whether to send it
  const [imageChanged, setImageChanged] = useState(false);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | undefined>(
    undefined
  );

  const [tradeObjects, setTradeObjects] = useState<TradeResponse[]>([]);
  const [variableObjects, setVariableObjects] = useState<VariableResponse[]>(
    []
  );

  // Fetch proposal data
  const {
    data: proposalData,
    isLoading: isProposalLoading,
    isError: isProposalError,
  } = useQuery(getProposal(proposalId));

  // Initialize form with proposal data when it's loaded
  useEffect(() => {
    if (proposalData) {
      console.log("Loading proposal data for edit:", proposalData);

      // Store original image URL and reset image changed flag
      setOriginalImageUrl(proposalData.image);
      setImageChanged(false); // Reset on data load

      setFormData({
        name: proposalData.name || "",
        description: proposalData.description || "",
        image: proposalData.image || "", // Keep original URL format
        client_name: proposalData.client_name || "",
        client_email: proposalData.client_email || "",
        client_phone: proposalData.client_phone || "",
        client_address: proposalData.client_address || "",
        project_location: proposalData.project_location || "",
        valid_until: proposalData.valid_until
          ? typeof proposalData.valid_until === "string"
            ? proposalData.valid_until
            : proposalData.valid_until.toISOString()
          : "",
        status: proposalData.status || "draft",
        template: proposalData.template || null,
      });

      if (
        proposalData.template?.trades &&
        Array.isArray(proposalData.template.trades)
      ) {
        console.log("Setting trades:", proposalData.template.trades);
        setTradeObjects(proposalData.template.trades);
      }

      if (
        proposalData.template?.variables &&
        Array.isArray(proposalData.template.variables)
      ) {
        console.log("Setting variables:", proposalData.template.variables);
        setVariableObjects(proposalData.template.variables);
      }
    }
  }, [proposalData]);
  // This function adapts the data updates from ProposalDetailsTab
  const handleProposalDetailsUpdate = (data: any) => {
    console.log("Updating proposal details:", data);

    // Check if image has been changed - only mark as changed if it's different from original
    if (data.image !== undefined) {
      const newImage = data.image;
      const hasChanged = newImage !== originalImageUrl;
      setImageChanged(hasChanged);
      console.log(
        "Image changed:",
        hasChanged,
        "Original:",
        originalImageUrl,
        "New:",
        newImage
      );
    }

    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const updateFormData = (field: string, data: any) => {
    console.log("Updating form data:", field, data);
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const updateTrades = (trades: TradeResponse[]) => {
    setTradeObjects(trades);
  };

  const updateVariables = (variables: VariableResponse[]) => {
    setVariableObjects(variables);
  };

  // Update proposal mutation
  const updateProposalMutation = useMutation({
    mutationFn: (updateData: ProposalUpdateRequest) =>
      updateProposal(proposalId, updateData),
    onSuccess: (data) => {
      console.log("Proposal updated successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposal updated successfully!");
      router.push(`/proposals/${proposalId}`);
    },
    onError: (error: any) => {
      console.error("Failed to update proposal:", error);
      toast.error(
        `Failed to update proposal: ${error.message || "Unknown error"}`
      );
    },
  });
  const handleNext = () => {
    if (currentStep === 0) {
      // details step
      setCurrentStep(1); // go to trades step
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      // trades step
      setCurrentStep(0); // go back to details step
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);

    try {
      console.log("Saving proposal with data:", formData);

      // Prepare update data
      const updateData: ProposalUpdateRequest = {
        name: formData.name,
        description: formData.description,
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        client_address: formData.client_address,
        project_location: formData.project_location,
        valid_until: formData.valid_until
          ? new Date(formData.valid_until)
          : undefined,
        status: formData.status,
      };

      // Only include image if it has been changed
      if (imageChanged && formData.image !== originalImageUrl) {
        updateData.image = formData.image;
      }

      await updateProposalMutation.mutateAsync(updateData);
    } catch (error) {
      console.error("Error in handleFinish:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const getSteps = () => ["Proposal Details", "Trades & Elements"];

  if (isProposalLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderCircle className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading proposal...</span>
      </div>
    );
  }

  if (isProposalError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <HelpCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-destructive">Failed to load proposal</p>
        <Button
          variant="outline"
          onClick={() => router.push("/proposals")}
          className="mt-4"
        >
          Go back to proposals
        </Button>
      </div>
    );
  }

  console.log("formData in EditProposal:", formData);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/proposals/${proposalId}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Proposal</h1>
            <p className="text-muted-foreground">
              Update your proposal details and configurations
            </p>
          </div>
        </div>
      </div>
      {/* Step Indicator */}
      <StepIndicator steps={getSteps()} currentStep={currentStep} />{" "}
      {/* Main Content */}{" "}
      <Card className="w-full">
        <Tabs value={currentStep.toString()} className="w-full">
          {/* Proposal Details Step */}
          <TabsContent value="0" className="space-y-4 p-6">
            <ProposalDetailsTab
              data={{
                name: formData.name,
                description: formData.description,
                image: formData.image,
                client_name: formData.client_name,
                client_email: formData.client_email,
                client_phone: formData.client_phone,
                client_address: formData.client_address,
                valid_until: formData.valid_until,
                project_location: formData.project_location,
              }}
              updateData={handleProposalDetailsUpdate}
            />
            <div className="flex justify-end pt-6">
              <Button onClick={handleNext}>Next: Trades & Elements</Button>
            </div>{" "}
          </TabsContent>

          {/* Trades and Elements Step */}
          <TabsContent value="1" className="space-y-4 p-6">
            <div className="space-y-6">
              <TradesAndElementsStep
                data={{
                  trades: tradeObjects,
                  variables: variableObjects,
                }}
                templateId={formData.template?.id || null}
                template={formData.template}
                updateTrades={updateTrades}
                updateVariables={updateVariables}
              />

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleFinish}
                  disabled={isLoading || updateProposalMutation.isPending}
                  className="min-w-32"
                >
                  {isLoading || updateProposalMutation.isPending ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Proposal"
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
