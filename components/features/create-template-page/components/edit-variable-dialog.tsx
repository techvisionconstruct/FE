"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Label,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shared";
import { BracesIcon, Loader2, X } from "lucide-react";

interface VariableType {
  id: string;
  name: string;
}

interface EditVariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditVariable: () => void;
  variableId: string;
  variableName: string;
  setVariableName: React.Dispatch<React.SetStateAction<string>>;
  variableDescription: string;
  setVariableDescription: React.Dispatch<React.SetStateAction<string>>;
  variableType: string;
  setVariableType: React.Dispatch<React.SetStateAction<string>>;
  // Formula props kept for compatibility but not used in template creation
  variableFormula: string;
  setVariableFormula: React.Dispatch<React.SetStateAction<string>>;
  variableTypes: { id: string; name: string }[];
  isLoadingVariableTypes: boolean;
  isUpdating: boolean;
  onCancel: () => void;
  variables?: any[];
  updateVariables?: React.Dispatch<React.SetStateAction<any[]>>;
}

export const EditVariableDialog: React.FC<EditVariableDialogProps> = ({
  open,
  onOpenChange,
  onEditVariable,
  variableId,
  variableName,
  setVariableName,
  variableDescription,
  setVariableDescription,
  variableType,
  setVariableType,
  variableFormula,
  setVariableFormula,
  variableTypes,
  isLoadingVariableTypes,
  isUpdating,
  onCancel,
  variables = [],
  updateVariables,
}) => {
  // Formula functionality hidden for template creation - handled in proposal creation
  // Validation states
  const [errors, setErrors] = useState({
    name: "",
    type: "",
  });

  const [touched, setTouched] = useState({
    name: false,
    type: false,
  });  // Reset states when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setErrors({ name: "", type: "" });
      setTouched({ name: false, type: false });
    }
  }, [open]);
  const validateForm = () => {
    const newErrors = { name: "", type: "" };

    // Name validation
    if (!variableName.trim()) {
      newErrors.name = "Variable name is required";
    } else if (variableName.length > 50) {
      newErrors.name = "Variable name must be less than 50 characters";
    } else if (variables.some((v) => v.name === variableName.trim() && v.id !== variableId)) {
      newErrors.name = "Variable with this name already exists";
    }

    // Type validation
    if (!variableType) {
      newErrors.type = "Variable type is required";
    }

    setErrors(newErrors);
    return !newErrors.name && !newErrors.type;
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };
  const handleSubmit = () => {
    // Mark all fields as touched for validation display
    setTouched({ name: true, type: true });
    
    if (validateForm()) {
      onEditVariable();
    }
  };  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <BracesIcon className="mr-2 h-4 w-4" />
              Edit Variable
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Variable Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-var-name">
                Variable Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="edit-var-name"
                  placeholder="Wall Length"
                  value={variableName}
                  onChange={(e) => setVariableName(e.target.value)}
                  onBlur={() => handleBlur("name")}
                  className={
                    errors.name && touched.name ? "border-red-500 pr-10" : "pr-10"
                  }
                />
                {variableName && (
                  <button
                    type="button"
                    onClick={() => setVariableName("")}
                    className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                    tabIndex={-1}
                    aria-label="Clear variable name"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </button>
                )}
              </div>
              {errors.name && touched.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Variable Type */}
            <div className="grid gap-2">
              <Label htmlFor="edit-var-type">
                Variable Type <span className="text-red-500">*</span>
              </Label>
              {isLoadingVariableTypes ? (
                <div className="relative">
                  <Select disabled>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Loading variable types..." />
                    </SelectTrigger>
                  </Select>
                  <div className="text-xs text-muted-foreground flex items-center mt-1">
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Loading variable types...
                  </div>
                </div>
              ) : (
                <>
                  <Select
                    value={variableType}
                    onValueChange={setVariableType}
                  >
                    <SelectTrigger
                      className={`w-full ${
                        errors.type && touched.type ? "border-red-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Select a variable type" />
                    </SelectTrigger>
                    <SelectContent>
                      {variableTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id.toString()}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && touched.type && (
                    <p className="text-xs text-red-500">{errors.type}</p>
                  )}
                </>
              )}
            </div>

            {/* Variable Description */}
            <div className="grid gap-2">
              <Label htmlFor="edit-var-description">
                Description <span className="text-gray-500">(Optional)</span>
              </Label>
              <Textarea
                id="edit-var-description"
                placeholder="What this variable represents (optional)"
                value={variableDescription}
                onChange={(e) => setVariableDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>            {/* Formula field hidden for template creation - formulas are handled in proposal creation */}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Variable"
              )}
            </Button>
          </DialogFooter>        </DialogContent>
      </Dialog>
    );
};
