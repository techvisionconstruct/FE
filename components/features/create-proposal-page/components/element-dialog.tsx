"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Textarea,
  ImageUpload,
} from "@/components/shared";
import { BracesIcon, Loader2, AlertCircle, X } from "lucide-react";
import { VariableResponse } from "@/types/variables/dto";
import { ElementResponse } from "@/types/elements/dto";
import { FormulaBuilder } from "./formula-builder";
import { FormulaToken, useFormula } from "../hooks/use-formula";
import { toast } from "sonner";
import { ProductResponse } from "@/types/products/dto";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/query-options/products";
import { getFormulaValidationMessage } from "@/components/utils/formula-validation-message";

// Define a more specific type for pending variables
interface PendingVariable {
  variable: VariableResponse | null;
  formulaType: "material" | "labor" | null;
}

// Storage keys for formulas - make them unique to avoid conflicts
const STORAGE_PREFIX = 'proposal_element_dialog_';
const getStorageKeys = (dialogId: string) => ({
  MATERIAL_KEY: `${STORAGE_PREFIX}material_${dialogId}`,
  LABOR_KEY: `${STORAGE_PREFIX}labor_${dialogId}`,
  IS_OPEN_KEY: `${STORAGE_PREFIX}is_open_${dialogId}`
});

interface ElementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
    markup: number;
  }) => void;
  elementToEdit?: ElementResponse | null;
  initialName?: string;
  variables: VariableResponse[];
  updateVariables?: React.Dispatch<React.SetStateAction<VariableResponse[]>>;
  isSubmitting: boolean;
  dialogTitle: string;
  submitButtonText: string;
  includeMarkup?: boolean;
  initialMarkup?: number;
  onRequestCreateVariable?: (variableName: string, callback: (newVariable: VariableResponse) => void) => void;
  // Global markup props
  isGlobalMarkupEnabled?: boolean;
  globalMarkupValue?: number;
  onUseGlobalMarkup?: () => void;
}

export function ElementDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  elementToEdit,
  initialName = "",
  variables,
  updateVariables,
  isSubmitting,
  dialogTitle,
  submitButtonText,
  includeMarkup = false,
  initialMarkup = 0,
  onRequestCreateVariable,
  // Global markup props
  isGlobalMarkupEnabled = false,
  globalMarkupValue = 0,
  onUseGlobalMarkup = () => {},
}: ElementDialogProps) {
  // Generate a unique ID for this dialog instance
  const dialogId = useRef(`dialog_${Math.random().toString(36).substring(2, 11)}`).current;
  const storageKeys = getStorageKeys(dialogId);
  
  // Track if this is the first render of the dialog since opening
  const initialRenderRef = useRef(true);
  const [name, setName] = useState(elementToEdit?.name || initialName);
  const [description, setDescription] = useState(elementToEdit?.description || "");
  const [image, setImage] = useState<string>(elementToEdit?.image || "");
  const [markup, setMarkup] = useState(elementToEdit?.markup || initialMarkup);

  const { data: productsData } = useQuery(getProducts(1, 999));
  
  // Store pending variable information to be processed after creation
  const pendingVariableRef = useRef<PendingVariable>({
    variable: null,
    formulaType: null
  });

  // Filter variables to only include those relevant to this proposal
  const filteredVariables = useMemo(() => {
    if (!variables) return [];
    return variables.filter(variable => 
      variable && (variable.is_global || variable.origin === "derived")
    );
  }, [variables]);
    const {
    materialFormulaTokens,
    setMaterialFormulaTokens,
    laborFormulaTokens,
    setLaborFormulaTokens,
    validateFormulaTokens,
    parseFormulaToTokens,
    tokensToFormulaString,
    replaceVariableIdsWithNames,
    replaceIdsWithNamesInFormula,
  } = useFormula();
  // Add state for formula validation errors
  const [materialFormulaError, setMaterialFormulaError] = useState<string | null>(null);
  const [laborFormulaError, setLaborFormulaError] = useState<string | null>(null);

  // Calculate dynamic dialog width based on formula content length
  const calculateDialogWidth = useMemo(() => {
    const maxTokenLength = Math.max(
      ...materialFormulaTokens.map(token => (token.displayText || token.text).length),
      ...laborFormulaTokens.map(token => (token.displayText || token.text).length),
      0
    );
    
    const tokenCount = Math.max(materialFormulaTokens.length, laborFormulaTokens.length);
    
    // Base width for small content
    if (maxTokenLength <= 20 && tokenCount <= 5) {
      return "sm:max-w-4xl"; // Default size
    }
    
    // Medium width for moderate content
    if (maxTokenLength <= 40 && tokenCount <= 10) {
      return "sm:max-w-5xl";
    }
    
    // Large width for extensive content
    if (maxTokenLength <= 60 && tokenCount <= 15) {
      return "sm:max-w-6xl";
    }
    
    // Extra large for very long product names or many tokens
    return "sm:max-w-7xl";
  }, [materialFormulaTokens, laborFormulaTokens]);

  // Local storage helper functions
  const saveFormulasToStorage = () => {
    try {
      localStorage.setItem(storageKeys.MATERIAL_KEY, JSON.stringify(materialFormulaTokens));
      localStorage.setItem(storageKeys.LABOR_KEY, JSON.stringify(laborFormulaTokens));
      localStorage.setItem(storageKeys.IS_OPEN_KEY, 'true');
    } catch (err) {
      console.error('Error saving to localStorage:', err);
    }
  };

  const getFormulasFromStorage = () => {
    try {
      const materialStr = localStorage.getItem(storageKeys.MATERIAL_KEY);
      const laborStr = localStorage.getItem(storageKeys.LABOR_KEY);
      
      let materialTokens: FormulaToken[] = [];
      let laborTokens: FormulaToken[] = [];
      
      if (materialStr) {
        try {
          const parsed = JSON.parse(materialStr);
          if (Array.isArray(parsed)) {
            materialTokens = parsed;
          }
        } catch (e) {
          console.error('Error parsing material tokens:', e);
        }
      }
      
      if (laborStr) {
        try {
          const parsed = JSON.parse(laborStr);
          if (Array.isArray(parsed)) {
            laborTokens = parsed;
          }
        } catch (e) {
          console.error('Error parsing labor tokens:', e);
        }
      }
      
      return { materialTokens, laborTokens };
    } catch (err) {
      console.error('Error reading from localStorage:', err);
      return { materialTokens: [], laborTokens: [] };
    }
  };

  const clearFormulaStorage = () => {
    try {
      localStorage.removeItem(storageKeys.MATERIAL_KEY);
      localStorage.removeItem(storageKeys.LABOR_KEY);
      localStorage.removeItem(storageKeys.IS_OPEN_KEY);
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }
  };

  // Initialize dialog content
  useEffect(() => {
    if (isOpen) {
      // Reset initial render flag when dialog opens
      initialRenderRef.current = true;

      // Always update the form fields when dialog opens
      if (elementToEdit) {
        setName(elementToEdit.name);
        setDescription(elementToEdit.description || "");
        setImage(elementToEdit.image || "");
        setMarkup(elementToEdit.markup || initialMarkup);
      } else {
        setName(initialName);
        setDescription("");
        setImage("");
        setMarkup(initialMarkup);
      }

      const wasOpen = localStorage.getItem(storageKeys.IS_OPEN_KEY) === "true";

      if (wasOpen && !elementToEdit) {
        // Dialog was previously open for new element - restore formulas from localStorage
        const { materialTokens, laborTokens } = getFormulasFromStorage();
        if (materialTokens.length > 0) setMaterialFormulaTokens(materialTokens);
        if (laborTokens.length > 0) setLaborFormulaTokens(laborTokens);
      } else if (elementToEdit) {
        // Initialize from element to edit
        let materialTokens = [],
          laborTokens = [];        if (elementToEdit.material_cost_formula) {
          // Use enhanced function to replace IDs with names, including products
          let displayFormula = replaceIdsWithNamesInFormula(
            elementToEdit.material_cost_formula,
            filteredVariables,
            elementToEdit.material_formula_variables || [],
            productsData?.data
          );

          materialTokens = parseFormulaToTokens(displayFormula);materialTokens = materialTokens.map((token) => {
            // First check if this token is a product in formula variables
            if (
              elementToEdit.material_formula_variables &&
              elementToEdit.material_formula_variables.length > 0
            ) {
              // Check if this token ID matches a product from the products API
              const matchedProduct = productsData?.data?.find(
                (product: ProductResponse) => product.id === token.text
              );

              if (matchedProduct) {
                return {
                  ...token,
                  type: "product" as const,
                  text: matchedProduct.id,
                  displayText: matchedProduct.title,
                };
              }

              // Check if token text matches a product name
              const productByName = productsData?.data?.find(
                (product: ProductResponse) =>
                  product.title.toLowerCase() === token.text.toLowerCase() ||
                  product.title.toLowerCase() === token.displayText?.toLowerCase()
              );

              if (productByName) {
                return {
                  ...token,
                  type: "product" as const,
                  text: productByName.id,
                  displayText: productByName.title,
                };
              }
            }

            return token;
          });

          setMaterialFormulaTokens(materialTokens);
          localStorage.setItem(
            storageKeys.MATERIAL_KEY,
            JSON.stringify(materialTokens)
          );
        } else {
          setMaterialFormulaTokens([]);
        }        if (elementToEdit.labor_cost_formula) {
          // Use enhanced function to replace IDs with names, including products
          let displayFormula = replaceIdsWithNamesInFormula(
            elementToEdit.labor_cost_formula,
            filteredVariables,
            elementToEdit.labor_formula_variables || [],
            productsData?.data
          );

          laborTokens = parseFormulaToTokens(displayFormula);laborTokens = laborTokens.map((token) => {
            // First check if this token is a product in formula variables
            if (
              elementToEdit.labor_formula_variables &&
              elementToEdit.labor_formula_variables.length > 0
            ) {
              // Check if this token ID matches a product from the products API
              const matchedProduct = productsData?.data?.find(
                (product: ProductResponse) => product.id === token.text
              );

              if (matchedProduct) {
                return {
                  ...token,
                  type: "product" as const,
                  text: matchedProduct.id,
                  displayText: matchedProduct.title,
                };
              }

              // Check if token text matches a product name
              const productByName = productsData?.data?.find(
                (product: ProductResponse) =>
                  product.title.toLowerCase() === token.text.toLowerCase() ||
                  product.title.toLowerCase() === token.displayText?.toLowerCase()
              );

              if (productByName) {
                return {
                  ...token,
                  type: "product" as const,
                  text: productByName.id,
                  displayText: productByName.title,
                };
              }
            }

            return token;
          });

          setLaborFormulaTokens(laborTokens);
          localStorage.setItem(
            storageKeys.LABOR_KEY,
            JSON.stringify(laborTokens)
          );
        } else {
          setLaborFormulaTokens([]);
        }

        // Initial save to localStorage
        setTimeout(() => {
          saveFormulasToStorage();
        }, 100);
      } else {
        // New element, initialize with clean state
        setMaterialFormulaTokens([]);
        setLaborFormulaTokens([]);

        // Initial save to localStorage
        setTimeout(() => {
          saveFormulasToStorage();
        }, 100);
      }
    }  }, [
    isOpen,
    elementToEdit,
    initialName,
    initialMarkup,
    filteredVariables,
    parseFormulaToTokens,
    replaceIdsWithNamesInFormula,
    productsData?.data,
    setLaborFormulaTokens,
    setMaterialFormulaTokens
  ]);

  // Save formulas to localStorage whenever they change
  useEffect(() => {
    if (isOpen) {
      saveFormulasToStorage();
    }
  }, [materialFormulaTokens, laborFormulaTokens, isOpen]);

  // Validate formulas whenever they change
  useEffect(() => {
    if (materialFormulaTokens.length > 0) {
      const validation = validateFormulaTokens(materialFormulaTokens);
      setMaterialFormulaError(validation.isValid ? null : validation.error);
    } else {
      setMaterialFormulaError(null);
    }
  }, [materialFormulaTokens, validateFormulaTokens]);

  useEffect(() => {
    if (laborFormulaTokens.length > 0) {
      const validation = validateFormulaTokens(laborFormulaTokens);
      setLaborFormulaError(validation.isValid ? null : validation.error);
    } else {
      setLaborFormulaError(null);
    }
  }, [laborFormulaTokens, validateFormulaTokens]);

  // Detect when initialName changes while the dialog is open
  useEffect(() => {
    // Only update if dialog is open and initialName changes
    // But skip this on first render to prevent overwriting elementToEdit name
    if (isOpen && !elementToEdit && !initialRenderRef.current && initialName !== "") {
      setName(initialName);
    }
    initialRenderRef.current = false;
  }, [initialName, isOpen, elementToEdit]);
  // Handle pending variable addition
  useEffect(() => {
    const pendingVariable = pendingVariableRef.current;
    
    if (pendingVariable.variable && pendingVariable.formulaType) {
      try {
        // Get current formulas from localStorage to ensure we have latest state
        const { materialTokens: storedMaterialTokens, laborTokens: storedLaborTokens } = getFormulasFromStorage();
        
        // Create a token for the new variable
        const newToken: FormulaToken = {
          id: Date.now() + Math.random(),
          text: pendingVariable.variable.name || "",
          displayText: pendingVariable.variable.name || "",
          type: "variable"
        };
        
        if (newToken.text) {
          if (pendingVariable.formulaType === "material") {
            // Make sure we're using the most up-to-date tokens
            // Either from state or localStorage, whichever has more tokens
            const baseTokens = materialFormulaTokens.length >= storedMaterialTokens.length
              ? materialFormulaTokens
              : storedMaterialTokens;
              
            // Update material formula with the new variable
            const updatedMaterialTokens = [...baseTokens, newToken];
            setMaterialFormulaTokens(updatedMaterialTokens);
            
            // Make sure to preserve labor formula - use the tokens with more elements
            const laborBaseTokens = laborFormulaTokens.length >= storedLaborTokens.length
              ? laborFormulaTokens
              : storedLaborTokens;
              
            if (laborBaseTokens.length > 0) {
              setLaborFormulaTokens(laborBaseTokens);
            }
            
            console.log(`Variable "${newToken.text}" added to material formula`);
          } else if (pendingVariable.formulaType === "labor") {
            // Make sure we're using the most up-to-date tokens
            // Either from state or localStorage, whichever has more tokens
            const baseTokens = laborFormulaTokens.length >= storedLaborTokens.length
              ? laborFormulaTokens
              : storedLaborTokens;
              
            // Update labor formula with the new variable
            const updatedLaborTokens = [...baseTokens, newToken];
            setLaborFormulaTokens(updatedLaborTokens);
            
            // Make sure to preserve material formula - use the tokens with more elements
            const materialBaseTokens = materialFormulaTokens.length >= storedMaterialTokens.length
              ? materialFormulaTokens
              : storedMaterialTokens;
              
            if (materialBaseTokens.length > 0) {
              setMaterialFormulaTokens(materialBaseTokens);
            }
            
            console.log(`Variable "${newToken.text}" added to labor formula`);
          }
        }
        
        // Reset the pending variable
        pendingVariableRef.current = {
          variable: null,
          formulaType: null
        };
      } catch (error) {
        console.error("Error adding variable to formula:", error);
      }
    }
  }, [
    pendingVariableRef.current.variable, 
    materialFormulaTokens, 
    laborFormulaTokens,
    setMaterialFormulaTokens,
    setLaborFormulaTokens
  ]);
  const handleSubmit = () => {
    if (!name.trim()) return;

    // Validate formulas right before submission
    let hasFormulaError = false;

    if (materialFormulaTokens.length > 0) {
      // Run validation one more time before submitting
      const materialValidation = validateFormulaTokens(materialFormulaTokens);
      if (!materialValidation.isValid) {
        // Update the error state to trigger button disabling
        setMaterialFormulaError(materialValidation.error);
        toast.error("Material formula error", {
          description: materialValidation.error || "Invalid formula"
        });
        hasFormulaError = true;
      }
    }

    if (laborFormulaTokens.length > 0) {
      // Run validation one more time before submitting
      const laborValidation = validateFormulaTokens(laborFormulaTokens);
      if (!laborValidation.isValid) {
        // Update the error state to trigger button disabling
        setLaborFormulaError(laborValidation.error);
        toast.error("Labor formula error", {
          description: laborValidation.error || "Invalid formula"
        });
        hasFormulaError = true;
      }
    }
    
    // Exit if there are formula errors
    if (hasFormulaError) return;

    const materialFormula = tokensToFormulaString(materialFormulaTokens);
    const laborFormula = tokensToFormulaString(laborFormulaTokens);
    
    // Clear localStorage before submitting
    clearFormulaStorage();
      onSubmit({
      name: name.trim(),
      description: description.trim(),
      image,
      materialFormula,
      laborFormula,
      markup
    });
  };

  const handleCreateVariable = (
    variableName: string, 
    formulaType?: "material" | "labor"
  ) => {
    if (!onRequestCreateVariable) {
      // Fallback if no callback is provided
      if (updateVariables) {
        // Don't create variable if it's a number
        if (!isNaN(parseFloat(variableName))) return;

        // Check if variable already exists
        const existingVar = variables.find(v => v.name.toLowerCase() === variableName.toLowerCase());
        if (existingVar) {
          toast.info(`Variable "${variableName}" already exists`);
          return;
        }

        // Skip operators
        if (["+", "-", "*", "/", "(", ")", "^"].includes(variableName)) return;

        // Create temporary variable
        const tempVariable: VariableResponse = {
          id: `temp-${Date.now()}`,
          name: variableName,
          value: 0,
          description: "",
          is_global: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        updateVariables([...variables, tempVariable]);
        
        // IMPORTANT: Save current formulas to localStorage before setting pending variable
        saveFormulasToStorage();
        
        // Set the pending variable
        pendingVariableRef.current = {
          variable: tempVariable,
          formulaType: formulaType || null
        };
        
        // Force the useEffect to run with a new reference
        pendingVariableRef.current = {
          ...pendingVariableRef.current,
          variable: {
            ...tempVariable,
            updated_at: new Date().getTime().toString() // Ensure ref changes
          }
        };
      }
      return;
    }

    // IMPORTANT: Save current formulas to localStorage before variable creation
    saveFormulasToStorage();
    
    // Use the provided callback to create the variable
    onRequestCreateVariable(variableName, (newVariable) => {
      if (!newVariable) {
        console.warn("Variable creation callback returned null or undefined");
        return;
      }
      
      try {
        if (typeof newVariable === 'object' && newVariable.name) {
          // Set the pending variable
          pendingVariableRef.current = {
            variable: newVariable,
            formulaType: formulaType || null
          };
          
          // Force the useEffect to run with a new reference
          pendingVariableRef.current = {
            ...pendingVariableRef.current,
            variable: {
              ...newVariable,
              updated_at: new Date().getTime().toString() // Ensure ref changes
            }
          };
          
          console.log(`Variable "${newVariable.name}" created, will be added to ${formulaType} formula`);
        } else {
          console.error("Invalid variable object structure:", newVariable);
        }
      } catch (error) {
        console.error("Error in variable creation callback:", error);
      }
    });
  };

  // Element validation
  const [elementErrors, setElementErrors] = useState({ name: "" });
  const [elementTouched, setElementTouched] = useState({ name: false });

  useEffect(() => {
    if (elementTouched.name) {
      validateElementForm();
    }
  }, [name, elementTouched.name]);

  const validateElementForm = () => {
    const newErrors = { name: "" };

    if (!name.trim()) {
      newErrors.name = "Element name is required";
    } else if (name.length > 100) {
      newErrors.name = "Element name must be less than 100 characters";
    }

    setElementErrors(newErrors);
    return !newErrors.name;
  };

  const handleElementBlur = (field: string) => {
    setElementTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Clear all form data when dialog closes
  useEffect(() => {
    if (!isOpen) {
      // Clear all form fields
      setImage("");
      setName("");
      setDescription("");
      setMarkup(initialMarkup);
      
      // Clear formula tokens
      setMaterialFormulaTokens([]);
      setLaborFormulaTokens([]);
      
      // Clear localStorage
      clearFormulaStorage();
      
      // Reset errors
      setMaterialFormulaError(null);
      setLaborFormulaError(null);
      setElementErrors({ name: "" });
      setElementTouched({ name: false });
      
      // Reset pending variable
      pendingVariableRef.current = {
        variable: null,
        formulaType: null,
      };
    }
  }, [isOpen, initialMarkup, setMaterialFormulaTokens, setLaborFormulaTokens]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        // Clear storage when dialog is manually closed
        clearFormulaStorage();
      }
      onOpenChange(open);
    }}>
      <DialogContent className={`${calculateDialogWidth} max-h-[90vh] overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <BracesIcon className="mr-2 h-4 w-4" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>        <div className="grid gap-5 py-5">
          {/* Two-column layout for Name/Description and Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First column: Name and Description */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="element-name">
                  Element Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="element-name"
                    placeholder="Wall Framing"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleElementBlur("name")}
                    className={
                      elementErrors.name && elementTouched.name
                        ? "border-red-500 pr-10"
                        : "pr-10"
                    }
                  />
                  {name && (
                    <button
                      type="button"
                      onClick={() => setName("")}
                      className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                      tabIndex={-1}
                      aria-label="Clear element name"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
                {elementErrors.name && elementTouched.name && (
                  <p className="text-xs text-red-500">{elementErrors.name}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="element-description">
                  Description{" "}
                  <span className="text-gray-500">&#40;Optional&#41;</span>
                </Label>
                <div className="relative">
                  <Textarea
                    id="element-description"
                    placeholder="Description of this element"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[60px] pr-10"
                  />
                  {description && (
                    <button
                      type="button"
                      onClick={() => setDescription("")}
                      className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                      tabIndex={-1}
                      aria-label="Clear description"
                    >
                      <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Second column: Image */}
            <div className="grid gap-2">
              <Label htmlFor="element-image">
                Element Image{" "}
                <span className="text-gray-500">&#40;Optional&#41;</span>
              </Label>
              <ImageUpload
                value={image || elementToEdit?.image || ""}
                onChange={(value) => {
                  console.log("Element image changed:", value);
                  setImage(value);
                }}
                placeholder="Click or drag to upload element image"
                height={200}
              />
            </div>
          </div>

          {/* Material Cost Formula */}
          <div className="grid gap-3">            <Label
              htmlFor="material-formula"
              className="flex items-center justify-between"
            >
              <span className="text-sm font-medium flex items-center">
                Material Cost Formula{" "}
                <span className="text-gray-500">&#40;Optional&#41;</span>
              </span>
            </Label><FormulaBuilder
              formulaTokens={materialFormulaTokens}
              setFormulaTokens={(tokens) => {
                setMaterialFormulaTokens(tokens);
                // Update localStorage immediately
                localStorage.setItem(storageKeys.MATERIAL_KEY, JSON.stringify(tokens));
              }}
              variables={filteredVariables}
              updateVariables={updateVariables}
              hasError={!!materialFormulaError}
              onCreateVariable={(name) => {
                handleCreateVariable(name, "material");
              }}
              formulaType="material"              onValidationError={setMaterialFormulaError}
            />
          </div>

          {/* Labor Cost Formula */}
          <div className="grid gap-3">            <Label
              htmlFor="labor-formula"
              className="flex items-center justify-between"
            >
              <span className="text-sm font-medium flex items-center">
                Labor Cost Formula <span className="text-gray-500">&#40;Optional&#41;</span>
              </span>
            </Label><FormulaBuilder
              formulaTokens={laborFormulaTokens}
              setFormulaTokens={(tokens) => {
                setLaborFormulaTokens(tokens);
                // Update localStorage immediately
                localStorage.setItem(storageKeys.LABOR_KEY, JSON.stringify(tokens));
              }}
              variables={filteredVariables}
              updateVariables={updateVariables}
              hasError={!!laborFormulaError}
              onCreateVariable={(name) => {
                handleCreateVariable(name, "labor");
              }}
              formulaType="labor"              onValidationError={setLaborFormulaError}
            />
          </div>

          {/* Markup Field (only if includeMarkup is true) */}
          {includeMarkup && (
            <div className="grid gap-2">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="element-markup">
                  Markup Percentage (%)
                </Label>
                {isGlobalMarkupEnabled && (
                  <div className="flex items-center">
                    {markup !== globalMarkupValue && (
                      <Button 
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs flex items-center gap-1 text-muted-foreground hover:text-primary"
                        onClick={() => {
                          // First update local state
                          setMarkup(globalMarkupValue);
                          
                          // Then call the callback to notify parent component                          // This is crucial for updating the element in the parent's state
                          if (onUseGlobalMarkup) {
                            onUseGlobalMarkup();
                          }
                          
                          // Removed toast since parent will handle bulk update
                        }}
                      >
                        Use Global ({globalMarkupValue}%)
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  id="element-markup"
                  type="number"
                  min="0"
                  max="100"
                  placeholder={isGlobalMarkupEnabled ? globalMarkupValue.toString() : "i.e. 1%, 15%, 20%"}
                  value={markup || ''}
                  onChange={(e) => setMarkup(parseFloat(e.target.value) || 0)}
                  className={isGlobalMarkupEnabled && markup === globalMarkupValue ? 'border-primary/30' : ''}
                />
                {isGlobalMarkupEnabled && markup === globalMarkupValue && (
                  <div className="absolute right-3 top-2 flex items-center">
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                      Global
                    </span>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {isGlobalMarkupEnabled 
                  ? markup === globalMarkupValue 
                    ? `Using global markup value (${globalMarkupValue}%)` 
                    : `Enter custom markup or use the global value (${globalMarkupValue}%)`
                  : "Enter the percentage markup to apply to this element (e.g., 15 for 15%)"}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            clearFormulaStorage();
            onOpenChange(false);
          }}>
            Cancel
          </Button>          <Button 
            onClick={() => {
              // Additional validation check right when button is clicked
              if (materialFormulaTokens.length > 0) {
                const lastMaterialToken = materialFormulaTokens[materialFormulaTokens.length - 1];
                if (lastMaterialToken && lastMaterialToken.type === "operator" && 
                    ["+", "-", "*", "/", "(", "^"].includes(lastMaterialToken.text)) {
                  setMaterialFormulaError(`Formula ends with "${lastMaterialToken.text}" - please complete the formula`);
                  return;
                }
              }
              
              if (laborFormulaTokens.length > 0) {
                const lastLaborToken = laborFormulaTokens[laborFormulaTokens.length - 1];
                if (lastLaborToken && lastLaborToken.type === "operator" && 
                    ["+", "-", "*", "/", "(", "^"].includes(lastLaborToken.text)) {
                  setLaborFormulaError(`Formula ends with "${lastLaborToken.text}" - please complete the formula`);
                  return;
                }
              }
              
              handleSubmit();
            }}
            disabled={
              isSubmitting || 
              !name.trim() || 
              !!materialFormulaError || 
              !!laborFormulaError
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {elementToEdit ? "Updating..." : "Creating..."}
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
