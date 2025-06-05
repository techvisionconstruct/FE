"use client";

import React, { useState, useEffect } from "react";
import { Card, Tabs, TabsContent, Button } from "@/components/shared";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, HelpCircle, ArrowLeft } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// Import components from create template page
import TemplateDetailsStep from "@/components/features/create-template-page/template-details-step";
import TradesAndElementsStep from "@/components/features/create-template-page/template-and-elements-step";
import PreviewStep from "@/components/features/create-template-page/preview-step";
import StepIndicator from "@/components/features/create-template-page/step-indicator";

// Import types and APIs
import {
  TemplateCreateRequest,
  TemplateUpdateRequest,
} from "@/types/templates/dto";
import { TradeResponse } from "@/types/trades/dto";
import { VariableResponse } from "@/types/variables/dto";
import { updateTemplate } from "@/api-calls/templates/update-template";
import { updateVariable } from "@/api-calls/variables/update-variable";
import { getTemplate } from "@/query-options/templates";

export default function EditTemplate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const templateId = Array.isArray(id) ? id[0] : (id as string);

  const [currentStep, setCurrentStep] = useState<string>("details");
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<TemplateCreateRequest>({
    name: "",
    description: "",
    image: undefined,
    status: "draft",
    is_public: false,
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

  // Fetch template data
  const {
    data: templateData,
    isLoading: isTemplateLoading,
    isError: isTemplateError,
  } = useQuery(getTemplate(templateId));

  // Initialize form with template data when it's loaded
  useEffect(() => {
    if (templateData) {
      console.log("Loading template data for edit:", templateData);

      // Store original image URL and reset image changed flag
      setOriginalImageUrl(templateData.image);
      setImageChanged(false); // Reset on data load

      setFormData({
        name: templateData.name || "",
        description: templateData.description || "",
        image: templateData.image, // Keep original URL format
        status: templateData.status || "draft",
        is_public: templateData.is_public || false,
      });

      if (templateData.trades && Array.isArray(templateData.trades)) {
        console.log("Setting trades:", templateData.trades);
        setTradeObjects(templateData.trades);
      }

      if (templateData.variables && Array.isArray(templateData.variables)) {
        console.log("Setting variables:", templateData.variables);
        setVariableObjects(templateData.variables);
      }
    }
  }, [templateData]);

  const updateFormData = (field: string, data: any) => {
    console.log("Updating form data:", field, data);

    // Check if image has been changed - only mark as changed if it's different from original
    if (data.image !== undefined) {
      const newImage = data.image;
      // Consider empty string as a change (image removal)
      const hasChanged = newImage !== originalImageUrl || newImage === "";
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

  const handleNext = () => {
    if (currentStep === "details") {
      setCurrentStep("trades");
    } else if (currentStep === "trades") {
      setCurrentStep("preview");
    }
  };

  const handleBack = () => {
    if (currentStep === "trades") {
      setCurrentStep("details");
    } else if (currentStep === "preview") {
      setCurrentStep("trades");
    }
  };

  // Update template mutation with better error handling and logging
  const updateTemplateMutation = useMutation({
    mutationFn: (updateData: TemplateUpdateRequest) => {
      console.log("Calling updateTemplate API with:", {
        templateId,
        updateData,
      });
      return updateTemplate(templateId, updateData);
    },
    onSuccess: (response) => {
      console.log("Template update response:", response);
      toast.success("Template updated successfully!", {
        description: "Your changes have been saved",
      });

      // Invalidate the template query to refresh data
      queryClient.invalidateQueries({ queryKey: ["template", templateId] });

      handleNext();
    },
    onError: (error: any) => {
      console.error("Template update error:", error);
      toast.error("Failed to update template", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    },
  });

  // Publish template mutation with better structure
  const publishTemplateMutation = useMutation({
    mutationFn: (updateData: TemplateUpdateRequest) => {
      console.log("Publishing template with data:", updateData);
      return updateTemplate(templateId, updateData);
    },
    onSuccess: (response) => {
      console.log("Template publish response:", response);
      toast.success("Template published successfully!", {
        description: "Your template is now available",
      });

      // Invalidate the template query to refresh data
      queryClient.invalidateQueries({ queryKey: ["template", templateId] });

      // After successful publish, redirect to template view page
      setTimeout(() => {
        router.push(`/templates/${templateId}`);
      }, 1500);
    },
    onError: (error: any) => {
      console.error("Template publish error:", error);
      toast.error("Failed to publish template", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    },
  });
  // New function to update variable descriptions
  const updateVariableDescriptions = async (variables: VariableResponse[]) => {
    console.log("Updating variable descriptions...");

    // Create an array of promises for each variable update
    const updatePromises = variables.map(async (variable) => {
      if (variable.id && variable.description !== undefined) {
        try {
          console.log(
            `Updating variable ${variable.id} with description: ${variable.description}`
          );
          await updateVariable(variable.id, {
            description: variable.description,
          });
          return { id: variable.id, success: true };
        } catch (error) {
          console.error(`Error updating variable ${variable.id}:`, error);
          return { id: variable.id, success: false, error };
        }
      }
      return { id: variable.id, success: false, skipped: true };
    });

    // Wait for all updates to complete
    return Promise.all(updatePromises);
  };

  const handleUpdateTemplate = async (step = currentStep) => {
    if (!templateId) {
      toast.error("Template ID is missing");
      return Promise.reject("Template ID is missing");
    }

    console.log("Current form data before update:", formData);
    console.log("Current trades before update:", tradeObjects);
    console.log("Current variables before update:", variableObjects);
    console.log("Image changed:", imageChanged);

    setIsLoading(true);

    // First update any variables that have descriptions
    if (variableObjects && variableObjects.length > 0) {
      try {
        const variableUpdateResults = await updateVariableDescriptions(
          variableObjects
        );
        console.log("Variable update results:", variableUpdateResults);
      } catch (error) {
        console.error("Error updating variable descriptions:", error);
        toast.error("Some variable descriptions could not be updated");
      }
    }

    // Prepare update data - only include image if it was actually changed
    const updateData: TemplateUpdateRequest = {
      name: formData.name || "",
      description: formData.description || "",
      trades: tradeObjects.map((trade) => trade.id).filter(Boolean),
      variables: variableObjects.map((variable) => variable.id).filter(Boolean),
      status: formData.status || "draft",
      is_public: formData.is_public || false,
    };

    // Only include image in update if it was actually changed AND it's base64 data
    if (imageChanged) {
      if (formData.image === "") {
        // Image was explicitly removed
        updateData.image = ""; // or "" depending on what your API expects for removal
        console.log("Removing image");
      } else if (formData.image && formData.image.startsWith("data:")) {
        // New image was uploaded
        updateData.image = formData.image;
        console.log("Including changed image in update (base64)");
      }
    } else {
      console.log("Skipping image update - not changed");
    }

    console.log("Final update data being sent:", updateData);

    updateTemplateMutation.mutate(updateData, {
      onSettled: () => {
        setIsLoading(false);
      },
    });
  };
  const handlePublishTemplate = async () => {
    if (!templateId) {
      toast.error("Template ID is missing");
      return Promise.reject("Template ID is missing");
    }

    console.log("Publishing template with form data:", formData);
    console.log("Publishing template with trades:", tradeObjects);
    console.log("Publishing template with variables:", variableObjects);
    console.log("Image changed:", imageChanged);

    setIsLoading(true);

    // First update any variables that have descriptions
    if (variableObjects && variableObjects.length > 0) {
      try {
        const variableUpdateResults = await updateVariableDescriptions(
          variableObjects
        );
        console.log(
          "Variable update results (publish flow):",
          variableUpdateResults
        );
      } catch (error) {
        console.error(
          "Error updating variable descriptions during publish:",
          error
        );
        toast.error("Some variable descriptions could not be updated");
      }
    }

    // Prepare data for publishing - only include image if it was actually changed
    const updateData: TemplateUpdateRequest = {
      name: formData.name || "",
      description: formData.description || "",
      trades: tradeObjects.map((trade) => trade.id).filter(Boolean),
      variables: variableObjects.map((variable) => variable.id).filter(Boolean),
      status: "published",
      is_public: formData.is_public || false,
    };

    // Only include image in update if it was actually changed AND it's base64 data
    if (imageChanged && formData.image && formData.image.startsWith("data:")) {
      updateData.image = formData.image;
      console.log("Including changed image in publish (base64)");
    } else {
      console.log("Skipping image update - not changed or not base64");
    }

    console.log("Final publish data being sent:", updateData);

    publishTemplateMutation.mutate(updateData, {
      onSettled: () => {
        setIsLoading(false);
      },
    });
  };

  if (isTemplateLoading) {
    return (
      <div className="container flex items-center justify-center min-h-[400px]">
        <LoaderCircle className="mr-2 h-6 w-6 animate-spin" />
        <span>Loading template data...</span>
      </div>
    );
  }

  if (isTemplateError) {
    return (
      <div className="container">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg text-center">
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Error Loading Template
          </h2>
          <p className="text-red-700 mb-4">
            Unable to load the template data. It may have been deleted or you
            don't have permission to view it.
          </p>
          <Link href="/templates" className="text-blue-600 hover:underline">
            Return to Templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href={`/templates/${templateId}`}
          className="flex items-center text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Template
        </Link>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-bold">
          {templateData?.name || "Edit Template"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {templateData?.description ||
            "Update your template design and configuration"}
        </p>
      </div>

      <Card className="w-full">
        <div className="w-full mx-auto pl-6 pr-8 py-6 border-b">
          <StepIndicator
            steps={["Template Details", "Trades & Elements", "Preview"]}
            currentStep={
              currentStep === "details" ? 0 : currentStep === "trades" ? 1 : 2
            }
          />
        </div>

        <Tabs value={currentStep} className="w-full">
          <TabsContent value="details" className="p-6 details-tab-content">
            <TemplateDetailsStep
              data={{
                name: formData.name,
                description: formData.description || "",
                image: formData.image,
              }}
              updateData={(data) => {
                console.log("Template details being updated:", data);
                updateFormData("details", data);
              }}
            />
            <div className="flex justify-end mt-6">
              <Button
                onClick={() => handleUpdateTemplate("details")}
                disabled={isLoading || !formData.name?.trim()}
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Next: Trades & Elements"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="trades" className="p-6 trades-tab-content">
            <TradesAndElementsStep
              data={{
                trades: tradeObjects,
                variables: variableObjects,
              }}
              updateTrades={(trades) => {
                console.log("Trades being updated:", trades);
                setTradeObjects(trades);
                // Also update form data to ensure consistency
                setFormData((prev) => ({
                  ...prev,
                  trades: trades.map((trade) => trade.id),
                }));
              }}
              updateVariables={(variables) => {
                console.log("Variables being updated:", variables);
                setVariableObjects(variables);
                // Also update form data to ensure consistency
                setFormData((prev) => ({
                  ...prev,
                  variables: variables.map((variable) => variable.id),
                }));
              }}
            />
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={() => handleUpdateTemplate()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Next: Preview"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="p-6 preview-tab-content">
            <PreviewStep
              data={formData}
              tradeObjects={tradeObjects}
              variableObjects={variableObjects}
            />
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/templates/${templateId}`)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePublishTemplate}
                  disabled={isLoading || !formData.name?.trim()}
                >
                  {isLoading ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : formData.status === "published" ? (
                    "Update Template"
                  ) : (
                    "Publish Template"
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
