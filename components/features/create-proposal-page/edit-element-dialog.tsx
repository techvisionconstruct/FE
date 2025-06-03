"use client";

import React, { useState, useEffect } from "react";
import { VariableResponse } from "@/types/variables/dto";
import { ElementResponse } from "@/types/elements/dto";
import { ElementDialog } from "./components/element-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface EditElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditElement: (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
    markup: number;
  }) => void;  
  elementToEdit: ElementResponse | null;
  variables: VariableResponse[];
  updateVariables?: React.Dispatch<React.SetStateAction<VariableResponse[]>>;
  isUpdatingElement: boolean;
  elementMarkup: number;
  onCancel: () => void;
  // Global markup props
  isGlobalMarkupEnabled?: boolean;
  globalMarkupValue?: number;
  onUseGlobalMarkup?: () => void;
}

const EditElementDialog: React.FC<EditElementDialogProps> = ({
  open,
  onOpenChange,
  onEditElement,
  isUpdatingElement,
  onCancel,
  elementToEdit,
  variables = [],
  updateVariables = () => {},
  elementMarkup,
  isGlobalMarkupEnabled = false,
  globalMarkupValue = 0,
  onUseGlobalMarkup = () => {},
}) => {
  const [localElementMarkup, setElementMarkup] = useState(elementMarkup);
  const [localVariables, setLocalVariables] = useState<VariableResponse[]>(variables);
  const queryClient = useQueryClient();

  // Update localVariables when variables prop changes
  useEffect(() => {
    setLocalVariables(variables);
  }, [variables]);

  // Add mutation for updating element
  const updateElementMutation = useMutation({
    mutationFn: ({ elementId, data }: { elementId: string; data: any }) => {
      return fetch(`/api/elements/${elementId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((res) => res.json());
    },    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elements"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
    },
  });
  const handleSubmit = (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
    markup: number;
  }) => {
    if (data.name.trim()) {
      onEditElement(data);
    }
  };

  // Function to ensure variable is added to parent component
  const ensureVariableInParent = (variable: VariableResponse) => {
    if (!localVariables.some(v => v.id === variable.id)) {
      const updatedVariables = [...localVariables, variable];
      setLocalVariables(updatedVariables);
      updateVariables(updatedVariables);
    }
  };

  // Create a compatible updateVariables function
  const handleUpdateVariables = (newVariables: React.SetStateAction<VariableResponse[]>) => {
    // Handle both function updates and direct value updates
    const updatedVariables = typeof newVariables === 'function' 
      ? newVariables(localVariables)
      : newVariables;
    
    setLocalVariables(updatedVariables);
    updateVariables(updatedVariables);
  };

  return (
    <ElementDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      elementToEdit={elementToEdit}
      variables={localVariables}
      updateVariables={handleUpdateVariables}
      isSubmitting={isUpdatingElement}
      dialogTitle="Edit Element"
      submitButtonText="Update Element"
      includeMarkup={true}
      initialMarkup={localElementMarkup}
      isGlobalMarkupEnabled={isGlobalMarkupEnabled}
      globalMarkupValue={globalMarkupValue}
      onUseGlobalMarkup={
        isGlobalMarkupEnabled
          ? () => {
              if (elementToEdit) {
                // Update markup in local state immediately
                setElementMarkup(globalMarkupValue);

                // Update the element directly in the backend
                updateElementMutation.mutate({
                  elementId: elementToEdit.id,
                  data: {
                    name: elementToEdit.name,
                    description: elementToEdit.description || undefined,
                    image: elementToEdit.image || undefined,
                    material_cost_formula: elementToEdit.material_cost_formula,
                    labor_cost_formula: elementToEdit.labor_cost_formula,
                    markup: globalMarkupValue,
                    // Include any other essential fields required by the API                    material_formula_variables: elementToEdit.material_formula_variables,
                    labor_formula_variables: elementToEdit.labor_formula_variables,
                  },
                });

                // Removed toast since parent will handle bulk update
              }
            }
          : undefined
      }
      onRequestCreateVariable={(variableName, callback) => {
        // Instead of creating the variable right away, we'll pass the request to the parent
        // The parent component will handle opening the Add Variable dialog
        if (window.openVariableDialog) {
          window.openVariableDialog(variableName, (newVariable) => {
            // After variable is created, make sure it's added to our local state
            if (newVariable) {
              ensureVariableInParent(newVariable);
            }
            // Then pass it to the original callback
            callback(newVariable);
          });
        } else {
          console.warn("openVariableDialog function not available on window object");
        }
      }}
    />
  );
};

export default EditElementDialog;
