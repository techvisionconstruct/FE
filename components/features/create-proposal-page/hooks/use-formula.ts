import { useState, useCallback } from "react";
import { VariableResponse } from "@/types/variables/dto";

// FormulaToken interface for formula builder
export interface FormulaToken {
  id: number;
  text: string;
  displayText?: string;
  type: "variable" | "operator" | "number" | "function" | "product";
}

export function useFormula() {
  const [materialFormulaTokens, setMaterialFormulaTokens] = useState<
    FormulaToken[]
  >([]);
  const [laborFormulaTokens, setLaborFormulaTokens] = useState<FormulaToken[]>(
    []
  );
  const [materialFormulaError, setMaterialFormulaError] = useState<
    string | null
  >(null);
  const [laborFormulaError, setLaborFormulaError] = useState<string | null>(
    null
  );

  // Validate formula tokens
  const validateFormulaTokens = useCallback(
    (
      tokens: FormulaToken[]
    ): {
      errorMessage: string;
      isValid: boolean;
      error: string | null;
    } => {
      if (tokens.length === 0) {
        return { isValid: true, errorMessage: "", error: null };
      }

      // Basic validation logic
      let parenthesesCount = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].text === "(") parenthesesCount++;
        if (tokens[i].text === ")") parenthesesCount--;
        if (parenthesesCount < 0) {
          return {
            isValid: false,
            error: "Unbalanced parentheses",
            errorMessage: "",
          };
        }
      }

      if (parenthesesCount > 0) {
        return {
          isValid: false,
          error: "Missing closing parenthesis",
          errorMessage: "",
        };
      }

      return { isValid: true, error: null, errorMessage: "" };
    },
    []
  );

  // Convert formula string to tokens
   const parseFormulaToTokens = useCallback(
      (formula: string): FormulaToken[] => {
        if (!formula) return [];
  
        const tokens: FormulaToken[] = [];
        let currentIndex = 0;
        const variableRegex = /\{([^}]+)\}/g;
        let match;
  
        while ((match = variableRegex.exec(formula)) !== null) {
          if (match.index > currentIndex) {
            const priorText = formula.substring(currentIndex, match.index);
            const parts = priorText.trim().split(/\s+/);
            for (const part of parts) {
              if (!part) continue;
  
              if (["+", "-", "*", "/", "(", ")", "^"].includes(part)) {
                tokens.push({
                  id: Date.now() + tokens.length,
                  text: part,
                  displayText: part,
                  type: "operator",
                });
              } else if (!isNaN(Number(part))) {
                tokens.push({
                  id: Date.now() + tokens.length,
                  text: part,
                  displayText: part,
                  type: "number",
                });
              } else {
                tokens.push({
                  id: Date.now() + tokens.length,
                  text: part,
                  displayText: part,
                  type: "operator",
                });
              }
            }
          }
  
          // Check if this is a product reference (format: {product:ProductName})
          const isProduct = match[1].startsWith("product:");
          const tokenText = isProduct ? match[1].substring(8) : match[1]; // Remove 'product:' prefix
  
          tokens.push({
            id: Date.now() + tokens.length,
            text: match[1], // Keep the full text for formula generation
            displayText: tokenText, // Show cleaner display text without prefix
            type: isProduct ? "product" : "variable",
          });
  
          currentIndex = match.index + match[0].length;
        }
  
        if (currentIndex < formula.length) {
          const remainingText = formula.substring(currentIndex);
          const parts = remainingText.trim().split(/\s+/);
          for (const part of parts) {
            if (!part) continue;
  
            if (["+", "-", "*", "/", "(", ")", "^"].includes(part)) {
              tokens.push({
                id: Date.now() + tokens.length,
                text: part,
                displayText: part,
                type: "operator",
              });
            } else if (!isNaN(Number(part))) {
              tokens.push({
                id: Date.now() + tokens.length,
                text: part,
                displayText: part,
                type: "number",
              });
            } else {
              // Check if this is a product reference that wasn't in curly braces
              const isProduct = part.startsWith("product:");
              const tokenText = isProduct ? part.substring(8) : part;
  
              tokens.push({
                id: Date.now() + tokens.length,
                text: part,
                displayText: tokenText,
                type: isProduct ? "product" : "operator",
              });
            }
          }
        }
  
        return tokens;
      },
      []
    );

  // Convert tokens to formula string
  const tokensToFormulaString = useCallback(
    (tokens: FormulaToken[]): string => {
      return tokens
        .map((token) => {
          if (token.type === "variable" || token.type === "product") {
            return `{${token.text}}`;
          }
          return token.text;
        })
        .join(" ");
    },
    []
  );

  // Replace variable names with IDs in formula
  const replaceVariableNamesWithIds = useCallback(
    (formula: string, variableList: VariableResponse[]): string => {
      if (!formula || !variableList) return formula;

      let backendFormula = formula;
      const namePattern = /\{([^{}]+)\}/g;
      backendFormula = backendFormula.replace(
        namePattern,
        (match, variableName) => {
          const variable = variableList.find((v) => v.name === variableName);
          return variable ? `{${variable.id}}` : match;
        }
      );

      return backendFormula;
    },
    []
  );

  // Replace variable IDs with names in formula
  const replaceVariableIdsWithNames = useCallback(
    (
      formula: string,
      variableList: VariableResponse[],
      formulaVars: Record<string, any>[] = []
    ): string => {
      if (!formula || !variableList) return formula;

      let displayFormula = formula;

      formulaVars.forEach((variable) => {
        const variableName =
          variableList.find((v) => v.id === variable.id)?.name ||
          variable.name ||
          variable.id;

        // Replace all occurrences of {id} with {name}
        const idPattern = new RegExp(`\\{${variable.id}\\}`, "g");
        displayFormula = displayFormula.replace(idPattern, `{${variableName}}`);
      });

      // Also try direct replacement if formula vars doesn't have all we need
      displayFormula = displayFormula.replace(
        /\{([a-zA-Z0-9_-]+)\}/g,
        (match, id) => {
          const variable = variableList.find((v) => v.id === id);
          return variable ? `{${variable.name}}` : match;
        }
      );

      return displayFormula;
    },
    []
  );

  // Replace variable and product IDs with names in formula, using formula variables
  const replaceIdsWithNamesInFormula = useCallback(
    (
      formula: string,
      variableList: VariableResponse[],
      formulaVars: Record<string, any>[] = [],
      productsData?: any[]
    ): string => {
      if (!formula) return formula;

      let displayFormula = formula;

      // Replace using formula variables first (these contain both variables and products)
      formulaVars.forEach((item) => {
        const itemId = item.id;
        let itemName = item.name;

        // Check if this is a product by matching against products data
        if (productsData && itemId) {
          const matchedProduct = productsData.find((product: any) => product.id === itemId);
          if (matchedProduct) {
            itemName = matchedProduct.title;
          }
        }

        // If not found in products, check variables
        if (!itemName && variableList) {
          const variable = variableList.find((v) => v.id === itemId);
          itemName = variable?.name || itemId;
        }

        // Replace all occurrences of {id} with {name}
        if (itemId && itemName) {
          const idPattern = new RegExp(`\\{${itemId}\\}`, "g");
          displayFormula = displayFormula.replace(idPattern, `{${itemName}}`);
        }
      });

      // Fallback: try direct replacement for any remaining IDs
      displayFormula = displayFormula.replace(
        /\{([a-zA-Z0-9_-]+)\}/g,
        (match, id) => {
          // First check products
          if (productsData) {
            const product = productsData.find((p: any) => p.id === id);
            if (product) {
              return `{${product.title}}`;
            }
          }

          // Then check variables
          const variable = variableList?.find((v) => v.id === id);
          return variable ? `{${variable.name}}` : match;
        }
      );

      return displayFormula;
    },
    []
  );

  // Check if a variable is already in the formula
  const isVariableInFormula = useCallback(
    (variableName: string, tokens: FormulaToken[]): boolean => {
      return tokens.some(
        (token) =>
          token.type === "variable" &&
          token.text.toLowerCase() === variableName.toLowerCase()
      );
    },
    []
  );

  // Check if input is a number (for formula validation)
  const isNumeric = useCallback((text: string): boolean => {
    return !isNaN(parseFloat(text)) && isFinite(Number(text));
  }, []);

  // Check if the given text should be treated as a variable name
  const shouldBeVariable = useCallback(
    (text: string): boolean => {
      // Not a variable if it's a number or an operator
      if (
        isNumeric(text) ||
        ["+", "-", "*", "/", "(", ")", "^"].includes(text)
      ) {
        return false;
      }
      return true;
    },
    [isNumeric]
  );

  return {
    materialFormulaTokens,
    setMaterialFormulaTokens,
    laborFormulaTokens,
    setLaborFormulaTokens,
    materialFormulaError,
    setMaterialFormulaError,
    laborFormulaError,
    setLaborFormulaError,
    validateFormulaTokens,
    parseFormulaToTokens,
    tokensToFormulaString,
    replaceVariableNamesWithIds,
    replaceVariableIdsWithNames,
    replaceIdsWithNamesInFormula,
    isVariableInFormula,
    isNumeric,
    shouldBeVariable,
  };
}
