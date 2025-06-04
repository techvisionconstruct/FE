"use client";

import React, { useState } from "react";
import { Card, Tabs, TabsContent, Button } from "@/components/shared";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

// Import tour component
import { CreateTemplateTour } from "@/components/features/tour-guide/create-template-tour";

import TemplateDetailsStep from "@/components/features/create-template-page/template-details-step";
import TradesAndElementsStep from "@/components/features/create-template-page/template-and-elements-step";
import PreviewStep from "@/components/features/create-template-page/preview-step";
import StepIndicator from "@/components/features/create-template-page/step-indicator";
import {
  TemplateCreateRequest,
  TemplateUpdateRequest,
} from "@/types/templates/dto";
import { TradeResponse } from "@/types/trades/dto";
import { VariableResponse } from "@/types/variables/dto";
import { ElementResponse } from "@/types/elements/dto";
import { createTemplate } from "@/api-calls/templates/create-template";
import { updateTemplate } from "@/api-calls/templates/update-template";

export default function CreateTemplate() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<string>("details");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [formData, setFormData] = useState<TemplateCreateRequest>({
    name: "",
    description: "",
    image: undefined,
  });

  const [tradeObjects, setTradeObjects] = useState<TradeResponse[]>([]);
  const [variableObjects, setVariableObjects] = useState<VariableResponse[]>(
    []
  );

  const updateFormData = (field: string, data: any) => {
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

  const createTemplateMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast.success("Template created successfully!", {
        description: "Your template has been saved",
      });
      handleNext();
    },
    onError: (error: any) => {
      toast.error("Failed to create template", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (data: {
      templateId: string;
      template: TemplateUpdateRequest;
    }) => updateTemplate(data.templateId, data.template),
    onSuccess: () => {
      toast.success("Template updated successfully!", {
        description: "Your template has been saved",
      });
      handleNext();
    },
    onError: (error: any) => {
      toast.error("Failed to update template", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    },
  });

  const publishTemplateMutation = useMutation({
    mutationFn: (data: {
      templateId: string;
      template: TemplateUpdateRequest;
    }) => updateTemplate(data.templateId, data.template),
    onSuccess: (data) => {
      toast.success("Template published successfully!", {
        description: "Your template is now available",
      });

      // After successful publish, redirect to template list or view page
      setTimeout(() => {
        router.push("/templates");
      }, 1500);
    },
    onError: (error: any) => {
      toast.error("Failed to publish template", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
    },
  });

  const handleCreateTemplate = async () => {
    setIsLoading(true);

    const templateDetails = {
      name: formData.name,
      description: formData.description,
      image: formData.image,
      status: "draft",
    };

    console.log(
      "Creating template with image:",
      templateDetails.image ? "Yes (base64)" : "No"
    );

    return new Promise((resolve, reject) => {
      createTemplateMutation.mutate(templateDetails, {
        onSuccess: (data) => {
          resolve(data);
          setTemplateId(data.data.id);
          setIsLoading(false);
        },
        onError: (error) => {
          reject(error);
          setIsLoading(false);
          toast.error("Failed to create template", {
            description:
              error instanceof Error ? error.message : "Please try again later",
          });
        },
      });
    });
  };

  // --- Update handleUpdateTemplate to check for missing variables ---
  const handleUpdateTemplate = async (step = currentStep) => {
    if (!templateId) {
      toast.error("Template ID is missing");
      return Promise.reject("Template ID is missing");
    }

    setIsLoading(true);

    const updateData = {
      name: formData.name,
      description: formData.description,
      image: formData.image,
      trades: tradeObjects.map((trade) => trade.id),
      variables: variableObjects.map((variable) => variable.id),
      status: "draft",
    };

    updateTemplateMutation.mutate(
      { templateId, template: updateData },
      {
        onSettled: () => {
          setIsLoading(false);
        },
      }
    );
  };

  const handlePublishTemplate = async () => {
    if (!templateId) {
      toast.error("Template ID is missing");
      return Promise.reject("Template ID is missing");
    }

    setIsLoading(true);

    publishTemplateMutation.mutate(
      {
        templateId,
        template: {
          status: "published",
        },
      },
      {
        onSettled: () => {
          setIsLoading(false);
        },
      }
    );
  };

  // Update startTour function with better CSS class identification
  const startTour = () => {
    try {
      // First ensure we're on the details tab
      setCurrentStep("details");

      console.log("[Tour] Preparing to start template tour");

      // Allow tab switch to happen first
      setTimeout(() => {
        try {
          console.log("[Tour] Adding CSS classes for tour targeting");

          // Add CSS classes for steps and make elements focusable
          document.querySelectorAll('[role="tab"]').forEach((tab) => {
            try {
              const value =
                tab.getAttribute("data-value") || tab.getAttribute("value");
              if (value) {
                tab.classList.add("tab-trigger");
                tab.setAttribute("data-value", value);
                tab.setAttribute("tabindex", "0");
                console.log(`[Tour] Found tab: ${value}`);
              }
            } catch (e) {
              console.error("[Tour] Error processing tab", e);
            }
          });

          // Add classes to tab contents for targeting
          document.querySelectorAll('[role="tabpanel"]').forEach((content) => {
            try {
              const tabId =
                content.getAttribute("id") ||
                content.getAttribute("data-state");
              if (tabId) {
                const tabValue = tabId
                  .replace("content-", "")
                  .replace("-tabpanel", "");
                content.classList.add(`${tabValue}-tab-content`);
                console.log(`[Tour] Found tab content: ${tabValue}`);
              }
            } catch (e) {
              console.error("[Tour] Error processing tab content", e);
            }
          });

          // Find and add class to trade section
          const tradeSection = document.querySelector(".lg\\:col-span-8");
          if (tradeSection) {
            tradeSection.classList.add("trade-section");
            tradeSection.setAttribute("tabindex", "0");
            console.log("[Tour] Added class to trade section");
          } else {
            console.warn("[Tour] Trade section not found");
          }

          // Find and add class to variable section
          const variableSection = document.querySelector(".lg\\:col-span-4");
          if (variableSection) {
            variableSection.classList.add("variable-section");
            variableSection.setAttribute("tabindex", "0");
            console.log("[Tour] Added class to variable section");
          } else {
            console.warn("[Tour] Variable section not found");
          }

          console.log("[Tour] Starting template tour");
          setIsTourRunning(true);
        } catch (error) {
          console.error("[Tour] Error preparing tour:", error);
        }
      }, 500); // Give more time for the DOM to be ready
    } catch (error) {
      console.error("[Tour] Error in startTour:", error);
    }
  };

  return (
    <div className="container">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Create New Template</h1>
        <p className="text-muted-foreground text-sm">
          Create a new template to standardize your proposals and contracts
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
                image: formData.image, // Pass the image
              }}
              updateData={(data) => updateFormData("details", data)}
            />
            <div className="flex justify-end mt-6">
              <Button
                onClick={() => {
                  if (templateId) {
                    handleUpdateTemplate("details");
                  } else {
                    handleCreateTemplate();
                  }
                }}
                disabled={isLoading}
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 trade-section">
                {/* Trade section for highlighting */}
              </div>
              <div className="lg:col-span-4 variable-section">
                {/* Variable section for highlighting */}
              </div>
            </div>
            <TradesAndElementsStep
              data={{
                trades: tradeObjects,
                variables: variableObjects,
              }}
              updateTrades={(trades) => {
                setTradeObjects(trades);
                updateFormData(
                  "trades",
                  trades.map((trade) => trade.id)
                );
              }}
              updateVariables={(variables) => {
                setVariableObjects(variables);
                updateFormData(
                  "variables",
                  variables.map((variable) => variable.id)
                );
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
              <Button onClick={handlePublishTemplate} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  "Create Template"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Tour component */}
      <CreateTemplateTour
        isRunning={isTourRunning}
        setIsRunning={setIsTourRunning}
        activeTab={currentStep}
        setActiveTab={setCurrentStep}
      />

      {/* Help button to start tour */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={startTour}
          variant="secondary"
          className="rounded-full w-12 h-12 shadow-lg bg-white text-gray-800 hover:bg-gray-100 border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-gray-200"
          aria-label="Start tour guide"
        >
          <HelpCircle size={24} />
        </Button>
      </div>
    </div>
  );
}
