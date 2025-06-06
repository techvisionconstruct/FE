"use client";

import React, { useState, useEffect } from "react";
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

const LOCAL_KEY = "simple-projex-template-create";

export default function CreateTemplate() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<"details" | "trades" | "preview">("details");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTourRunning, setIsTourRunning] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);
  const [formData, setFormData] = useState<TemplateCreateRequest>({
    name: "",
    description: "",
    image: undefined,
  });
  const [hydrated, setHydrated] = useState(false);

  const [tradeObjects, setTradeObjects] = useState<TradeResponse[]>([]);
  const [variableObjects, setVariableObjects] = useState<VariableResponse[]>([]);

  // Load state from localStorage on mount
useEffect(() => {
  const saved = localStorage.getItem(LOCAL_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setCurrentStep(parsed.currentStep || "details");
      setTemplateId(parsed.templateId || null);
      setFormData(parsed.formData || { name: "", description: "", image: undefined });
      setTradeObjects(parsed.tradeObjects || []);
      setVariableObjects(parsed.variableObjects || []);
    } catch {
      // ignore
    }
  } else {
  const hash = window.location.hash.replace("#", "");
  if (hash === "trades" || hash === "preview" || hash === "details") {
    setCurrentStep(hash);
  } else {
    setCurrentStep("details");
  }
}

  // Mark as ready to render
  setHydrated(true);
}, []);

  // Save state to localStorage and update URL hash on change
  useEffect(() => {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({
        currentStep,
        templateId,
        formData,
        tradeObjects,
        variableObjects,
      })
    );
    // Update the URL hash to reflect the current tab
    window.location.hash = currentStep;
  }, [currentStep, templateId, formData, tradeObjects, variableObjects]);

  const updateFormData = (field: string, data: any) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const handleNext = async () => {
  if (currentStep === "details") {
    setCurrentStep("trades");
  } else if (currentStep === "trades") {
    if (tradeObjects.length < 1) {
      toast.error("Please add at least one trade before proceeding.");
      return;
    }
    const hasTradeWithoutElement = tradeObjects.some(
      (trade) => !trade.elements || trade.elements.length < 1
    );
    if (hasTradeWithoutElement) {
      toast.error("Each trade must have at least one element.");
      return;
    }

    await handleUpdateTemplate("trades");
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
    onSuccess: (data: any) => {
      toast.success("Template created successfully!", {
        description: "Your template has been saved",
      });
      setTemplateId(data.data.id);
      handleNext();
      setIsLoading(false);
    },
    onError: (error: any) => {
      toast.error("Failed to create template", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
      setIsLoading(false);
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
      setIsLoading(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update template", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
      setIsLoading(false);
    },
  });

  const publishTemplateMutation = useMutation({
    mutationFn: (data: {
      templateId: string;
      template: TemplateUpdateRequest;
    }) => updateTemplate(data.templateId, data.template),
    onSuccess: () => {
      toast.success("Template published successfully!", {
        description: "Your template is now available",
      });
      setTimeout(() => {
        localStorage.removeItem(LOCAL_KEY);
        router.push("/templates");
      }, 1500);
      setIsLoading(false);
    },
    onError: (error: any) => {
      toast.error("Failed to publish template", {
        description:
          error instanceof Error ? error.message : "Please try again later",
      });
      setIsLoading(false);
    },
  });
  const handleCreateTemplate = async () => {
    // Check if template name is valid
    if (!isFormValid) {
      toast.error("Invalid template details", {
        position: "top-center",
        description: "Template name must be less than 100 characters."
      });
      return Promise.reject("Invalid template details");
    }
    
    setIsLoading(true);

    const templateDetails = {
      name: formData.name,
      description: formData.description,
      image: formData.image,
      status: "draft",
    };

    return new Promise((resolve, reject) => {
      createTemplateMutation.mutate(templateDetails, {
        onSuccess: (data: any) => {
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

  const handleUpdateTemplate = async (step = currentStep) => {
    if (!templateId) {
      toast.error("Template ID is missing");
      return Promise.reject("Template ID is missing");
    }

    // Check if template name is valid when updating from details step
    if (step === "details" && !isFormValid) {
      toast.error("Invalid template details", {
        position: "top-center",
        description: "Template name must be less than 100 characters."
      });
      return Promise.reject("Invalid template details");
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
      localStorage.removeItem(LOCAL_KEY);
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
      setCurrentStep("details");
      setTimeout(() => {
        document.querySelectorAll('[role="tab"]').forEach((tab) => {
          const value =
            tab.getAttribute("data-value") || tab.getAttribute("value");
          if (value) {
            tab.classList.add("tab-trigger");
            tab.setAttribute("data-value", value);
            tab.setAttribute("tabindex", "0");
          }
        });
        document.querySelectorAll('[role="tabpanel"]').forEach((content) => {
          const tabId =
            content.getAttribute("id") || content.getAttribute("data-state");
          if (tabId) {
            const tabValue = tabId
              .replace("content-", "")
              .replace("-tabpanel", "");
            content.classList.add(`${tabValue}-tab-content`);
          }
        });
        const tradeSection = document.querySelector(".lg\\:col-span-8");
        if (tradeSection) {
          tradeSection.classList.add("trade-section");
          tradeSection.setAttribute("tabindex", "0");
        }
        const variableSection = document.querySelector(".lg\\:col-span-4");
        if (variableSection) {
          variableSection.classList.add("variable-section");
          variableSection.setAttribute("tabindex", "0");
        }
        setIsTourRunning(true);
      }, 500);
    } catch (error) {
      // eslint-disable-next-line no-console
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
            { hydrated && currentStep && (
        <Tabs value={currentStep} className="w-full">
          <TabsContent value="details" className="p-6 details-tab-content">
            <TemplateDetailsStep
              data={{
                name: formData.name,
                description: formData.description || "",
                image: formData.image,
              }}
              updateData={(data) => updateFormData("details", data)}
              onValidationChange={setIsFormValid}
            />
            <div className="flex justify-end mt-6">
              <Button                onClick={() => {
                  if (templateId) {
                    handleUpdateTemplate("details");
                  } else {
                    handleCreateTemplate();
                  }
                }}
                disabled={isLoading || !isFormValid}
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
                onClick={handleNext}
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
            )}
      </Card>

      {/* Tour component */}
      {/* <CreateTemplateTour
        isRunning={isTourRunning}
        setIsRunning={setIsTourRunning}
        activeTab={currentStep}
        setActiveTab={setCurrentStep}
      /> */}

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
