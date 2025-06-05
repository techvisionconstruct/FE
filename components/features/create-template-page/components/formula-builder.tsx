"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Badge, Input, Button } from "@/components/shared";
import {
  Variable,
  Calculator,
  Hash,
  X,
  PlusCircle,
  AlertCircle,
  Package,
} from "lucide-react";
import { VariableResponse } from "@/types/variables/dto";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { FormulaToken } from "../hooks/use-formula";
import { getVariables } from "@/query-options/variables";
import { getProducts } from "@/query-options/products";
import { getFormulaValidationMessage } from "@/components/utils/formula-validation-message";

// Define interfaces for type safety
interface SuggestionItem {
  id: string;
  name?: string;
  title?: string;
  isProduct?: boolean;
  isCreateSuggestion?: boolean;
  displayText?: string;
  is_global?: boolean;
}

interface FormulaBuilderProps {
  formulaTokens: FormulaToken[];
  setFormulaTokens: React.Dispatch<React.SetStateAction<FormulaToken[]>>;
  variables: VariableResponse[];
  updateVariables?: React.Dispatch<React.SetStateAction<VariableResponse[]>>;
  hasError?: boolean;
  onCreateVariable?: (name: string, formulaType?: "material" | "labor") => void;
  formulaType?: "material" | "labor";
  onValidationError?: (error: string | null) => void;
  excludeVariableName?: string;
  excludeProducts?: boolean;
}

// Function to validate consecutive operands only (for construction-time validation)
function validateConsecutiveOperands(tokens: FormulaToken[]): {
  isValid: boolean;
  errorMessage: string;
} {
  if (tokens.length === 0) {
    return { isValid: true, errorMessage: "" };
  }

  // Helper function to check if a token is an operand (variable, number, or product)
  const isOperand = (token: FormulaToken): boolean => {
    return token.type === "variable" || token.type === "number" || token.type === "product";
  };

  // Helper function to check if a token is an operator
  const isOperator = (token: FormulaToken): boolean => {
    return token.type === "operator" && ["+", "-", "*", "/", "^"].includes(token.text);
  };

  // Only validate consecutive token relationships that are always invalid
  for (let i = 0; i < tokens.length - 1; i++) {
    const currentToken = tokens[i];
    const nextToken = tokens[i + 1];

    // Check for consecutive operands (variable, number, product) - this is always invalid
    if (isOperand(currentToken) && isOperand(nextToken)) {
      const currentType = currentToken.type === "product" ? "product" : 
                         currentToken.type === "variable" ? "variable" : "number";
      const nextType = nextToken.type === "product" ? "product" : 
                      nextToken.type === "variable" ? "variable" : "number";
      
      return {
        isValid: false,
        errorMessage: `Cannot have consecutive ${currentType} and ${nextType} without an operator between them`,
      };
    }

    // Check for consecutive operators (excluding parentheses) - this is always invalid
    if (isOperator(currentToken) && isOperator(nextToken)) {
      return {
        isValid: false,
        errorMessage: `Cannot have consecutive operators "${currentToken.text}" and "${nextToken.text}"`,
      };
    }

    // Check for invalid operator-parenthesis combinations - these are always invalid
    if (isOperand(currentToken) && nextToken.text === "(") {
      const currentType = currentToken.type === "product" ? "product" : 
                         currentToken.type === "variable" ? "variable" : "number";
      return {
        isValid: false,
        errorMessage: `Missing operator between ${currentType} and opening parenthesis`,
      };
    }

    if (currentToken.text === ")" && isOperand(nextToken)) {
      const nextType = nextToken.type === "product" ? "product" : 
                      nextToken.type === "variable" ? "variable" : "number";
      return {
        isValid: false,
        errorMessage: `Missing operator between closing parenthesis and ${nextType}`,
      };
    }
  }

  return { isValid: true, errorMessage: "" };
}

// Function to validate a complete mathematical formula (for blur validation)
function validateCompleteFormula(tokens: FormulaToken[]): {
  isValid: boolean;
  errorMessage: string;
} {
  if (tokens.length === 0) {
    return { isValid: true, errorMessage: "" };
  }

  // First check consecutive operands
  const consecutiveCheck = validateConsecutiveOperands(tokens);
  if (!consecutiveCheck.isValid) {
    return consecutiveCheck;
  }
  try {
    // Validate first and last tokens for completeness
    if (tokens.length > 0) {
      const firstToken = tokens[0];
      const lastToken = tokens[tokens.length - 1];

      // Cannot start with certain operators
      if (
        firstToken.type === "operator" &&
        ["*", "/", ")", "^"].includes(firstToken.text)
      ) {
        return {
          isValid: false,
          errorMessage: `Formula cannot start with "${firstToken.text}"`,
        };
      }

      // Cannot end with certain operators (incomplete formula)
      if (
        lastToken.type === "operator" &&
        ["+", "-", "*", "/", "(", "^"].includes(lastToken.text)
      ) {
        return {
          isValid: false,
          errorMessage: `Formula ends with "${lastToken.text}" - please complete the formula`,
        };
      }    }

    // Check for empty parentheses
    if (
      tokens.length === 2 &&
      tokens[0].text === "(" &&
      tokens[1].text === ")"
    ) {
      return {
        isValid: false,
        errorMessage: "Empty parentheses () are not allowed",
      };
    }

    // Check for empty parentheses anywhere in the formula
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i].text === "(" && tokens[i + 1].text === ")") {
        return {
          isValid: false,
          errorMessage: "Empty parentheses () are not allowed",
        };
      }
    }

    // Try to evaluate if all tokens are simple (numbers, operators, parentheses)
    const allSimple = tokens.every(
      (t) =>
        t.type === "number" ||
        t.type === "operator" ||
        t.text === "(" ||
        t.text === ")"
    );
    const lastToken = tokens[tokens.length - 1];
    if (
      allSimple &&
      !(
        lastToken.type === "operator" &&
        ["+", "-", "*", "/", "(", "^"].includes(lastToken.text)
      )
    ) {
      const formula = tokens
        .map((token) => {
          if (token.type === "variable" || token.type === "product") {
            return "1"; // Replace variables and products with 1 for validation
          }
          return token.text;
        })
        .join(" ");

      new Function(`return ${formula}`)();
    }

    return { isValid: true, errorMessage: "" };
  } catch (error) {
    return {
      isValid: false,
      errorMessage: "Invalid mathematical formula",
    };
  }
}

export function FormulaBuilder({
  formulaTokens,
  setFormulaTokens,
  variables,
  updateVariables,
  hasError = false,
  onCreateVariable,
  formulaType,
  onValidationError,
  excludeVariableName,
  excludeProducts = false,
}: FormulaBuilderProps) {
  const [formulaInput, setFormulaInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<(VariableResponse | any)[]>(
    []
  );
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCreatingVariable, setIsCreatingVariable] = useState(false);

  // Track the cursor position for inserting variables at the right spot
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);

  // Track if this component is currently focused
  const [isFocused, setIsFocused] = useState(false);

  // Store pending variable information to be processed after creation
  const pendingVariableRef = useRef<{
    name: string;
    formulaType: "material" | "labor" | null;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const { data: variablesData, isLoading: variablesLoading } = useQuery(
    getVariables(1, 10, formulaInput)
  );

  const { data: productsData, isLoading } = useQuery(
    getProducts(1, 10, formulaInput)
  );
  const templateVariables = useMemo(() => {
    if (!variables) return [];
    return variables.filter(
      (variable) =>
        variable && (variable.is_global || variable.origin === "derived")
    );
  }, [variables]);
  // Ensure formulaTokens is always an array of valid tokens
  const validFormulaTokens = useMemo(() => {
    if (!Array.isArray(formulaTokens)) return [];

    return formulaTokens
      .filter(
        (token) =>
          token &&
          typeof token === "object" &&
          token.id !== undefined &&
          token.text !== undefined &&
          token.type !== undefined
      )
      .map((token) => ({
        ...token,
        // Ensure displayText is always present, fallback to text if missing
        displayText: token.displayText !== undefined ? token.displayText : token.text
      }));
  }, [formulaTokens]);  // Helper function to add variable to template and validate formula
  const addVariableWithValidation = (
    variableItem: VariableResponse,
    text: string,
    displayText: string
  ) => {
    const newToken: FormulaToken = {
      id: Date.now() + Math.random(),
      text,
      displayText,
      type: "variable",
    };    // Create the proposed new tokens array
    const proposedTokens = [...validFormulaTokens, newToken];

    // Check if adding this token would create invalid consecutive operands
    const { isValid, errorMessage } = validateConsecutiveOperands(proposedTokens);

    if (!isValid) {
      // Show error but don't add the invalid token or import the variable
      toast.error("Formula Error", {
        position: "top-center",
        description: errorMessage,
        icon: <AlertCircle className="w-4 h-4" />,
      });
      // Don't add the token or import the variable, just clear the input
      setFormulaInput("");
      setShowSuggestions(false);
      return false; // Return false to indicate failure
    }

    // Only import variable to template if formula would be valid
    if (updateVariables && !variables.some((v) => v.id === variableItem.id)) {
      updateVariables((currentVariables) => {
        if (currentVariables.some((v) => v.id === variableItem.id)) {
          return currentVariables;
        }
        return [...currentVariables, variableItem];
      });

      toast.success("Variable automatically added", {
        description: `"${variableItem.name}" has been added to your template.`,
      });
    }

    // Add the token to the formula
    setFormulaTokens(proposedTokens);
    setFormulaInput("");
    setShowSuggestions(false);
    return true; // Return true to indicate success
  };
  const addFormulaToken = (
    text: string,
    displayText: string,
    tokenType: "variable" | "operator" | "number" | "function" | "product"
  ) => {
    const newToken: FormulaToken = {
      id: Date.now() + Math.random(),
      text,
      displayText,
      type: tokenType,
    };

    // Create the proposed new tokens array
    const proposedTokens = [...validFormulaTokens, newToken];

    // Only validate consecutive operands for operands (variables, numbers, products)
    // Allow operators to be added freely (they have their own validation logic)
    const isOperand = tokenType === "variable" || tokenType === "number" || tokenType === "product";
    
    if (isOperand) {
      // Check if adding this operand would create invalid consecutive operands
      const { isValid, errorMessage } = validateConsecutiveOperands(proposedTokens);

      if (!isValid) {
        // Show error but don't add the invalid token
        toast.error("Formula Error", {
          position: "top-center",
          description: errorMessage,
          icon: <AlertCircle className="w-4 h-4" />,
        });
        // Don't add the token, just clear the input
        setFormulaInput("");
        setShowSuggestions(false);
        return; // Exit early without adding the token
      }
    }

    // Log newly created variable tokens
    if (tokenType === "variable") {
      console.log("New variable token created:", {
        token: newToken,
        formulaType,
        timestamp: new Date().toISOString()
      });
    }

    // Add the token to the formula
    setFormulaTokens(proposedTokens);
    setFormulaInput("");
    setShowSuggestions(false);
  };

  const removeFormulaToken = (tokenId: number) => {
    const newTokens = validFormulaTokens.filter(
      (token) => token.id !== tokenId
    );
    setFormulaTokens(newTokens);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormulaInput(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  // Create variable safely with better logging
  const safeCreateVariable = (name: string) => {
    try {
      if (onCreateVariable && !isCreatingVariable) {
        setIsCreatingVariable(true);

        // Store the pending variable information
        pendingVariableRef.current = {
          name: name.trim(),
          formulaType: formulaType || null,
        };

        console.log("Requesting variable creation:", {
          name: name.trim(),
          formulaType,
          timestamp: new Date().toISOString()
        });

        // Pass the formula type to indicate which formula should get the new variable
        onCreateVariable(name, formulaType);

        // Clear input after requesting variable creation
        setFormulaInput("");
        return true;
      }
    } catch (error) {
      console.error("Error calling onCreateVariable:", error);
      setIsCreatingVariable(false);
      pendingVariableRef.current = null;
    }
    return false;
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      const numValue = parseFloat(formulaInput);
      if (!isNaN(numValue)) {
        addFormulaToken(formulaInput.trim(), formulaInput.trim(), "number");
        return;
      }

      if (["+", "-", "*", "/", "(", ")", "^"].includes(formulaInput.trim())) {
        addFormulaToken(formulaInput.trim(), formulaInput.trim(), "operator");
        return;
      }

      // ENTER behavior: Create new items when no exact match exists
      if (formulaInput.trim()) {
        const hasExactMatch = suggestions.some((item) => {
          const isProduct = "isProduct" in item && item.isProduct;
          const isCreateSuggestion = "isCreateSuggestion" in item && item.isCreateSuggestion;
          
          if (isCreateSuggestion) return false;
          
          const itemName = isProduct ? item.title : item.name;
          return itemName.toLowerCase() === formulaInput.trim().toLowerCase();
        });

        if (hasExactMatch) {
          // Select the exact match
          const exactMatch = suggestions.find((item) => {
            const isProduct = "isProduct" in item && item.isProduct;
            const isCreateSuggestion = "isCreateSuggestion" in item && item.isCreateSuggestion;
            
            if (isCreateSuggestion) return false;
            
            const itemName = isProduct ? item.title : item.name;
            return itemName.toLowerCase() === formulaInput.trim().toLowerCase();
          });
          
          if (exactMatch) {
            const isProduct = "isProduct" in exactMatch && exactMatch.isProduct;
              if (isProduct) {
              addFormulaToken(exactMatch.id, exactMatch.title, "product");
            } else {
              // Use validation helper for variables
              addVariableWithValidation(exactMatch, exactMatch.name, exactMatch.name);
            }
          }
        } else {
          // No exact match - create new variable
          safeCreateVariable(formulaInput.trim());
        }
      }
    } else if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault();
      
      // TAB behavior: Import first suggestion/exact match
      const selectedItem = suggestions[selectedSuggestion];
      const isProduct = "isProduct" in selectedItem && selectedItem.isProduct;
      const isCreateSuggestion = "isCreateSuggestion" in selectedItem && selectedItem.isCreateSuggestion;

      if (isCreateSuggestion) {
        // Handle create variable suggestion
        safeCreateVariable(selectedItem.name);
        return;
      }

      if (isProduct) {
        // Handle product selection
        addFormulaToken(selectedItem.id, selectedItem.title, "product");
        return;
      }      // Handle variable selection - use validation helper
      addVariableWithValidation(selectedItem, selectedItem.name, selectedItem.name);
    } else if (e.key === "ArrowDown" && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestion((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );    } else if (e.key === "ArrowUp" && showSuggestions) {
      e.preventDefault();
      setSelectedSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
    }
  };

  // Create a stable reference for current formula tokens to avoid infinite loops
  const currentTokenNames = useMemo(() => {
    if (!Array.isArray(formulaTokens)) return [];
    return formulaTokens
      .filter(token => token && token.type === "variable")
      .map(token => token.text.toLowerCase());
  }, [formulaTokens]);

  useEffect(() => {
    if (!formulaInput.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const numValue = parseFloat(formulaInput);
    if (
      !isNaN(numValue) ||
      ["+", "-", "*", "/", "(", ")", "^"].includes(formulaInput.trim())
    ) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter template variables
    let templateMatches = templateVariables.filter(
      (v) =>
        v.name.toLowerCase().includes(formulaInput.toLowerCase()) &&
        !currentTokenNames.includes(v.name.toLowerCase()) &&
        // Exclude the current variable being edited by name
        (!excludeVariableName || v.name.toLowerCase() !== excludeVariableName.toLowerCase())
    );

    let apiMatches: VariableResponse[] = [];
    let productMatches: any[] = [];

    // Filter API variables
    if (variablesData?.data) {
      apiMatches = (variablesData.data as VariableResponse[]).filter(
        (v) =>
          v.name.toLowerCase().includes(formulaInput.toLowerCase()) &&
          !templateMatches.some(
            (tm) => tm.name.toLowerCase() === v.name.toLowerCase()
          ) &&
          !currentTokenNames.includes(v.name.toLowerCase()) &&
          // Exclude the current variable being edited by name
          (!excludeVariableName || v.name.toLowerCase() !== excludeVariableName.toLowerCase())
      );
    }

    // Filter products (only if not excluded)
    if (productsData?.data && !excludeProducts) {
      productMatches = (productsData.data as any[]).filter(
        (p) =>
          p.title?.toLowerCase().includes(formulaInput.toLowerCase()) &&
          !currentTokenNames.includes(p.title?.toLowerCase())
      );

      // Mark products so we can identify them in the UI
      productMatches = productMatches.map((p) => ({
        ...p,
        isProduct: true,
      }));
    }

    // Only show "add as variable" suggestion if input doesn't match existing variable
    const shouldShowCreateSuggestion =
      formulaInput.trim().length >= 2 &&
      isNaN(parseFloat(formulaInput)) &&
      !["+", "-", "*", "/", "(", ")", "^"].includes(formulaInput.trim()) &&
      !variables.some(v => v.name.toLowerCase() === formulaInput.trim().toLowerCase()) &&
      !currentTokenNames.includes(formulaInput.trim().toLowerCase());

    const suggestions = [];

    // Add "create variable" suggestion first if applicable
    if (shouldShowCreateSuggestion) {
      suggestions.push({
        id: `create-${formulaInput}`,
        name: formulaInput.trim(),
        displayText: `Add "${formulaInput.trim()}" as variable`,
        isCreateSuggestion: true,
      });
    }

    // Add other suggestions
    suggestions.push(
      ...templateMatches,
      ...apiMatches.filter((v) => v.is_global),
      ...apiMatches.filter((v) => !v.is_global),
      ...productMatches
    );

    setSuggestions(suggestions);
    setShowSuggestions(true);
    setSelectedSuggestion(0);
  }, [
    formulaInput,
    templateVariables,
    variablesData?.data,
    productsData?.data,
    currentTokenNames,
    excludeVariableName,
    excludeProducts,
    variables,
  ]);

  const isFormulaValid = useMemo(() => {
    return validFormulaTokens.length > 0 && !validationError;
  }, [validFormulaTokens, validationError]);

  // Reset isCreatingVariable when the component re-renders
  useEffect(() => {
    setIsCreatingVariable(false);
  }, [validFormulaTokens]);

  // Handle pending variable addition after creation
  useEffect(() => {
    if (!pendingVariableRef.current) return;

    const pendingVariable = pendingVariableRef.current;

    // Look for a newly created variable that matches the pending name
    const newVariable = variables.find(variable =>
      variable.name.toLowerCase() === pendingVariable.name.toLowerCase() &&
      // Only add if it's not already in the formula
      !validFormulaTokens.some(token =>
        token.type === "variable" &&
        token.text.toLowerCase() === variable.name.toLowerCase()
      )
    );

    if (newVariable) {
      console.log("Adding newly created variable to formula:", {
        variableName: newVariable.name,
        formulaType: pendingVariable.formulaType,
        timestamp: new Date().toISOString()
      });

      // Add the variable token to the formula
      addFormulaToken(newVariable.name, newVariable.name, "variable");

      // Clear the pending variable
      pendingVariableRef.current = null;
      setIsCreatingVariable(false);
    }
  }, [variables, validFormulaTokens]);

  // Validate formula on every token change
  useEffect(() => {
    const { isValid, errorMessage } = validateCompleteFormula(validFormulaTokens);
    if (!isValid && validFormulaTokens.length > 0) {
      setValidationError(errorMessage);
      if (onValidationError) onValidationError(errorMessage);
    } else {
      setValidationError(null);
      if (onValidationError) onValidationError(null);
    }
    // Check for operation at end
    const lastToken = validFormulaTokens[validFormulaTokens.length - 1];
    if (lastToken && lastToken.type === "operator" && ["+", "-", "*", "/", "(", "^"].includes(lastToken.text)) {
      setValidationError(`Formula ends with "${lastToken.text}" - please complete the formula`);
      if (onValidationError) onValidationError(`Formula ends with "${lastToken.text}" - please complete the formula`);
    }
  }, [validFormulaTokens, onValidationError]);

  return (
    <div
      tabIndex={-1}
      onBlur={() => {
        // On true focus out, revalidate (already handled by useEffect, but can force if needed)
        const { isValid, errorMessage } = validateCompleteFormula(validFormulaTokens);
        if (!isValid && validFormulaTokens.length > 0) {
          setValidationError(errorMessage);
          if (onValidationError) onValidationError(errorMessage);
        } else {
          setValidationError(null);
          if (onValidationError) onValidationError(null);
        }
        // Check for operation at end
        const lastToken = validFormulaTokens[validFormulaTokens.length - 1];
        if (lastToken && lastToken.type === "operator" && ["+", "-", "*", "/", "(", "^"].includes(lastToken.text)) {
          setValidationError(`Formula ends with "${lastToken.text}" - please complete the formula`);
          if (onValidationError) onValidationError(`Formula ends with "${lastToken.text}" - please complete the formula`);
        }
      }}
      className={hasError ? "border-red-500" : ""}
    >
      <div
        className={`border rounded-lg p-3 flex flex-wrap gap-2 min-h-[65px] bg-background/50 relative transition-all ${hasError || validationError
          ? "border-red-300 bg-red-50/50"
          : isFormulaValid && validFormulaTokens.length > 0
            ? "border-green-300 bg-green-50/50"
            : "hover:border-primary/30 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20"
          }`}
        onClick={() => inputRef.current?.focus()}
      >
        {validFormulaTokens.map((token) => (
          <Badge
            key={token.id}
            variant="outline"
            className={`gap-1.5 px-2 py-1 text-sm rounded-md transition-all duration-150 hover:shadow cursor-text ${token.type === "variable"
              ? "bg-gradient-to-r from-primary/5 to-primary/10 text-primary border-primary/20 shadow-sm"
              : token.type === "operator"
                ? "bg-gradient-to-r from-amber-500/5 to-amber-500/10 text-amber-700 border-amber-500/20 shadow-sm"
                : token.type === "number"
                  ? "bg-gradient-to-r from-blue-500/5 to-blue-500/10 text-blue-700 border-blue-500/20 shadow-sm"
                  : token.type === "product"
                    ? "bg-gradient-to-r from-green-500/5 to-green-500/10 text-green-700 border-green-500/20 shadow-sm"
                    : "bg-gray-100 text-gray-800 shadow-sm"
              }`}
          >
            {token.type === "variable" ? (
              <Variable className="w-3 h-3 mr-1" />
            ) : token.type === "operator" ? (
              <Calculator className="w-3 h-3 mr-1" />
            ) : token.type === "number" ? (
              <Hash className="w-3 h-3 mr-1" />
            ) : token.type === "product" ? (
              <Package className="w-3 h-3 mr-1" />
            ) : null}
            {token.displayText}
            <button
              type="button"
              className="h-5 w-5 rounded-full hover:bg-white/80 flex items-center justify-center ml-0.5 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                removeFormulaToken(token.id);
              }}
              aria-label={`Remove ${token.displayText}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}

        <Input
          ref={inputRef}
          value={formulaInput}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(!!formulaInput.trim());
          }}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setShowSuggestions(false), 150);
            // Validate complete formula on blur only
            const { isValid, errorMessage } = validateCompleteFormula(validFormulaTokens);
            if (!isValid && validFormulaTokens.length > 0) {
              setValidationError(errorMessage);
              if (onValidationError) onValidationError(errorMessage);
            } else {
              setValidationError(null);
              if (onValidationError) onValidationError(null);
            }
            // Force a revalidation of the formula for operations that appear at the end
            const lastToken = validFormulaTokens[validFormulaTokens.length - 1];
            if (lastToken && lastToken.type === "operator" && ["+", "-", "*", "/", "(", "^"].includes(lastToken.text)) {
              setValidationError(`Formula ends with "${lastToken.text}" - please complete the formula`);
              if (onValidationError) onValidationError(`Formula ends with "${lastToken.text}" - please complete the formula`);
            }
          }}
          onClick={(e) => {
            if (inputRef.current) {
              setCursorPosition(inputRef.current.selectionStart);
            }
          }}
          placeholder={
            validFormulaTokens.length
              ? "Add more..."
              : "Type variables, products, numbers, or operators..."
          }
          className="border-0 shadow-none focus:outline-none focus:ring-0 p-0 h-9 text-sm flex-1 min-w-[40px] bg-transparent"
        />        {showSuggestions && formulaInput && (
          <div className="absolute left-0 top-full mt-1 z-20 w-full bg-background border rounded-md shadow-md max-h-[200px] overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map((item, index) => {
                // Check if this is a product
                const isProduct = "isProduct" in item && item.isProduct;
                // Check if this is a "create variable" suggestion
                const isCreateSuggestion = "isCreateSuggestion" in item && item.isCreateSuggestion;

                const displayName = isProduct ? item.title :
                  isCreateSuggestion ? item.displayText :
                    item.name;
                    
                // Check if this item is an exact match
                const isExactMatch = !isCreateSuggestion && 
                  displayName.toLowerCase() === formulaInput.trim().toLowerCase();

                return (
                  <div
                    key={item.id}
                    className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                      selectedSuggestion === index
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }`}
                    onClick={() => {
                      if (isCreateSuggestion) {
                        safeCreateVariable(item.name);
                      } else if (isProduct) {
                        // Handle product selection
                        addFormulaToken(item.id, item.title, "product");                      } else {
                        // Handle existing variable selection - use validation helper
                        addVariableWithValidation(item, item.name, item.name);
                      }
                    }}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          {isCreateSuggestion ? (
                            <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                          ) : isProduct ? (
                            <Package className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Variable className="w-3.5 h-3.5 text-primary" />
                          )}
                          {displayName}
                          {/* Add price for products */}
                          {isProduct && item.price && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: "USD",
                              }).format(parseFloat(item.price))}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          {isCreateSuggestion && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-blue-100 text-blue-700 border-blue-200"
                            >
                              Create
                            </Badge>
                          )}
                          {!isProduct && !isCreateSuggestion &&
                            !templateVariables.some((v) => v.id === item.id) && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Will add to template
                              </Badge>
                            )}
                          {!isProduct && !isCreateSuggestion && item.is_global && (
                            <Badge variant="secondary" className="text-xs">
                              Global
                            </Badge>
                          )}
                          {isProduct && (
                            <Badge
                              variant="secondary"
                              className="text-xs bg-green-100 text-green-700 border-green-200"
                            >
                              Product
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!isProduct && !isCreateSuggestion && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {isExactMatch ? (
                            <span className="text-xs text-green-600">Exact match</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {displayName.toLowerCase().startsWith(formulaInput.toLowerCase()) 
                                ? `Similar to "${formulaInput}"` 
                                : `Contains "${formulaInput}"`}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="px-1.5 py-0.5 bg-muted/50 rounded">
                          Press <span className="font-medium">Tab</span> to add
                        </span>
                        {isExactMatch && (
                          <span className="px-1.5 py-0.5 bg-muted/50 rounded">
                            Press <span className="font-medium">Enter</span> to select
                          </span>
                        )}
                        {isCreateSuggestion && (
                          <span className="px-1.5 py-0.5 bg-muted/50 rounded">
                            Press <span className="font-medium">Enter</span> to create
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : formulaInput.trim().length >= 2 ? (
              validFormulaTokens.some(
                (token) =>
                  token.type === "variable" &&
                  token.text.toLowerCase() === formulaInput.trim().toLowerCase()
              ) ? (
                <div className="p-3 flex items-center">
                  <div className="flex-1">
                    <span className="text-sm text-muted-foreground">
                      "{formulaInput.trim()}" is already in the formula
                    </span>
                  </div>
                </div>
              ) : !isNaN(parseFloat(formulaInput)) ? (
                <div
                  className="p-3 cursor-pointer hover:bg-accent"
                  onClick={() =>
                    addFormulaToken(
                      formulaInput.trim(),
                      formulaInput.trim(),
                      "number"
                    )
                  }
                >
                  <div className="flex-1">
                    <span className="font-medium text-sm">
                      Use "{formulaInput.trim()}" as number
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Press Enter to add this number
                    </p>
                  </div>
                </div>
              ) : ["+", "-", "*", "/", "(", ")", "^"].includes(
                formulaInput.trim()
              ) ? (
                <div
                  className="p-3 cursor-pointer hover:bg-accent"
                  onClick={() =>
                    addFormulaToken(
                      formulaInput.trim(),
                      formulaInput.trim(),
                      "operator"
                    )
                  }
                >
                  <div className="flex-1">
                    <span className="font-medium text-sm">
                      Use "{formulaInput.trim()}" as operator
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Press Enter to add this operator
                    </p>
                  </div>
                </div>
              ) : variables.some(
                (v) =>
                  v.name.toLowerCase() === formulaInput.trim().toLowerCase()
              ) ? (
                <div
                  className="p-3 cursor-pointer hover:bg-accent"                  onClick={() => {
                    const exactMatch = variables.find(
                      (v) =>
                        v.name.toLowerCase() ===
                        formulaInput.trim().toLowerCase()
                    );
                    if (exactMatch) {
                      // Use validation helper for variables
                      addVariableWithValidation(exactMatch, exactMatch.name, exactMatch.name);
                    }
                  }}
                >
                  <div className="flex-1">
                    <span className="font-medium text-sm">
                      Use "{formulaInput.trim()}"
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Press Enter to use this existing variable
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="p-3 flex items-center cursor-pointer hover:bg-accent"
                  onClick={() => safeCreateVariable(formulaInput.trim())}
                >
                  <div className="flex-1">
                    <span className="font-medium text-sm">
                      Create new variable "{formulaInput.trim()}"
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Press Enter to create this variable and add to formula
                    </p>
                  </div>
                  <PlusCircle className="h-4 w-4 text-muted-foreground ml-2" />
                </div>
              )
            ) : null}
          </div>
        )}
      </div>      {/* Validation messages in normal flow to prevent overlap */}
      {validationError && (
        <div className="text-xs text-red-500 flex items-center mt-1">
          {getFormulaValidationMessage(validationError)}
        </div>
      )}{isFormulaValid && validFormulaTokens.length > 0 && !validationError && (
        <div className="text-xs text-green-600 flex items-center mt-1">
          <span className="flex items-center">
            ✓ Valid formula
          </span>
        </div>
      )}<div className="flex flex-wrap gap-1.5 mt-1">
        {["+", "-", "*", "/", "(", ")", "^"].map((op) => {
          const lastToken = validFormulaTokens[validFormulaTokens.length - 1];
          const isLastTokenOperand = lastToken && (lastToken.type === "variable" || lastToken.type === "number" || lastToken.type === "product");
          
          // When field operation is the last (operand is last), disable opening parenthesis
          const isDisabled = isLastTokenOperand && op === "(";
          
          return (
            <Button
              key={op}
              type="button"
              variant="outline"
              size="sm"
              disabled={isDisabled}
              onClick={() => addFormulaToken(op, op, "operator")}
              className={`h-7 px-2.5 rounded-md transition-colors ${
                isDisabled 
                  ? "bg-muted/20 border-muted text-muted-foreground cursor-not-allowed opacity-50"
                  : "bg-muted/30 border-muted hover:bg-muted/60 hover:text-primary"
              }`}
            >
              {op === "*" ? "×" : op === "/" ? "÷" : op}
            </Button>
          );
        })}
      </div>

      <div className="text-xs text-muted-foreground mt-1">
        Type variable names, product names, numbers, or use the operator
        buttons.
      </div>
    </div>
  );
}
