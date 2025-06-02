"use client";

import React, { useState, useEffect } from "react";
import { VariableResponse } from "@/types/variables/dto";
import { ElementDialog } from "./components/element-dialog";

interface AddElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;  
  onAddElement: (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
    markup: number;
  }) => void;
  newElementName: string;
  variables: VariableResponse[];
  updateVariables?: React.Dispatch<React.SetStateAction<VariableResponse[]>>;
  isCreatingElement: boolean;
  // Global markup props
  isGlobalMarkupEnabled?: boolean;
  globalMarkupValue?: number;
}

const AddElementDialog: React.FC<AddElementDialogProps> = ({
  open,
  onOpenChange,
  onAddElement,
  newElementName,
  variables = [],
  updateVariables = () => {},
  isCreatingElement,
  isGlobalMarkupEnabled = false,
  globalMarkupValue = 0,
}) => {
  // Initialize localVariables with variables from props
  const [localVariables, setLocalVariables] = useState<VariableResponse[]>(variables);
  
  // Update localVariables when variables prop changes
  useEffect(() => {
    setLocalVariables(variables);
  }, [variables]);
  
  const handleSubmit = (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
    markup: number;
  }) => {
    if (data.name.trim()) {
      onAddElement(data);
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
  
  return (
    <ElementDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      onSubmit={handleSubmit}
      initialName={newElementName}
      variables={localVariables}
      updateVariables={(updatedVariables) => {
        if (typeof updatedVariables === 'function') {
          // If it's a function, compute the new value based on current localVariables
          const newVars = updatedVariables(localVariables);
          setLocalVariables(newVars);
          updateVariables(newVars);
        } else {
          // If it's a direct value, use it directly
          setLocalVariables(updatedVariables);
          updateVariables(updatedVariables);
        }
      }}
      isSubmitting={isCreatingElement}
      dialogTitle="Add New Element"
      submitButtonText="Add Element"
      includeMarkup={true}
      initialMarkup={isGlobalMarkupEnabled ? globalMarkupValue : 0}
      isGlobalMarkupEnabled={isGlobalMarkupEnabled}
      globalMarkupValue={globalMarkupValue}
      onUseGlobalMarkup={() => {
        // This can be a no-op for now since we're already setting initialMarkup to globalMarkupValue
        // when global markup is enabled, but in the future we might want to track this action
      }}
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
          console.warn('openVariableDialog function not available on window object');
        }
      }}
    />
  );
};

export default AddElementDialog;
