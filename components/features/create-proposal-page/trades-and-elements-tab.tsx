"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Label,
  Badge,
  Input,
  Textarea,
  ScrollArea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shared";
import { toast } from "sonner";
import { X, BracesIcon, Variable, Search, Loader2, Calculator, PercentIcon, PlusCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import AddElementDialog from "./add-element-dialog";
import EditElementDialog from "./edit-element-dialog";
import AddTradeDialog from "./add-trade-dialog";
import EditVariableDialog from "./edit-variable-dialog";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounceCallback } from "@/hooks/use-debounce-callback";

import { getAllVariableTypes } from "@/api-calls/variable-types/get-all-variable-types";

import { createVariable } from "@/api-calls/variables/create-variable";
import { updateVariable } from "@/api-calls/variables/update-variable";
import { createTrade } from "@/api-calls/trades/create-trade";
import { updateTrade } from "@/api-calls/trades/update-trade";
import { createElement } from "@/api-calls/elements/create-element";
import { patchElement } from "@/api-calls/elements/patch-element";
import { updateProposalTemplate } from "@/api-calls/proposals/update-proposal-template";
import { useElementPatchMutation } from "@/mutation-options";

import { VariableResponse, VariableUpdateRequest } from "@/types/variables/dto";
import { ElementResponse } from "@/types/elements/dto";
import { TradeResponse } from "@/types/trades/dto";
import { replaceVariableIdsWithNames } from "@/helpers/replace-variable-ids-with-names";
import { replaceVariableNamesWithIds } from "@/helpers/replace-variable-names-with-ids";
import { TemplateResponse } from "@/types/templates/dto";
import { getTrades } from "@/query-options/trades";
import { getElements } from "@/query-options/elements";
import { getVariables } from "@/query-options/variables";
import { getProducts } from "@/query-options/products";
import { ProductResponse } from "@/types/products/dto";

declare global {
  interface Window {
    openVariableDialog?: (variableName: string, callback: (newVar: any) => void) => void;
  }
}

interface TradesAndElementsStepProps {
  data: {
    trades: TradeResponse[];
    variables: VariableResponse[];
  };
  templateId: string | null;
  template: TemplateResponse | null;
  updateTrades: (trades: TradeResponse[]) => void;
  updateVariables?: (variables: VariableResponse[]) => void;
}

const extractFormulaVariables = (formula: string): Record<string, any>[] => {
  if (!formula) return [];
  const matches = formula.match(/\{([^}]+)\}/g) || [];
  return matches.map(match => {
    const id = match.substring(1, match.length - 1);
    return { id };
  });
};

// Enhanced calculation function that handles both variables and products
const calculateFormulaValue = (
  formula: string, 
  variables: VariableResponse[], 
  formulaVariables?: Record<string, any>[]
): number | null => {
  if (!formula) return null;

  try {
    // Create a map of values from variables
    const variableValues: Record<string, number> = {};
    variables.forEach(variable => {
      if (variable.id) {
        variableValues[variable.id] = variable.value || 0;
      }
    });

    // Add values from formula variables (which includes both variables and products)
    const formulaValues: Record<string, number> = {};
    if (formulaVariables && formulaVariables.length > 0) {
      formulaVariables.forEach(item => {
        // Handle both variable and product formats from backend
        const itemId = item.id || item.variable_id || item.product_id;
        const itemValue = item.value || item.cost || 0;
        
        if (itemId) {
          formulaValues[itemId] = typeof itemValue === 'number' ? itemValue : 0;
        }
      });
    }

    let evalFormula = formula;
    const matches = formula.match(/\{([^}]+)\}/g) || [];
    
    for (const match of matches) {
      const itemId = match.slice(1, -1);
      
      // If we have formula variables, prioritize them; otherwise use regular variables
      let itemValue: number | undefined;
      
      if (formulaVariables && formulaVariables.length > 0) {
        // First check formula variables (includes both variables and products)
        itemValue = formulaValues[itemId];
        
        // If not found in formula variables, check regular variables as fallback
        if (itemValue === undefined) {
          itemValue = variableValues[itemId];
        }
      } else {
        // If no formula variables provided, use regular variables directly
        itemValue = variableValues[itemId];
      }
      
      // Replace with value or 0 if not found
      if (itemValue !== undefined) {
        evalFormula = evalFormula.replace(match, itemValue.toString());
      } else {
        evalFormula = evalFormula.replace(match, "0");
      }
    }
    
    evalFormula = evalFormula.replace(/\*/g, '*').replace(/\//g, '/');
    
    const result = new Function(`return ${evalFormula}`)();
    return typeof result === 'number' ? result : null;
  } catch (error) {
    console.error("Error calculating formula value:", error);
    return null;  }
};

// Helper function to merge formula variables with actual current values
const mergeFormulaVariablesWithCurrentValues = (
  formulaVariables: Record<string, any>[] = [],
  products: ProductResponse[] = []
): Record<string, any>[] => {
    return formulaVariables.map(item => {
      // If this is a product, find the current product data and get its price
      if (item.type === 'product' && item.product_id) {
        const currentProduct = products.find(p => p.id === item.product_id);
        if (currentProduct) {
          return {
            ...item,
            id: item.product_id,
            cost: currentProduct.price || 0,
            value: currentProduct.price || 0
          };
        }
      }
      // For variables, keep as is (they already have current values)
      return item;
    });
  };

// Memoized cost calculation helper
const useMemoizedElementCosts = (
  elements: ElementResponse[], 
  variables: VariableResponse[], 
  products: ProductResponse[] = [],
  trigger: number = 0
) => {
  return useMemo(() => {
    const elementCosts: Record<string, { materialCost: number | null; laborCost: number | null; totalCost: number }> = {};
    
    elements.forEach(element => {
      let materialCost: number;
      let laborCost: number;
      
      // If there's a formula, calculate base cost and apply markup
      // If there's no formula, use backend value (which already includes markup)
      if (element.material_cost_formula) {
        // Merge formula variables with current product values
        const materialFormulaVariablesWithValues = mergeFormulaVariablesWithCurrentValues(
          element.material_formula_variables, 
          products
        );
        
        const baseMaterialCost = calculateFormulaValue(
          element.material_cost_formula, 
          variables,
          materialFormulaVariablesWithValues
        ) || 0;
        const markupMultiplier = 1 + ((element.markup || 0) / 100);
        materialCost = baseMaterialCost * markupMultiplier;
      } else {
        // Backend value already includes markup
        materialCost = element.material_cost || 0;
      }
      
      if (element.labor_cost_formula) {
        // Merge formula variables with current product values
        const laborFormulaVariablesWithValues = mergeFormulaVariablesWithCurrentValues(
          element.labor_formula_variables, 
          products
        );
        
        const baseLaborCost = calculateFormulaValue(
          element.labor_cost_formula, 
          variables,
          laborFormulaVariablesWithValues
        ) || 0;
        const markupMultiplier = 1 + ((element.markup || 0) / 100);
        laborCost = baseLaborCost * markupMultiplier;
      } else {
        // Backend value already includes markup
        laborCost = element.labor_cost || 0;
      }
      
      const totalCost = materialCost + laborCost;
      
      elementCosts[element.id] = {
        materialCost,
        laborCost,
        totalCost
      };
    });
      return elementCosts;
  }, [elements, variables, products, trigger]);
};

const TradesAndElementsStep: React.FC<TradesAndElementsStepProps> = ({
  data,
  templateId,
  template,
  updateTrades,
  updateVariables = () => {},
}) => {
  const queryClient = useQueryClient();
  const variables = data.variables || [];
  // Create a wrapper function to convert simple function to React state setter
  const updateVariablesWrapper: React.Dispatch<React.SetStateAction<VariableResponse[]>> = (newVariables) => {    if (typeof newVariables === 'function') {
      // If it's a function, call it with current variables and pass the result to updateVariables
      const updatedVariables = newVariables(variables);
      updateVariables(updatedVariables);
    } else {
      // If it's an array, pass it directly
      updateVariables(newVariables);
    }  };

  // API Query for variables (for auto-importing)
  const { data: variablesData } = useQuery(
    getVariables(1, 1000) // Get a large number to ensure we have all available variables
  );

  const updateVariableWithFormulaValue = (variable: VariableResponse): VariableResponse => {
    if (variable.formula) {
      const calculatedValue = calculateFormulaValue(variable.formula, variables);
      return {
        ...variable,
        value: calculatedValue || variable.value
      };
    }
    return variable;
  };

  const [showEditVariableDialog, setShowEditVariableDialog] = useState(false);
  const [currentVariableId, setCurrentVariableId] = useState<string | null>(null);
  const [editVariableName, setEditVariableName] = useState("");
  const [editVariableDescription, setEditVariableDescription] = useState("");
  const [editVariableValue, setEditVariableValue] = useState(0);
  const [editVariableType, setEditVariableType] = useState("");
  const [editVariableFormula, setEditVariableFormula] = useState("");
  const [isUpdatingVariable, setIsUpdatingVariable] = useState(false);

  const [inlineEditingVariableId, setInlineEditingVariableId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<number>(0);

  const [newVarName, setNewVarName] = useState("");
  const [newVarDefaultValue, setNewVarDefaultValue] = useState(0);
  const [newVarDescription, setNewVarDescription] = useState("");
  const [newVarDefaultVariableType, setNewVarDefaultVariableType] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(-1);
  const [newTradeName, setNewTradeName] = useState("");
  const [newTradeDescription, setNewTradeDescription] = useState("");
  const [newTradeImage, setNewTradeImage] = useState("");
  const trades = data.trades || [];

  const [isProcessingTemplate, setIsProcessingTemplate] = useState(false);
  const [templateProcessed, setTemplateProcessed] = useState(false);

  const [elementSearchQueries, setElementSearchQueries] = useState<Record<string, string>>({});
  const [showAddElementDialog, setShowAddElementDialog] = useState(false);
  const [showEditElementDialog, setShowEditElementDialog] = useState(false);
  const [currentTradeId, setCurrentTradeId] = useState<string | null>(null);
  const [currentElementId, setCurrentElementId] = useState<string | null>(null);
  const [newElementName, setNewElementName] = useState("");
  const [newElementDescription, setNewElementDescription] = useState("");
  const [newElementMaterialFormula, setNewElementMaterialFormula] = useState("");
  const [newElementLaborFormula, setNewElementLaborFormula] = useState("");
  const [elementMarkup, setElementMarkup] = useState<number>(0);

  const [materialSuggestions, setMaterialSuggestions] = useState<VariableResponse[]>([]);
  const [laborSuggestions, setLaborSuggestions] = useState<VariableResponse[]>([]);
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);
  const [showLaborSuggestions, setShowLaborSuggestions] = useState(false);
  const [selectedMaterialSuggestion, setSelectedMaterialSuggestion] = useState<number>(0);
  const [selectedLaborSuggestion, setSelectedLaborSuggestion] = useState<number>(0);
  const [formulaFieldSource, setFormulaFieldSource] = useState<"material" | "labor" | null>(null);
  const [pendingVariableName, setPendingVariableName] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const [tradeSearchQuery, setTradeSearchQuery] = useState("");
  const [debouncedTradeSearchQuery, setDebouncedTradeSearchQuery] = useState("");
  const [isTradeSearchOpen, setIsTradeSearchOpen] = useState(false);
  
  const [elementSearchQuery, setElementSearchQuery] = useState("");
  const [debouncedElementSearchQuery, setDebouncedElementSearchQuery] = useState("");
  const [isElementSearchOpen, setIsElementSearchOpen] = useState(false);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddTradeDialog, setShowAddTradeDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showingFormulaIds, setShowingFormulaIds] = useState<Record<string, boolean>>({});

  const [pendingVariableCallback, setPendingVariableCallback] = useState<
    ((newVariable: VariableResponse) => void) | null
  >(null);
  const [isGlobalMarkupEnabled, setIsGlobalMarkupEnabled] = useState(false);
  const [globalMarkupValue, setGlobalMarkupValue] = useState(1);
  const [editingMarkupElementId, setEditingMarkupElementId] = useState<string | null>(null);
  const [inlineMarkupValue, setInlineMarkupValue] = useState(0);
    // State for tracking element cost loading states
  const [updatingElementCosts, setUpdatingElementCosts] = useState<Set<string>>(new Set());
  
  // Force re-render trigger for cost calculations
  const [costUpdateTrigger, setCostUpdateTrigger] = useState(0);

  // Debounced search callbacks
  const debouncedVariableSearch = useDebounceCallback(
    (query: string) => {
      setDebouncedSearchQuery(query);
    },
    300
  );
  
  const debouncedTradeSearch = useDebounceCallback(
    (query: string) => {
      setDebouncedTradeSearchQuery(query);
    },
    300
  );
  
  const debouncedElementSearch = useDebounceCallback(
    (query: string) => {
      setDebouncedElementSearchQuery(query);
    },
    300
  );

  // Effect to trigger debounced searches
  useEffect(() => {
    debouncedVariableSearch(searchQuery);
  }, [searchQuery, debouncedVariableSearch]);

  useEffect(() => {
    debouncedTradeSearch(tradeSearchQuery);
  }, [tradeSearchQuery, debouncedTradeSearch]);

  useEffect(() => {
    debouncedElementSearch(elementSearchQuery);
  }, [elementSearchQuery, debouncedElementSearch]);

  const toggleFormulaDisplay = (variableId: string) => {
    setShowingFormulaIds(prev => ({
      ...prev,
      [variableId]: !prev[variableId]
    }));
  };

  const { data: tradesData, isLoading: tradesLoading } = useQuery(
    getTrades(1, 10, debouncedTradeSearchQuery)
  );
  const { data: elementsData, isLoading: elementsLoading } = useQuery(
    getElements(1, 10, debouncedElementSearchQuery)
  );  const { data: searchVariablesData, isLoading: variablesLoading } = useQuery(
    getVariables(1, 10, debouncedSearchQuery)
  );
  const { data: productsData, isLoading: productsLoading } = useQuery(
    getProducts(1, 1000) // Get a large number to ensure we have all products for formulas
  );
  const { data: apiVariableTypes = [], isLoading: isLoadingVariableTypes } =
    useQuery({
      queryKey: ["variable-types"],
      queryFn: () => getAllVariableTypes(),
    });  // Memoized cost calculations for all elements
  const allElements = useMemo(() => trades.flatMap(trade => trade.elements || []), [trades]);
  const elementCosts = useMemoizedElementCosts(allElements, variables, productsData?.data || [], costUpdateTrigger);

  useEffect(() => {
    window.openVariableDialog = (variableName: string, callback: (newVar: any) => void) => {
      setPendingVariableCallback(() => callback);
      setNewVarName(variableName);
      setShowAddDialog(true);
    };

    return () => {
      delete window.openVariableDialog;
    };
  }, []);
  const { mutate: createVariableMutation } = useMutation({
    mutationFn: createVariable,
    onSuccess: (response) => {
      if (response && response.data) {
        const createdVariable = response.data;        updateVariables([...variables, createdVariable]);        // Only invalidate variables query - other queries will be updated through optimistic updates        queryClient.invalidateQueries({ queryKey: ["variables"] });
        
        // Force cost recalculation
        setCostUpdateTrigger(prev => prev + 1);

        if (pendingVariableCallback) {
          try {
            pendingVariableCallback(createdVariable);
            setPendingVariableCallback(null);
          } catch (error) {
            console.error("Error in pendingVariableCallback:", error);
          }
        }

        if (formulaFieldSource === "material" && pendingVariableName) {
          const formula = newElementMaterialFormula;
          const lastBraceIndex = formula.lastIndexOf("{" + pendingVariableName);
          if (lastBraceIndex !== -1) {
            const newFormula =
              formula.substring(0, lastBraceIndex) +
              `{${createdVariable.name}}` +
              formula.substring(
                lastBraceIndex + pendingVariableName.length + 1
              );
            setNewElementMaterialFormula(newFormula);
          }
        } else if (formulaFieldSource === "labor" && pendingVariableName) {
          const formula = newElementLaborFormula;
          const lastBraceIndex = formula.lastIndexOf("{" + pendingVariableName);
          if (lastBraceIndex !== -1) {
            const newFormula =
              formula.substring(0, lastBraceIndex) +
              `{${createdVariable.name}}` +
              formula.substring(
                lastBraceIndex + pendingVariableName.length + 1
              );
            setNewElementLaborFormula(newFormula);
          }
        }

        setFormulaFieldSource(null);
        setPendingVariableName("");

        toast.success("Variable created successfully", {
          position: "top-center",
          description: `"${createdVariable.name}" has been added to your proposal.`,
        });

        setShowAddDialog(false);
        setNewVarName("");
        setNewVarDescription("");
        setNewVarDefaultValue(0);
        setNewVarDefaultVariableType("");
        setIsSubmitting(false);
      }
    },
    onError: (error) => {
      toast.error("Failed to create variable", {
        position: "top-center",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
      setIsSubmitting(false);
      setPendingVariableCallback(null);
    },
  });

  const handleAddVariable = () => {
    if (!newVarName.trim()) return;
    const variableData = {
      name: newVarName.trim(),
      description: newVarDescription.trim() || undefined,
      origin: "derived",
      value: newVarDefaultValue,
      is_global: false,
      variable_type: newVarDefaultVariableType,
    };
    setIsSubmitting(true);
    createVariableMutation(variableData);
  };  const { mutate: updateVariableMutation } = useMutation({
    mutationFn: ({
      variableId,
      data,
    }: {
      variableId: string;
      data: VariableUpdateRequest;
    }) => updateVariable(variableId, data),
    onSuccess: (response) => {
      if (response && response.data) {
        const updatedVariable = response.data;
        
        // Update variable data in cache directly using setQueryData
        queryClient.setQueryData(['variables'], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data?.map((variable: any) =>
              variable.id === updatedVariable.id ? updatedVariable : variable
            ) || []
          };
        });

        // Update local variables state
        const updatedVariables = variables.map(v => 
          v.id === updatedVariable.id ? updatedVariable : v
        );
        updateVariables(updatedVariables);
      }
      
      toast.success("Variable updated successfully");
      setShowEditVariableDialog(false);
      setCurrentVariableId(null);
    },
    onError: (error) => {
      toast.error(`Error updating variable: ${error.message}`);
    },
  });

  const { mutate: createTradeMutation, isPending: isCreatingTrade } =
    useMutation({
      mutationFn: createTrade,      onSuccess: (response) => {
        if (response && response.data) {
          const createdTrade = response.data;
          const updatedTrades = [...trades, createdTrade];
          updateTrades(updatedTrades);
          
          // Only invalidate trades query - elements will be updated through optimistic updates
          queryClient.invalidateQueries({ queryKey: ["trades"] });
          
          // Auto-update template with new trade
          if (templateId) {
            console.log("🔄 Auto-updating template after trade creation:", {
              templateId,
              tradesCount: updatedTrades.length,
              variablesCount: variables.length,
              tradeName: createdTrade.name
            });
            
            updateTemplateMutation({
              templateId: templateId,
              data: { 
                trades: updatedTrades.map((t) => t.id),
                variables: variables.map((v) => v.id)
              },
            });
          }
          
          toast.success("Trade created and template updated automatically", {
            position: "top-center",
            description: `"${createdTrade.name}" has been added to your proposal.`,
          });          setShowAddTradeDialog(false);
          setNewTradeName("");
          setNewTradeDescription("");
          setNewTradeImage("");
        }
      },
      onError: (error) => {
        toast.error("Failed to create trade", {
          position: "top-center",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      },
    });

  const { mutate: updateTradeMutation, isPending: isUpdatingTrade } =
    useMutation({      mutationFn: ({
        tradeId,
        data,
      }: {
        tradeId: string;
        data: { elements: string[] };
      }) => updateTrade(tradeId, data),
      onSuccess: () => {
        // Optimized: Only invalidate trades query for trade updates
        queryClient.invalidateQueries({ queryKey: ["trades"] });
      },
    });

  const { mutate: updateTemplateMutation, isPending: isUpdatingTemplate } =
    useMutation({
      mutationFn: ({
        templateId,
        data,
      }: {
        templateId: string;
        data: { variables?: string[]; trades?: string[] };
      }) => updateProposalTemplate(templateId, data),      onSuccess: () => {        
        // Optimized: Reduce invalidations to only templates-related queries
        queryClient.invalidateQueries({ queryKey: ["variables"] });
        queryClient.invalidateQueries({ queryKey: ["trades"] });
        
        toast.success("Template updated successfully", {
          position: "top-center",
          description:
            "Template has been updated with the latest variables and trades.",
        });
      },
      onError: (error) => {
        toast.error("Failed to update template", {
          position: "top-center",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      },
    });
  const { mutate: updateElementMutation, isPending: isUpdatingElement } =
    useElementPatchMutation({
      onSuccess: (response) => {
        if (response && response.data) {
          const updatedElement = response.data;

          // Update element data in cache directly using setQueryData
          queryClient.setQueryData(['elements'], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              data: oldData.data?.map((element: any) =>
                element.id === updatedElement.id ? updatedElement : element
              ) || []
            };
          });

          // Update trades data in cache directly
          queryClient.setQueryData(['trades'], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              data: oldData.data?.map((trade: any) => {
                if (trade.elements && trade.elements.some((e: any) => e.id === updatedElement.id)) {
                  return {
                    ...trade,
                    elements: trade.elements.map((element: any) =>
                      element.id === updatedElement.id ? updatedElement : element
                    ),
                  };
                }
                return trade;
              }) || []
            };
          });

          const updatedTrades = trades.map((trade) => {
            if (
              trade.elements &&
              trade.elements.some((e) => e.id === updatedElement.id)
            ) {
              return {
                ...trade,
                elements: trade.elements.map((element) =>
                  element.id === updatedElement.id ? updatedElement : element
                ),
              };
            }
            return trade;
          });

          updateTrades(updatedTrades);

          setShowEditElementDialog(false);
          setCurrentElementId(null);
          setNewElementName("");
          setNewElementDescription("");
          setNewElementMaterialFormula("");
          setNewElementLaborFormula("");
        }
      },
      onError: (error) => {
        toast.error("Failed to update element", {
          position: "top-center",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      },
    });

  const { mutate: createElementMutation, isPending: isCreatingElement } =
    useMutation({
      mutationFn: createElement,      onSuccess: (response) => {
        if (response && response.data) {
          const createdElement = response.data;          
          // Update local state optimistically
          const updatedTrades = trades.map((trade) => {
            if (trade.id === currentTradeId) {
              return {
                ...trade,
                elements: [...(trade.elements || []), createdElement],
              };
            }
            return trade;
          });

          updateTrades(updatedTrades);

          if (currentTradeId) {
            const currentTrade = trades.find(
              (trade) => trade.id === currentTradeId
            );
            if (currentTrade) {
              const updatedElements = [
                ...(currentTrade.elements || []),
                createdElement,
              ].map((elem) => elem.id);

              updateTradeMutation({
                tradeId: currentTradeId,
                data: { elements: updatedElements },
              });
            }
          }

          toast.success("Element created successfully", {
            position: "top-center",
            description: `"${createdElement.name}" has been added to the trade.`,
          });

          setShowAddElementDialog(false);
          setNewElementName("");
          setNewElementDescription("");
          setNewElementMaterialFormula("");
          setNewElementLaborFormula("");
        }
      },
      onError: (error) => {
        toast.error("Failed to create element", {
          position: "top-center",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      },
    });
  const filteredVariables =
    searchQuery === ""
      ? []
      : Array.isArray(searchVariablesData?.data)
      ? (searchVariablesData.data as VariableResponse[]).filter(
          (variable) =>
            variable.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            variable.origin === "original" &&
            !variables.some((v) => v.id === variable.id)
        )
      : [];
  const filteredTrades =
    tradeSearchQuery === ""
      ? []
      : Array.isArray(tradesData?.data)
      ? (tradesData.data as TradeResponse[]).filter(
          (trade) =>
            trade.name.toLowerCase().includes(tradeSearchQuery.toLowerCase()) &&
            !trades.some((t) => t.id === trade.id.toString()) &&
            trade.origin === "original"
        )
      : [];
  const filteredElements =
    elementSearchQuery === ""
      ? []
      : Array.isArray(elementsData?.data)
      ? (elementsData.data as ElementResponse[]).filter((element) => {
          const matchesQuery =
            element.name
              .toLowerCase()
              .includes(elementSearchQuery.toLowerCase()) &&
            element.origin === "original";

          const currentTrade = trades.find((t) => t.id === currentTradeId);

          const isAlreadyInTrade = currentTrade?.elements?.some(
            (e) => e.id === element.id.toString()
          );

          return matchesQuery && !isAlreadyInTrade;
        })
      : [];

  // Add helper function to extract variable names from formulas
  const extractVariableNamesFromFormula = (formula: string): string[] => {
    if (!formula) return [];
    const matches = formula.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => match.slice(1, -1));
  };

  // Add helper function to check exact matches
  const hasExactMatch = (query: string, items: any[], nameField: string = 'name') => {
    return items.some(
      (item) => item[nameField].toLowerCase() === query.toLowerCase()
    );
  };

  const filterVariableSuggestions = (
    input: string,
    prefix: string = ""
  ): VariableResponse[] => {
    if (!input || !prefix) return [];

    const lastSpaceIndex = input.lastIndexOf(prefix);
    if (lastSpaceIndex === -1) return [];

    const currentPartial = input
      .substring(lastSpaceIndex + prefix.length)
      .trim();
    if (!currentPartial) return [];

    return variables.filter((variable) =>
      variable.name.toLowerCase().includes(currentPartial.toLowerCase())
    );
  };

  const handleMaterialFormulaChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setNewElementMaterialFormula(value);

    if (value.includes("{") && !value.endsWith("}")) {
      const suggestions = filterVariableSuggestions(value, "{");
      setMaterialSuggestions(suggestions);
      setShowMaterialSuggestions(suggestions.length > 0);
      setSelectedMaterialSuggestion(0);
    } else {
      setShowMaterialSuggestions(false);
    }
  };

  const handleLaborFormulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewElementLaborFormula(value);

    if (value.includes("{") && !value.endsWith("}")) {
      const suggestions = filterVariableSuggestions(value, "{");
      setLaborSuggestions(suggestions);
      setShowLaborSuggestions(suggestions.length > 0);
      setSelectedLaborSuggestion(0);

      const lastBraceIndex = value.lastIndexOf("{");
      if (lastBraceIndex !== -1) {
        const partialVarName = value.substring(lastBraceIndex + 1).trim();

        if (
          partialVarName &&
          (e.nativeEvent as InputEvent).inputType === "insertLineBreak" &&
          suggestions.length === 0
        ) {
          setPendingVariableName(partialVarName);
          setFormulaFieldSource("labor");
          setNewVarName(partialVarName);
          setShowAddDialog(true);
          setShowLaborSuggestions(false);

          setNewElementLaborFormula(value.replace(/\n/g, ""));
        }
      }
    } else {
      setShowLaborSuggestions(false);
    }
  };

  const insertVariableInFormula = (
    formula: string,
    variableName: string
  ): string => {
    const lastOpenBrace = formula.lastIndexOf("{");
    if (lastOpenBrace === -1) return formula;

    return formula.substring(0, lastOpenBrace) + `{${variableName}}` + " ";
  };

  const handleMaterialFormulaKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (showMaterialSuggestions && materialSuggestions.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedMaterialSuggestion((prev) =>
            prev < materialSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedMaterialSuggestion((prev) =>
            prev > 0 ? prev - 1 : materialSuggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (materialSuggestions[selectedMaterialSuggestion]) {
            const selectedVar = materialSuggestions[selectedMaterialSuggestion];
            setNewElementMaterialFormula((prev) =>
              insertVariableInFormula(prev, selectedVar.name)
            );
            setShowMaterialSuggestions(false);
          }
          break;
        case "Escape":
          setShowMaterialSuggestions(false);
          break;
      }
      return;
    }

    if (
      e.key === "Enter" &&
      newElementMaterialFormula.includes("{") &&
      !newElementMaterialFormula.endsWith("}")
    ) {
      e.preventDefault();

      const lastBraceIndex = newElementMaterialFormula.lastIndexOf("{");
      if (lastBraceIndex !== -1) {
        const partialVarName = newElementMaterialFormula
          .substring(lastBraceIndex + 1)
          .trim();

        if (
          partialVarName &&
          !variables.some(
            (v) => v.name.toLowerCase() === partialVarName.toLowerCase()
          )
        ) {
          setNewVarName(partialVarName);
          setFormulaFieldSource("material");
          setPendingVariableName(partialVarName);
          setShowAddDialog(true);
        }
      }
    }
  };

  const handleLaborFormulaKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (showLaborSuggestions && laborSuggestions.length > 0) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedLaborSuggestion((prev) =>
            prev < laborSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedLaborSuggestion((prev) =>
            prev > 0 ? prev - 1 : laborSuggestions.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (laborSuggestions[selectedLaborSuggestion]) {
            const selectedVar = laborSuggestions[selectedLaborSuggestion];
            setNewElementLaborFormula((prev) =>
              insertVariableInFormula(prev, selectedVar.name)
            );
            setShowLaborSuggestions(false);
          }
          break;
        case "Escape":
          setShowLaborSuggestions(false);
          break;
      }
      return;
    }

    if (
      e.key === "Enter" &&
      newElementLaborFormula.includes("{") &&
      !newElementLaborFormula.endsWith("}")
    ) {
      e.preventDefault();

      const lastBraceIndex = newElementLaborFormula.lastIndexOf("{");
      if (lastBraceIndex !== -1) {
        const partialVarName = newElementLaborFormula
          .substring(lastBraceIndex + 1)
          .trim();

        if (
          partialVarName &&
          !variables.some(
            (v) => v.name.toLowerCase() === partialVarName.toLowerCase()
          )
        ) {
          setNewVarName(partialVarName);
          setFormulaFieldSource("labor");
          setPendingVariableName(partialVarName);
          setShowAddDialog(true);
        }
      }
    }
  };

  const handleSelectVariable = (variable: VariableResponse) => {
    const newVar: VariableResponse = {
      id: variable.id.toString(),
      name: variable.name,
      description: variable.description,
      value: variable.value,
      formula: variable.formula || "",
      is_global: variable.is_global,
      variable_type: variable.variable_type,
      created_at: variable.created_at,
      updated_at: variable.updated_at,
      created_by: variable.created_by,
      updated_by: variable.updated_by,
    };    if (!variables.some((v) => v.id === newVar.id)) {
      const updatedVariables = [...variables, newVar];      updateVariables(updatedVariables);      // Only invalidate specific queries that need fresh data
      queryClient.invalidateQueries({ queryKey: ["variables"] });
      
      // Force cost recalculation
      setCostUpdateTrigger(prev => prev + 1);

      if (templateId) {
        updateTemplateMutation({
          templateId: templateId,
          data: { variables: updatedVariables.map((v) => v.id) },
        });
      }
    }

    setIsSearchOpen(false);
    setSearchQuery("");
  };
  const handleRemoveVariable = (variableId: string) => {
    const updatedVariables = variables.filter((v) => v.id !== variableId);
    updateVariables(updatedVariables);
    
    // Optimized: Only invalidate variables query since other queries will update through relationships
    queryClient.invalidateQueries({ queryKey: ["variables"] });
    
    // Force cost recalculation
    setCostUpdateTrigger(prev => prev + 1);

    if (templateId) {
      updateTemplateMutation({
        templateId: templateId,
        data: { variables: updatedVariables.map((v) => v.id) },
      });
    }
  };

  const isZeroOrEmpty = (value: any): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'number') {
      return Math.abs(value) < 0.0001;
    }
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      return !isNaN(numValue) && Math.abs(numValue) < 0.0001;
    }
    return false;
  };

  useEffect(() => {
    const zeroValueVariables = variables.filter(v => isZeroOrEmpty(v.value));
    if (zeroValueVariables.length > 0 && inlineEditingVariableId === null) {
      setInlineEditingVariableId("zero-values-ready");
    }
  }, [variables]);
  useEffect(() => {
    if (variables.length > 0) {
      const updatedVariables = variables.map(updateVariableWithFormulaValue);
      const hasChanges = updatedVariables.some((updatedVar, idx) => 
        updatedVar.value !== variables[idx].value
      );
      
      if (hasChanges) {        updateVariables(updatedVariables);
          // Only invalidate variables query when formulas are recalculated
        queryClient.invalidateQueries({ queryKey: ["variables"] });
        
        // Force cost recalculation
        setCostUpdateTrigger(prev => prev + 1);
      }
    }
  }, [variables, updateVariables, queryClient, setCostUpdateTrigger]);

  const startInlineValueEdit = (variable: VariableResponse) => {
    setInlineEditingVariableId(variable.id);
    setInlineEditValue(variable.value || 0);
  };
  const saveInlineValueEdit = async (variableId: string, newValue: number) => {
    if (inlineEditingVariableId === "zero-values-ready") {
      if (variableId !== "zero-values-ready") {
        setInlineEditingVariableId(variableId);
      }
      return;
    }

    const variableToUpdate = variables.find(v => v.id === variableId);
    if (!variableToUpdate) return;

    setIsUpdatingVariable(true);

    const variableData = {
      name: variableToUpdate.name,
      description: variableToUpdate.description || undefined,
      value: newValue,
      variable_type: variableToUpdate.variable_type?.id || "",
    };

    try {
      // 1. Update variable first
      await new Promise((resolve, reject) => {
        updateVariableMutation(
          { variableId, data: variableData },
          {
            onSuccess: (data) => resolve(data),
            onError: (error) => reject(error)
          }
        );
      });

      // 2. Update local variables state
      const updatedVariables = variables.map((variable) => {
        if (variable.id === variableId) {
          return { ...variable, value: newValue };
        }
        return variable;
      });
      updateVariables(updatedVariables);      // 3. Update ALL elements to ensure product-based formulas are refreshed
      // Count elements to update
      let elementCount = 0;
      trades.forEach(trade => {
        if (trade.elements?.length) {
          elementCount += trade.elements.length;
        }
      });
      
      if (elementCount === 0) {
        toast.success("Variable updated successfully");
        return;
      }
      
      const loadingToast = toast.loading(`Updating ${elementCount} elements after variable change...`, {
        position: "top-center"
      });
      
      // Create a set of element IDs to show loading state
      const allElementIds = new Set(
        trades.flatMap(trade => 
          (trade.elements || []).map(element => element.id)
        )
      );
      setUpdatingElementCosts(allElementIds);
      
      const updatePromises: Promise<{tradeId: string, updatedElement: any}>[] = [];
      
      trades.forEach(trade => {
        trade.elements?.forEach(element => {
          if (!element || !element.id) return; // Skip invalid elements
          
          // Create a complete element update with all required fields - passing 1:1 the same data
          const elementData = {
            name: element.name,
            description: element.description || undefined,
            image: element.image || undefined,
            material_cost_formula: element.material_cost_formula || undefined,
            labor_cost_formula: element.labor_cost_formula || undefined,
            markup: element.markup || 0,
            material_formula_variables: element.material_formula_variables || [],
            labor_formula_variables: element.labor_formula_variables || [],
            origin: element.origin || 'derived'
          };
          
          // Add this update to our promises array
          updatePromises.push(
            patchElement(element.id, elementData)
              .then(response => ({
                tradeId: trade.id,
                updatedElement: response.data
              }))
              .catch(error => {
                console.error(`Error updating element ${element.id}:`, error);
                throw error;
              })
          );
        });
      });

      try {
        const results = await Promise.all(updatePromises);
        console.log(`Successfully updated ${results.length} elements after variable change`);
        
        const updatedTrades = trades.map(trade => ({
          ...trade,
          elements: trade.elements?.map(element => {
            const result = results.find(r => 
              r.tradeId === trade.id && 
              r.updatedElement.id === element.id
            );
            return result ? result.updatedElement : element;
          }) || []
        }));
        
        updateTrades(updatedTrades);
        
        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ["elements"] });
        queryClient.invalidateQueries({ queryKey: ["trades"] });
        
        toast.dismiss(loadingToast);
        toast.success(`Updated variable and ${results.length} elements`, {
          position: "top-center",
          description: `All element costs have been refreshed.`
        });
      } catch (error) {
        toast.dismiss(loadingToast);
        throw error; // Let the outer catch handle this
      }    } catch (error) {
      console.error('Error updating variable and elements:', error);
      toast.error('Failed to update variable and elements');
    } finally {
      setIsUpdatingVariable(false);
      setUpdatingElementCosts(new Set());
      
      if (isZeroOrEmpty(newValue)) {
        setInlineEditingVariableId("zero-values-ready");
      } else {
        setInlineEditingVariableId(null);
      }
    }
  };

  const cancelInlineValueEdit = () => {
    setInlineEditingVariableId(null);
  };  const applyGlobalMarkup = (markupValue: number, showToast: boolean = true) => {
    // Validate the markup value
    if (markupValue < 0 || isNaN(markupValue)) {
      if (showToast) {
        toast.error("Invalid markup value", {
          position: "top-center",
          description: "Markup value must be a positive number"
        });
      }
      return;
    }
    
    // Count elements to update
    let elementCount = 0;
    trades.forEach(trade => {
      if (trade.elements?.length) {
        elementCount += trade.elements.length;
      }
    });
    
    if (elementCount === 0) {
      if (showToast) {
        toast.info("No elements to update", {
          position: "top-center",
          description: "Add elements before applying global markup"
        });
      }
      return;
    }
    

    const loadingToast = showToast ? toast.loading(`Updating ${elementCount} elements with ${markupValue}% markup...`, {
      position: "top-center"
    }) : null;

    const updatePromises: Promise<{tradeId: string, updatedElement: any}>[] = [];


    trades.forEach(trade => {
      trade.elements?.forEach(element => {
        if (!element || !element.id) return; // Skip invalid elements
        
        // Create a complete element update with all required fields
        const elementData = {
          name: element.name,
          description: element.description || undefined,
          material_cost_formula: element.material_cost_formula,
          labor_cost_formula: element.labor_cost_formula,
          markup: markupValue,
          // Include other essential fields that might be needed
          material_formula_variables: element.material_formula_variables,
          labor_formula_variables: element.labor_formula_variables,
        };
        
        // Add this update to our promises array - use patchElement and preserve the response
        updatePromises.push(
          patchElement(element.id, elementData)
            .then(response => ({
              tradeId: trade.id,
              updatedElement: response.data
            }))
            .catch(error => {
              console.error(`Error updating element ${element.id}:`, error);
              throw error;
            })
        );
      });
    });

    Promise.all(updatePromises)
      .then((results) => {
        console.log(`Successfully updated ${results.length} elements with markup ${markupValue}%`);

        const updatedTrades = trades.map(trade => ({
          ...trade,
          elements: trade.elements?.map(element => {
            const result = results.find(r => 
              r.tradeId === trade.id && 
              r.updatedElement.id === element.id
            );
            return result ? result.updatedElement : element;
          }) || []
        }));

        updateTrades(updatedTrades);        queryClient.invalidateQueries({ queryKey: ["elements"] });
        

        if (showToast && loadingToast) {
          toast.dismiss(loadingToast);
          toast.success(`Applied ${markupValue}% markup to all elements`, {
            position: "top-center",
            description: `Updated ${results.length} elements with ${markupValue}% markup.`
          });
        }
      })      .catch(error => {
        console.error("Error applying global markup:", error);
        

        queryClient.invalidateQueries({ queryKey: ["elements"] });
        

        if (showToast && loadingToast) {
          toast.dismiss(loadingToast);
          toast.error("Error applying global markup", {
            position: "top-center",
            description: error instanceof Error ? error.message : "Failed to update one or more elements. The original values have been restored."
          });
        }
      });
  };  const isFirstGlobalMarkupRender = useRef(true);
  const prevMarkupEnabledRef = useRef(false);
  const prevMarkupValueRef = useRef(0);
  
  useEffect(() => {
    if (isFirstGlobalMarkupRender.current) {
      isFirstGlobalMarkupRender.current = false;
      prevMarkupEnabledRef.current = isGlobalMarkupEnabled;
      prevMarkupValueRef.current = globalMarkupValue;
      return;
    }
      if (trades.some(trade => (trade.elements || []).length > 0)) {
      const wasJustEnabled = isGlobalMarkupEnabled && !prevMarkupEnabledRef.current;
      const valueChanged = isGlobalMarkupEnabled && prevMarkupValueRef.current !== globalMarkupValue;
      const wasJustDisabled = !isGlobalMarkupEnabled && prevMarkupEnabledRef.current;
      
      // Show toast if just enabled or value changed while enabled
      if (wasJustEnabled) {
        toast.success(`Global markup of ${globalMarkupValue}% enabled`, {
          position: "top-center",
          description: "Applied to all elements in this proposal."
        });
      } else if (valueChanged) {
        toast.success(`Global markup updated to ${globalMarkupValue}%`, {
          position: "top-center",
          description: "New markup value will be applied to all elements."
        });
      } else if (wasJustDisabled) {
        toast.info("Global markup disabled", {
          position: "top-center",
          description: "Individual element markup values will be used instead."
        });
      }
      
      // Update ref values for next comparison
      prevMarkupEnabledRef.current = isGlobalMarkupEnabled;
      prevMarkupValueRef.current = globalMarkupValue;

      const timer = setTimeout(() => {
        if (isGlobalMarkupEnabled) {
          // Don't show toast for automatic synchronization
          applyGlobalMarkup(globalMarkupValue, false);
        } else {
          // Only invalidate elements query when disabling markup
          queryClient.invalidateQueries({ queryKey: ["elements"] });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isGlobalMarkupEnabled, globalMarkupValue, queryClient, trades]);

  const startEditingElementMarkup = (element: ElementResponse) => {
    setEditingMarkupElementId(element.id);
    setInlineMarkupValue(element.markup || 0);
  };
  const saveElementMarkup = (elementId: string, tradeId: string, newMarkup: number) => {
    if (isGlobalMarkupEnabled) {
      setIsGlobalMarkupEnabled(false);
    }

    const elementToUpdate = trades
      .find(trade => trade.id === tradeId)
      ?.elements?.find(element => element.id === elementId);

    if (!elementToUpdate) return;

    // Create a complete element update with all required fields (same as global markup)
    const elementData = {
      name: elementToUpdate.name,
      description: elementToUpdate.description || undefined,
      material_cost_formula: elementToUpdate.material_cost_formula,
      labor_cost_formula: elementToUpdate.labor_cost_formula,
      markup: newMarkup,
      // Include other essential fields that might be needed
      material_formula_variables: elementToUpdate.material_formula_variables,
      labor_formula_variables: elementToUpdate.labor_formula_variables,
    };

    // Update local state immediately for UI responsiveness
    const updatedTrades = trades.map(trade => {
      if (trade.id === tradeId) {
        return {
          ...trade,
          elements: (trade.elements || []).map(element => {
            if (element.id === elementId) {
              return {
                ...element,
                markup: newMarkup
              };
            }
            return element;
          })
        };
      }
      return trade;
    });
    
    updateTrades(updatedTrades);

    // Use direct patchElement call (exactly like global markup does)
    patchElement(elementId, elementData)
      .then(response => {
        console.log(`Successfully updated element ${elementId} with markup ${newMarkup}%`);

        if (response && response.data) {
          const updatedElement = response.data;

          // Update local state with backend response (same as global markup)
          const finalUpdatedTrades = trades.map((trade) => {
            if (trade.elements && trade.elements.some((e) => e.id === updatedElement.id)) {
              return {
                ...trade,
                elements: trade.elements.map((element) =>
                  element.id === updatedElement.id ? updatedElement : element
                ),
              };
            }
            return trade;
          });
          
          updateTrades(finalUpdatedTrades);
        }

        // Only invalidate elements query - trades are updated through optimistic updates
        queryClient.invalidateQueries({ queryKey: ["elements"] });
        
        toast.success(`Markup updated to ${newMarkup}%`, {
          position: "top-center",
          description: `Element "${elementToUpdate.name}" markup has been saved.`
        });
      })
      .catch(error => {
        console.error(`Error updating element ${elementId}:`, error);
        
        // Revert local state on error (same error handling pattern as global markup)
        const revertedTrades = trades.map(trade => {
          if (trade.id === tradeId) {
            return {
              ...trade,
              elements: (trade.elements || []).map(element => {
                if (element.id === elementId) {
                  return {
                    ...element,
                    markup: elementToUpdate.markup || 0 // Revert to original markup
                  };
                }
                return element;
              })
            };
          }
          return trade;
        });
        
        updateTrades(revertedTrades);

        // Invalidate queries even on error (optimized to only elements)
        queryClient.invalidateQueries({ queryKey: ["elements"] });
        
        toast.error("Failed to save markup", {
          position: "top-center",
          description: error instanceof Error ? error.message : "An unexpected error occurred"
        });
      });
    
    setEditingMarkupElementId(null);
  };

  const cancelEditingMarkup = () => {
    setEditingMarkupElementId(null);
  };
  const handleSelectTrade = (trade: TradeResponse) => {
    const newTrade: TradeResponse = {
      id: trade.id.toString(),
      name: trade.name,
      description: trade.description,
      image: trade.image, // Added image property to ensure it's preserved
      origin: trade.origin,
      elements: trade.elements,
      created_at: trade.created_at,
      updated_at: trade.updated_at,
      created_by: trade.created_by,
      updated_by: trade.updated_by,
    };if (!trades.some((t) => t.id === newTrade.id)) {
      updateTrades([...trades, newTrade]);
      
      // Invalidate queries when a trade is added
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["elements"] });
      
      // Auto-import variables from element formulas
      if (newTrade.elements && newTrade.elements.length > 0) {
        // Collect all variable names from element formulas
        const variablesToAdd: VariableResponse[] = [];
        
        newTrade.elements.forEach(element => {
          // Extract variable names from material formula
          if (element.material_cost_formula) {
            const materialFormulaVariableNames = extractVariableNamesFromFormula(
              replaceVariableIdsWithNames(
                element.material_cost_formula,
                variables,  
                element.material_formula_variables || []
              )
            );
            
            materialFormulaVariableNames.forEach(varName => {
              // Find in available variables but not in current variables
              const availableVariable = variablesData?.data?.find(
                (v: VariableResponse) => 
                  v.name === varName && 
                  !variables.some(existingVar => existingVar.name === varName)
              );
              
              if (availableVariable && !variablesToAdd.some(v => v.id === availableVariable.id)) {
                variablesToAdd.push(availableVariable);
              }
            });
          }
          
          // Extract variable names from labor formula
          if (element.labor_cost_formula) {
            const laborFormulaVariableNames = extractVariableNamesFromFormula(
              replaceVariableIdsWithNames(
                element.labor_cost_formula,
                variables,
                element.labor_formula_variables || []
              )
            );
            
            laborFormulaVariableNames.forEach(varName => {
              // Find in available variables but not in current variables
              const availableVariable = variablesData?.data?.find(
                (v: VariableResponse) => 
                  v.name === varName && 
                  !variables.some(existingVar => existingVar.name === varName)
              );
              
              if (availableVariable && !variablesToAdd.some(v => v.id === availableVariable.id)) {
                variablesToAdd.push(availableVariable);
              }
            });
          }
        });
        
        // Add the variables to local variables
        if (variablesToAdd.length > 0) {
          const updatedVariables = [...variables, ...variablesToAdd];
          updateVariables(updatedVariables);
          
          // Update template if needed
          if (templateId) {
            updateTemplateMutation({
              templateId: templateId,
              data: { variables: updatedVariables.map((v) => v.id) },
            });
          }
          
          toast.success(`${variablesToAdd.length} variables automatically added`, {
            position: "top-center",
            description: `Required variables for formulas have been imported.`,
          });
        }
      }
      
      // Update template with new trade
      if (templateId) {
        console.log("🔄 Auto-updating template after trade selection:", {
          templateId,
          tradesCount: [...trades, newTrade].length,
          variablesCount: variables.length,
          tradeName: newTrade.name
        });
        
        updateTemplateMutation({
          templateId: templateId,
          data: { 
            trades: [...trades, newTrade].map((t) => t.id),
            variables: variables.map((v) => v.id)
          },
        });
      }
    }

    setIsTradeSearchOpen(false);
    setTradeSearchQuery("");
  };

  const handleRemoveTrade = (tradeId: string) => {
    const updatedTrades = trades.filter((t) => t.id !== tradeId);
    const removedTrade = trades.find((t) => t.id === tradeId);
    
    updateTrades(updatedTrades);
    
    // Auto-update template after trade removal
    if (templateId) {
      console.log("🔄 Auto-updating template after trade removal:", {
        templateId,
        tradesCount: updatedTrades.length,
        variablesCount: variables.length,
        removedTradeName: removedTrade?.name
      });
      
      updateTemplateMutation({
        templateId: templateId,
        data: { 
          trades: updatedTrades.map((t) => t.id),
          variables: variables.map((v) => v.id)
        },
      });
      
      toast.success("Trade removed and template updated automatically", {
        position: "top-center",
        description: removedTrade ? `"${removedTrade.name}" has been removed from your proposal.` : "Trade removed successfully.",
      });
    }
  };
  const handleAddTrade = () => {
    if (!newTradeName.trim()) return;

    const tradeData = {
      name: newTradeName.trim(),
      description: newTradeDescription.trim() || undefined,
      image: newTradeImage || undefined,
      origin: "derived",
    };

    createTradeMutation(tradeData);
  };

  const handleAddElement = (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
    markup: number;
  }) => {
    if (!data.name.trim() || !currentTradeId) return;

    const materialFormula = data.materialFormula.trim()
      ? replaceVariableNamesWithIds(data.materialFormula.trim(), variables)
      : undefined;

    const laborFormula = data.laborFormula.trim()
      ? replaceVariableNamesWithIds(data.laborFormula.trim(), variables)
      : undefined;

    const markup = isGlobalMarkupEnabled ? globalMarkupValue : data.markup;

    const elementData = {
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      image: data.image || undefined,
      material_cost_formula: materialFormula,
      origin: "derived",
      labor_cost_formula: laborFormula,
      markup: markup,
    };

    createElementMutation(elementData);
  };

  const handleEditElement = (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
    markup: number;
  }) => {
    if (!data.name.trim() || !currentElementId) return;

    const materialFormula = data.materialFormula.trim()
      ? replaceVariableNamesWithIds(data.materialFormula.trim(), variables)
      : undefined;

    const laborFormula = data.laborFormula.trim()
      ? replaceVariableNamesWithIds(data.laborFormula.trim(), variables)
      : undefined;

    const markup = isGlobalMarkupEnabled ? globalMarkupValue : data.markup;

    const elementData = {
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      image: data.image || undefined,
      material_cost_formula: materialFormula,
      labor_cost_formula: laborFormula,
      markup: markup,
    };

    updateElementMutation({
      elementId: currentElementId,
      data: elementData,
    });
  };

  const handleSelectElement = (element: ElementResponse, tradeId: string) => {
    const updatedTrades = trades.map((trade) => {
      if (trade.id === tradeId) {
        if (!trade.elements?.some((e) => e.id === element.id.toString())) {
          return {
            ...trade,
            elements: [...(trade.elements || []), element],
          };
        }
      }
      return trade;
    });

    updateTrades(updatedTrades);

    const updatedTrade = updatedTrades.find((trade) => trade.id === tradeId);
    if (updatedTrade && updatedTrade.elements) {
      const elementIds = updatedTrade.elements.map((elem) => elem.id);

      updateTradeMutation({
        tradeId: tradeId,
        data: { elements: elementIds },
      });
    }

    setIsElementSearchOpen(false);

    setElementSearchQuery("");
    setElementSearchQueries((prev) => ({
      ...prev,
      [tradeId]: "",
    }));
  };

  const handleRemoveElement = (elementId: string, tradeId: string) => {
    const updatedTrades = trades.map((trade) => {
      if (trade.id === tradeId) {
        return {
          ...trade,
          elements: (trade.elements || []).filter((e) => e.id !== elementId),
        };
      }
      return trade;
    });

    updateTrades(updatedTrades);

    const updatedTrade = updatedTrades.find((trade) => trade.id === tradeId);
    if (updatedTrade) {
      const elementIds = updatedTrade.elements?.map((elem) => elem.id) || [];

      updateTradeMutation({
        tradeId: tradeId,
        data: { elements: elementIds },
      });
    }
  };

  const handleOpenEditVariableDialog = (variable: VariableResponse) => {
    setCurrentVariableId(variable.id);
    setEditVariableName(variable.name);
    setEditVariableDescription(variable.description || "");
    setEditVariableValue(variable.value || 0);
    setEditVariableType(variable.variable_type?.id || "");
    setEditVariableFormula(variable.formula || "");
    setShowEditVariableDialog(true);
  };

  const handleEditVariable = async () => {
    if (!editVariableName.trim() || !currentVariableId) return;

    setIsUpdatingVariable(true);
    
    try {
      let processedFormula = editVariableFormula;
      if (editVariableFormula) {
        const namePattern = /\{([^{}]+)\}/g;
        processedFormula = editVariableFormula.replace(namePattern, (match, variableName) => {
          const exactIdMatch = variables.find(v => v.id === variableName);
          if (exactIdMatch) return match;
          
          const variable = variables.find(v => v.name === variableName);
          return variable ? `{${variable.id}}` : match;
        });
      }

      const variableData = {
        name: editVariableName.trim(),
        description: editVariableDescription.trim() || undefined,
        value: processedFormula ? undefined : editVariableValue,
        formula: processedFormula || undefined,
        variable_type: editVariableType,
      };

      let updatedValue = editVariableValue;
      if (processedFormula) {
        const calculatedValue = calculateFormulaValue(processedFormula, variables);
        if (calculatedValue !== null) {
          updatedValue = calculatedValue;
        }
      }

      const selectedVariableType = Array.isArray((apiVariableTypes as any)?.data)
        ? (apiVariableTypes as any).data.find(
            (type: any) => type.id.toString() === editVariableType
          )
        : null;

      // Update local variables immediately for UI responsiveness
      const updatedVariables = variables.map((variable) => {
        if (variable.id === currentVariableId) {
          return {
            ...variable,
            name: editVariableName.trim(),
            description: editVariableDescription.trim() || "",
            value: updatedValue,
            formula: processedFormula || "",
            variable_type: selectedVariableType || variable.variable_type,
          } as VariableResponse;
        }
        return variable;
      });

      updateVariables(updatedVariables);

      const elementsToUpdate: { elementId: string; data: any }[] = [];

      trades.forEach((trade) => {
        if (trade.elements) {
          trade.elements.forEach((element) => {
            let needsUpdate = false;

            if (
              element.material_formula_variables &&
              element.material_formula_variables.some(
                (v) => v.id.toString() === currentVariableId
              )
            ) {
              needsUpdate = true;
            }

            if (
              element.labor_formula_variables &&
              element.labor_formula_variables.some(
                (v) => v.id.toString() === currentVariableId
              )
            ) {
              needsUpdate = true;
            }

            if (needsUpdate) {
              elementsToUpdate.push({
                elementId: element.id,
                data: {
                  name: element.name,
                  description: element.description || undefined,
                  image: element.image || undefined,
                  material_cost_formula: element.material_cost_formula,
                  labor_cost_formula: element.labor_cost_formula,
                  markup: element.markup,
                  material_formula_variables: element.material_formula_variables,
                  labor_formula_variables: element.labor_formula_variables,
                },
              });
            }
          });
        }
      });      // Step 1: Update variable first and wait for completion using direct API call
      console.log('Updating variable in edit dialog first:', currentVariableId, variableData);
      const variableResponse = await updateVariable(currentVariableId, variableData);
      console.log('Variable updated successfully in edit dialog:', variableResponse);

      // Invalidate variables query to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["variables"] });

      // Step 2: Update ALL elements to ensure product-based formulas are refreshed too
      // Count elements to update
      let elementCount = 0;
      trades.forEach(trade => {
        if (trade.elements?.length) {
          elementCount += trade.elements.length;
        }
      });
      
      if (elementCount === 0) {
        toast.success("Variable updated successfully");
        
        // Still invalidate queries even if no elements exist
        queryClient.invalidateQueries({ queryKey: ["elements"] });
        queryClient.invalidateQueries({ queryKey: ["trades"] });
        queryClient.invalidateQueries({ queryKey: ["product"] });
        
        // Force cost recalculation
        setCostUpdateTrigger(prev => prev + 1);
        return;
      }
      
      const loadingToast = toast.loading(`Updating ${elementCount} elements after variable change...`, {
        position: "top-center"
      });
      
      // Create a set of element IDs to show loading state
      const allElementIds = new Set(
        trades.flatMap(trade => 
          (trade.elements || []).map(element => element.id)
        )
      );
      setUpdatingElementCosts(allElementIds);
      
      const updatePromises: Promise<{tradeId: string, updatedElement: any}>[] = [];
      
      trades.forEach(trade => {
        trade.elements?.forEach(element => {
          if (!element || !element.id) return; // Skip invalid elements
          
          // Create a complete element update with all required fields - passing 1:1 the same data
          const elementData = {
            name: element.name,
            description: element.description || undefined,
            image: element.image || undefined,
            material_cost_formula: element.material_cost_formula || undefined,
            labor_cost_formula: element.labor_cost_formula || undefined,
            markup: element.markup || 0,
            material_formula_variables: element.material_formula_variables || [],
            labor_formula_variables: element.labor_formula_variables || [],
            origin: element.origin || 'derived'
          };
          
          // Add this update to our promises array
          updatePromises.push(
            patchElement(element.id, elementData)
              .then(response => ({
                tradeId: trade.id,
                updatedElement: response.data
              }))
              .catch(error => {
                console.error(`Error updating element ${element.id}:`, error);
                throw error;
              })
          );
        });
      });

      try {
        const results = await Promise.all(updatePromises);
        console.log(`Successfully updated ${results.length} elements after variable change`);
        
        const updatedTrades = trades.map(trade => ({
          ...trade,
          elements: trade.elements?.map(element => {
            const result = results.find(r => 
              r.tradeId === trade.id && 
              r.updatedElement.id === element.id
            );
            return result ? result.updatedElement : element;
          }) || []
        }));
        
        updateTrades(updatedTrades);
        
        // Invalidate queries after all elements are updated
        queryClient.invalidateQueries({ queryKey: ["elements"] });
        
        // Force cost recalculation
        setCostUpdateTrigger(prev => prev + 1);
        
        toast.dismiss(loadingToast);
        toast.success(`Updated variable and ${results.length} elements`, {
          position: "top-center",
          description: `All element costs have been refreshed.`
        });
      } catch (error) {
        toast.dismiss(loadingToast);
        console.error('Error updating elements after variable change:', error);
        
        // Still invalidate queries and force recalculation
        queryClient.invalidateQueries({ queryKey: ["elements"] });
        setCostUpdateTrigger(prev => prev + 1);
          toast.error('Failed to update all elements, but variable was updated');
      }

      setShowEditVariableDialog(false);

    } catch (error) {
      console.error('Error in sequential variable edit process:', error);
      
      // Revert local state on error
      updateVariables(variables);
      
      toast.error('Failed to update variable or dependent elements', {
        position: "top-center",
        description: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    } finally {
      setIsUpdatingVariable(false);
      setUpdatingElementCosts(new Set());
    }
  };
  const handleOpenEditDialog = (element: ElementResponse) => {
    setCurrentElementId(element.id);

    setNewElementName(element.name);
    setNewElementDescription(element.description || "");
    
    // If global markup is enabled and this element uses the global markup value,
    // use the global markup value; otherwise use the element's markup
    const markupValue = isGlobalMarkupEnabled && element.markup === globalMarkupValue
      ? globalMarkupValue 
      : (element.markup || 0);
      
    setElementMarkup(markupValue);

    if (element.material_cost_formula) {
      setNewElementMaterialFormula(
        replaceVariableIdsWithNames(
          element.material_cost_formula,
          variables,
          element.material_formula_variables || []
        )
      );
    } else {
      setNewElementMaterialFormula("");
    }

    if (element.labor_cost_formula) {
      setNewElementLaborFormula(
        replaceVariableIdsWithNames(
          element.labor_cost_formula,
          variables,
          element.labor_formula_variables || []
        )
      );
    } else {
      setNewElementLaborFormula("");
    }

    setShowEditElementDialog(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Proposal Variables & Trades</h2>
        <p className="text-muted-foreground mb-6">
          Define variables for your proposal and organize elements by trade.
        </p>

        {isProcessingTemplate && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-muted rounded-md text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading template data...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Variable className="mr-2 h-5 w-5" />
                <span>Proposal Variables</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Variables are dynamic values in your proposal that can be customized for each client. 
                      They connect to trades and elements through formulas to calculate costs automatically.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <div className="relative w-full mb-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search variables..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value.trim()) {
                          setIsSearchOpen(true);
                        } else {
                          setIsSearchOpen(false);
                        }
                      }}
                      onFocus={() => {
                        if (searchQuery.trim()) {
                          setIsSearchOpen(true);
                        }
                      }}                      onBlur={() => {
                        setTimeout(() => setIsSearchOpen(false), 300);
                      }}
                      onClick={() => {
                        if (searchQuery.trim()) {
                          setIsSearchOpen(true);
                        }
                      }}                      onKeyDown={(e) => {
                        if (e.key === "Tab" && filteredVariables.length > 0) {
                          e.preventDefault();
                          handleSelectVariable(filteredVariables[0]);
                        } else if (e.key === "Enter") {
                          // Check for exact match first
                          const exactMatch = filteredVariables.find(
                            variable => variable.name.toLowerCase() === searchQuery.trim().toLowerCase()
                          );
                          
                          if (exactMatch) {
                            // If there's an exact match, select it
                            handleSelectVariable(exactMatch);
                          } else if (filteredVariables.length > 0) {
                            // Otherwise select first suggestion
                            handleSelectVariable(filteredVariables[0]);
                          } else if (searchQuery.trim()) {
                            // If no matches, open create dialog
                            setIsSearchOpen(false);
                            setShowAddDialog(true);
                            setNewVarName(searchQuery.trim());
                          }
                        }
                      }}
                      className="w-full pl-8 pr-4"
                    />
                    {variablesLoading && (
                      <div className="absolute right-2 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {searchQuery.trim() && isSearchOpen && (
                    <div className="absolute z-10 w-full border rounded-md bg-background shadow-md">
                      <div className="p-2">
                        <p className="text-xs text-muted-foreground mb-1 px-2">
                          Variables
                        </p>
                        {filteredVariables.length > 0 ? (
                          filteredVariables.map((variable) => (
                            <div
                              key={variable.id}
                              className="flex items-center justify-between w-full p-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
                              onClick={() => handleSelectVariable(variable)}
                            >
                              <div className="flex items-center">
                                <BracesIcon className="mr-2 h-4 w-4" />
                                <span>{variable.name}</span>
                              </div>
                              <Badge variant="outline" className="ml-2">
                                {variable.variable_type?.name || "Unknown"}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="p-2 text-sm">
                            {variables.some((v) =>
                              v.name
                                .toLowerCase()
                                .includes(searchQuery.toLowerCase())
                            ) ? (
                              <span className="text-muted-foreground">Variable already added</span>
                            ) : (
                              <div>
                                <span className="text-muted-foreground">"{searchQuery}" doesn't exist.</span>
                                <p className="text-xs mt-1 text-primary">Press Enter to create this variable</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="sm:max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center">
                          <BracesIcon className="mr-2 h-4 w-4" />
                          Add Proposal Variable
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="var-name">Variable Name</Label>
                          <Input
                            id="var-name"
                            placeholder="Wall Length"
                            value={newVarName}
                            onChange={(e) => setNewVarName(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="var-type">Variable Type</Label>
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
                            <Select
                              value={newVarDefaultVariableType}
                              onValueChange={setNewVarDefaultVariableType}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a variable type" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(
                                  (apiVariableTypes as any)?.data
                                ) ? (
                                  (apiVariableTypes as any).data.map(
                                    (type: any) => (
                                      <SelectItem
                                        key={type.id}
                                        value={type.id.toString()}
                                      >
                                        {type.name}
                                      </SelectItem>
                                    )
                                  )
                                ) : (
                                  <SelectItem value="default">
                                    Default Type
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="var-description">Description</Label>
                          <Textarea
                            id="var-description"
                            placeholder="What this variable represents (optional)"
                            value={newVarDescription}
                            onChange={(e) =>
                              setNewVarDescription(e.target.value)
                            }
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={() => {
                            if (newVarName.trim()) {
                              handleAddVariable();
                            }
                          }}
                          disabled={isSubmitting}
                          type="submit"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Add Variable"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">
                    Variables ({variables.length})
                  </h3>

                  <ScrollArea className="h-[750px] pr-4 -mr-4">
                    {variables.length > 0 ? (
                      <div className="space-y-2">
                        {variables.map((variable) => (
                          <div
                            key={variable.id}
                            className="border rounded-md p-3 bg-muted/30 relative group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm flex items-center">
                                {variable.name}
                                {variable.formula && (
                                  <Badge variant="outline" className="ml-2 text-xs bg-primary/10">
                                    <Calculator className="h-3 w-3 mr-1" />
                                    Formula
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {variable.variable_type?.name}
                              </Badge>
                            </div>

                            {variable.description && (
                              <div className="text-xs mt-1 line-clamp-1">
                                {variable.description}
                              </div>
                            )}
                            <div className="flex items-center mt-1">
                              <span className="text-xs font-medium mr-1">
                                Value:
                              </span>
                              {inlineEditingVariableId === variable.id || 
                               (isZeroOrEmpty(variable.value) && inlineEditingVariableId === "zero-values-ready") ? (                                <div className="flex">
                                  <Input 
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={inlineEditingVariableId === variable.id ? inlineEditValue : (variable.value || 0)}
                                    onChange={(e) => {
                                      // Prevent negative values
                                      const value = Math.max(0, Number(e.target.value));
                                      if (inlineEditingVariableId === "zero-values-ready") {
                                        setInlineEditingVariableId(variable.id);
                                        setInlineEditValue(value);
                                      } else {
                                        setInlineEditValue(value);
                                      }
                                    }}
                                    onFocus={(e) => {
                                      if (inlineEditingVariableId === "zero-values-ready") {
                                        setInlineEditingVariableId(variable.id);
                                        setInlineEditValue(variable.value || 0);
                                      }
                                      e.target.select();
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveInlineValueEdit(variable.id, inlineEditValue);
                                      } else if (e.key === 'Escape') {
                                        cancelInlineValueEdit();
                                      }
                                    }}
                                    onBlur={() => {
                                      if (inlineEditingVariableId === variable.id) {
                                        saveInlineValueEdit(variable.id, inlineEditValue);
                                      }
                                    }}
                                    placeholder="0"
                                    className="h-6 text-xs py-0 w-20"
                                    autoFocus={inlineEditingVariableId === variable.id}
                                  />
                                  <span className="text-xs ml-1 flex items-center">
                                    {variable.variable_type?.unit}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span 
                                    className="text-xs cursor-pointer hover:bg-muted rounded px-1 flex items-center gap-1"
                                    onClick={() => {
                                      if (variable.formula) {
                                        toggleFormulaDisplay(variable.id);
                                      } else {
                                        startInlineValueEdit(variable);
                                      }
                                    }}
                                  >
                                    {variable.formula && showingFormulaIds[variable.id] ? (
                                      <>
                                        <Calculator className="h-3 w-3 opacity-70" />
                                        <code className="bg-muted/50 px-1 py-0.5 rounded">
                                          {replaceVariableIdsWithNames(
                                            variable.formula,
                                            variables,
                                            extractFormulaVariables(variable.formula)
                                          )}
                                        </code>
                                      </>
                                    ) : (
                                      <>
                                        {variable.formula ? (
                                          <>
                                            <span className="font-medium">
                                              {calculateFormulaValue(variable.formula, variables) || "0"}
                                            </span>
                                            {variable.variable_type?.unit && (
                                              <span className="ml-1">{variable.variable_type.unit}</span>
                                            )}
                                            <span className="ml-1 text-xs opacity-50">(click to view formula)</span>
                                          </>
                                        ) : (
                                          <>
                                            {variable.value === null || variable.value === undefined ? "0" : variable.value} 
                                            {variable.variable_type?.unit}
                                          </>
                                        )}
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="absolute -top-2 -right-2 flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-primary hover:text-primary/80"
                                onClick={() =>
                                  handleOpenEditVariableDialog(variable)
                                }
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="11"
                                  height="11"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-destructive hover:text-destructive/80"
                                onClick={() =>
                                  handleRemoveVariable(variable.id)
                                }
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                        <p className="text-sm">No variables defined</p>
                        <p className="text-xs">
                          Variables can be used across all elements
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">                <span className="flex items-center">
                  <BracesIcon className="mr-2 h-5 w-5" />
                  <span>Proposal Trades</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="ml-2 h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">
                        Trades represent the main services or products in your proposal. They use variables in their 
                        formulas to calculate pricing and can contain multiple elements for detailed breakdowns.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="global-markup-switch" className="cursor-pointer">Global Markup</Label>
                    <Switch 
                      id="global-markup-switch" 
                      checked={isGlobalMarkupEnabled}
                      onCheckedChange={setIsGlobalMarkupEnabled}
                    />
                  </div>                  <div className="flex items-center space-x-2">
                    <PercentIcon className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={globalMarkupValue}
                      onChange={(e) => setGlobalMarkupValue(Number(e.target.value))}
                      onFocus={(e) => {
                        e.target.select();
                        if (isGlobalMarkupEnabled) {
                          // Apply markup when input is focused (if enabled)
                          applyGlobalMarkup(globalMarkupValue, true);
                        }
                      }}
                      className="w-16 h-7 text-sm"
                      disabled={!isGlobalMarkupEnabled}
                      min={0}
                      max={100}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && isGlobalMarkupEnabled) {
                          // Show toast and apply markup when user presses Enter
                          applyGlobalMarkup(globalMarkupValue, true);
                        }
                      }}
                    />
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <div className="relative w-full mb-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search trades..."
                      value={tradeSearchQuery}
                      onChange={(e) => {
                        setTradeSearchQuery(e.target.value);
                        if (e.target.value.trim()) {
                          setIsTradeSearchOpen(true);
                        } else {
                          setIsTradeSearchOpen(false);
                        }
                      }}
                      onFocus={() => {
                        if (tradeSearchQuery.trim()) {
                          setIsTradeSearchOpen(true);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => setIsTradeSearchOpen(false), 200);
                      }}
                      onClick={() => {
                        if (tradeSearchQuery.trim()) {
                          setIsTradeSearchOpen(true);
                        }
                      }}                      onKeyDown={(e) => {
                        // Handle up/down arrows
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setSelectedSuggestionIndex((prev) => {
                            const maxIndex = !hasExactMatch(
                              tradeSearchQuery,
                              filteredTrades
                            )
                              ? filteredTrades.length
                              : filteredTrades.length - 1;
                            return prev < maxIndex ? prev + 1 : 0;
                          });
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setSelectedSuggestionIndex((prev) =>
                            prev > 0
                              ? prev - 1
                              : !hasExactMatch(tradeSearchQuery, filteredTrades)
                              ? filteredTrades.length
                              : filteredTrades.length - 1
                          );
                        } else if (e.key === "Tab" && filteredTrades.length > 0) {
                          e.preventDefault();
                          handleSelectTrade(filteredTrades[0]);
                        } else if (e.key === "Enter") {
                          if (selectedSuggestionIndex >= 0) {
                            e.preventDefault();
                            if (
                              selectedSuggestionIndex ===
                                filteredTrades.length &&
                              !hasExactMatch(tradeSearchQuery, filteredTrades)
                            ) {
                              // Create new trade option selected
                              setShowAddTradeDialog(true);
                              setNewTradeName(tradeSearchQuery.trim());
                              setIsTradeSearchOpen(false);
                            } else {
                              // Existing trade selected
                              handleSelectTrade(
                                filteredTrades[selectedSuggestionIndex]
                              );
                            }
                          } else if (
                            !hasExactMatch(tradeSearchQuery, filteredTrades)
                          ) {
                            setIsTradeSearchOpen(false);
                            setShowAddTradeDialog(true);
                            setNewTradeName(tradeSearchQuery.trim());
                          } else if (filteredTrades.length === 1) {
                            handleSelectTrade(filteredTrades[0]);
                          }
                        }
                      }}
                      className="w-full pl-8 pr-4"
                    />
                    {tradesLoading && (
                      <div className="absolute right-2 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>                  {tradeSearchQuery.trim() && isTradeSearchOpen && (
                    <div className="absolute z-10 w-full border rounded-md bg-background shadow-md">
                      <div className="p-2">
                        <p className="text-xs text-muted-foreground mb-1 px-2">
                          Trades
                        </p>
                        <div className="space-y-1">
                          {/* Show create option if no exact match */}
                          {!hasExactMatch(tradeSearchQuery, filteredTrades) && (
                            <div
                              className={cn(
                                "flex items-center justify-between w-full p-2 text-sm cursor-pointer rounded-md border-t",
                                selectedSuggestionIndex ===
                                  filteredTrades.length
                                  ? "bg-accent text-accent-foreground"
                                  : "hover:bg-accent hover:text-accent-foreground"
                              )}
                              onClick={() => {
                                setShowAddTradeDialog(true);
                                setNewTradeName(tradeSearchQuery.trim());
                                setIsTradeSearchOpen(false);
                              }}
                            >
                              <div className="flex items-center">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                <span>Create "{tradeSearchQuery}"</span>
                              </div>
                            </div>
                          )}
                          {filteredTrades.length > 0 && (
                            <div className="space-y-1">
                              {filteredTrades
                                .filter((trade) => trade.origin === "original")
                                .map((trade, index) => (
                                  <div
                                    key={trade.id}
                                    className={cn(
                                      "flex items-center justify-between w-full p-2 text-sm cursor-pointer rounded-md",
                                      selectedSuggestionIndex === index
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-accent hover:text-accent-foreground"
                                    )}
                                    onClick={() => handleSelectTrade(trade)}
                                  >
                                    <div className="flex items-center">
                                      <BracesIcon className="mr-2 h-4 w-4" />
                                      <span>{trade.name}</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                          {filteredTrades.length === 0 && hasExactMatch(tradeSearchQuery, filteredTrades) && (
                            <div className="p-2 text-sm">
                              <span className="text-muted-foreground">Trade already added</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <EditVariableDialog
                    open={showEditVariableDialog}
                    onOpenChange={setShowEditVariableDialog}
                    onEditVariable={handleEditVariable}
                    variableId={currentVariableId || ""}
                    variableName={editVariableName}
                    setVariableName={setEditVariableName}
                    variableDescription={editVariableDescription}
                    setVariableDescription={setEditVariableDescription}
                    variableValue={editVariableValue}
                    setVariableValue={(value) => setEditVariableValue(typeof value === 'function' ? (prev) => Math.max(0, value(prev)) : Math.max(0, value))}
                    variableType={editVariableType}
                    setVariableType={setEditVariableType}
                    variableFormula={editVariableFormula}
                    setVariableFormula={setEditVariableFormula}
                    variableTypes={
                      Array.isArray((apiVariableTypes as any)?.data)
                        ? (apiVariableTypes as any).data
                        : []
                    }
                    isLoadingVariableTypes={isLoadingVariableTypes}
                    isUpdating={isUpdatingVariable}
                    onCancel={() => {
                      setShowEditVariableDialog(false);
                      setCurrentVariableId(null);
                    }}
                    variables={variables}
                    updateVariables={updateVariablesWrapper}
                  /><AddTradeDialog
                    open={showAddTradeDialog}
                    onOpenChange={setShowAddTradeDialog}
                    onAddTrade={handleAddTrade}
                    newTradeName={newTradeName}
                    setNewTradeName={setNewTradeName}
                    newTradeDescription={newTradeDescription}
                    setNewTradeDescription={setNewTradeDescription}
                    newTradeImage={newTradeImage}
                    setNewTradeImage={setNewTradeImage}
                    isCreatingTrade={isCreatingTrade}                  />                  <AddElementDialog
                    open={showAddElementDialog}
                    onOpenChange={setShowAddElementDialog}
                    onAddElement={handleAddElement}
                    newElementName={newElementName}
                    variables={variables}
                    updateVariables={updateVariablesWrapper}
                    isCreatingElement={isCreatingElement}
                    isGlobalMarkupEnabled={isGlobalMarkupEnabled}
                    globalMarkupValue={globalMarkupValue}/><EditElementDialog
                    open={showEditElementDialog}
                    onOpenChange={setShowEditElementDialog}
                    onEditElement={handleEditElement}
                    elementToEdit={
                      currentElementId
                        ? trades
                            .flatMap((trade) => trade.elements || [])
                            .find((element) => element.id === currentElementId) ||
                          null
                        : null                    }                    variables={variables}
                    updateVariables={updateVariablesWrapper}
                    isUpdatingElement={isUpdatingElement}
                    elementMarkup={elementMarkup}
                    onCancel={() => {
                      setShowEditElementDialog(false);
                      setCurrentElementId(null);
                    }}
                    isGlobalMarkupEnabled={isGlobalMarkupEnabled}
                    globalMarkupValue={globalMarkupValue}
                    onUseGlobalMarkup={() => {
                      if (currentElementId) {
                        setElementMarkup(globalMarkupValue);
                        const currentElement = trades
                          .flatMap(trade => trade.elements || [])
                          .find(element => element.id === currentElementId);
                          
                        if (currentElement) {

                          const elementData = {
                            name: currentElement.name,
                            description: currentElement.description || undefined,
                            material_cost_formula: currentElement.material_cost_formula,
                            labor_cost_formula: currentElement.labor_cost_formula,
                            markup: globalMarkupValue,
                            material_formula_variables: currentElement.material_formula_variables,
                            labor_formula_variables: currentElement.labor_formula_variables,
                          };
                            patchElement(currentElementId, elementData)
                            .then(() => {
                              const updatedTrades = trades.map(trade => ({
                                ...trade,
                                elements: trade.elements?.map(element => 
                                  element.id === currentElementId 
                                    ? { ...element, markup: globalMarkupValue } 
                                    : element
                                ) || []
                              }));
                              

                              updateTrades(updatedTrades);
                              
                              // Removed individual toast since bulk update will handle it
                              
                              queryClient.invalidateQueries({ queryKey: ["elements"] });
                            })
                            .catch(error => {
                              console.error("Error updating element markup:", error);
                              toast.error("Failed to apply global markup to element", {
                                position: "top-center"
                              });
                            });
                        }
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">
                    Trades ({trades.length})
                  </h3>
                  {trades.length > 0 ? (
                    <div className="space-y-2">                      {trades.map((trade) => (
                        <div
                          key={trade.id}
                          className="border rounded-md p-3 bg-muted/30 relative group"
                        >
                          <div className="flex items-center justify-between mb-2">                            <div className="font-medium text-sm flex items-center gap-2">
                              {trade.image ? (
                                <div className="h-10 w-10 overflow-hidden rounded-md flex-shrink-0">
                                  <img 
                                    src={trade.image} 
                                    alt={trade.name} 
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : null}
                              <span>{trade.name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-70 hover:opacity-100"
                                onClick={() => handleRemoveTrade(trade.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {trade.description && (
                            <div className="text-xs mt-1 mb-2 line-clamp-1">
                              {trade.description}
                            </div>
                          )}

                          {trade.elements ? (
                            <div className="mt-3 border-t pt-2">                              <div className="flex items-center justify-between">
                                <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide flex items-center">
                                  Elements
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="ml-1 h-3 w-3 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">
                                        Elements are the individual components within each trade. They use variables 
                                        and formulas to calculate specific costs or quantities, providing detailed 
                                        breakdowns of your trade pricing.
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>

                              <div className="relative mb-2">
                                <div className="relative w-full mb-1">
                                  <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                  <Input
                                    placeholder="Search elements..."
                                    value={elementSearchQueries[trade.id] || ""}
                                    onChange={(e) => {
                                      setCurrentTradeId(trade.id);
                                      setElementSearchQueries((prev) => ({
                                        ...prev,
                                        [trade.id]: e.target.value,
                                      }));
                                      setElementSearchQuery(e.target.value);
                                      
                                      if (e.target.value.trim()) {
                                        setIsElementSearchOpen(true);
                                      } else {
                                        setIsElementSearchOpen(false);
                                      }
                                    }}
                                    onFocus={() => {
                                      setCurrentTradeId(trade.id);
                                      const tradeQuery =
                                        elementSearchQueries[trade.id] || "";
                                      setElementSearchQuery(tradeQuery);
                                      if (
                                        tradeQuery.trim()
                                      ) {
                                        setIsElementSearchOpen(true);
                                      }
                                    }}
                                    onBlur={() => {
                                      setTimeout(() => setIsElementSearchOpen(false), 200);
                                    }}
                                    onClick={() => {
                                      setCurrentTradeId(trade.id);
                                      const tradeQuery =
                                        elementSearchQueries[trade.id] || "";
                                      setElementSearchQuery(tradeQuery);
                                      
                                      if (tradeQuery.trim()) {
                                        setIsElementSearchOpen(true);
                                      }
                                    }}                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Tab" &&
                                        filteredElements.length > 0
                                      ) {
                                        e.preventDefault();
                                        handleSelectElement(
                                          filteredElements[0],
                                          trade.id
                                        );
                                      } else if (e.key === "Enter") {
                                        const tradeQuery =
                                          elementSearchQueries[trade.id] || "";
                                          
                                        // Check for exact match first
                                        const exactMatch = filteredElements.find(
                                          element => element.name.toLowerCase() === tradeQuery.trim().toLowerCase()
                                        );
                                        
                                        if (exactMatch) {
                                          // If there's an exact match, select it
                                          handleSelectElement(exactMatch, trade.id);
                                        } else if (filteredElements.length > 0) {
                                          // Otherwise select first suggestion
                                          handleSelectElement(
                                            filteredElements[0],
                                            trade.id
                                          );
                                        } else if (tradeQuery.trim()) {
                                          // If no matches, open create dialog
                                          setIsElementSearchOpen(false);
                                          setShowAddElementDialog(true);
                                          setCurrentTradeId(trade.id);
                                          setNewElementName(tradeQuery.trim());
                                        }
                                      }
                                    }}
                                    className="w-full pl-7 pr-4 h-8 text-xs"
                                  />
                                  {elementsLoading && (
                                    <div className="absolute right-2 top-2">
                                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                    </div>
                                  )}
                                </div>

                                {(elementSearchQueries[trade.id] || "").trim() &&
                                 isElementSearchOpen &&
                                 currentTradeId === trade.id && (
                                  <div className="absolute z-10 w-full border rounded-md bg-background shadow-md">
                                    <div className="p-2">
                                      <p className="text-xs text-muted-foreground mb-1 px-2">
                                        Elements
                                      </p>
                                      {filteredElements.length > 0 ? (
                                        filteredElements.map((element) => (
                                          <div
                                            key={element.id}
                                            className="flex items-center justify-between w-full p-2 text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md"
                                            onClick={() =>
                                              handleSelectElement(
                                                element,
                                                trade.id
                                              )
                                            }
                                          >
                                            <div className="flex items-center">
                                              <BracesIcon className="mr-2 h-3 w-3" />
                                              <span>{element.name}</span>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="p-2 text-xs">
                                          {trade.elements?.some((e) =>
                                            e.name
                                              .toLowerCase()
                                              .includes(
                                                (elementSearchQueries[trade.id] || "").toLowerCase()
                                              )
                                          ) ? (
                                            <span className="text-muted-foreground">Element already added to this trade</span>
                                          ) : (
                                            <div>
                                              <span className="text-muted-foreground">"{elementSearchQueries[trade.id]}" doesn't exist.</span>
                                              <p className="text-xs mt-1 text-primary">Press Enter to create this element</p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>                                <div className="space-y-2">
                                {trade.elements.map((element) => (
                                  <div
                                    key={element.id}
                                    className="flex flex-col gap-2"
                                  >                                    <div className="flex items-start gap-3 p-4 rounded border bg-background relative group">
                                      {element.image ? (
                                        <div className="h-11 w-11 overflow-hidden rounded-md flex-shrink-0 mt-1">
                                          <img 
                                            src={element.image} 
                                            alt={element.name} 
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      ) : null}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">
                                          {element.name}
                                        </div>
                                        {element.description && (
                                          <div className="text-xs text-muted-foreground line-clamp-1">
                                            {element.description}
                                          </div>
                                        )}
                                        <div className="mt-2 pt-2 border-t border-dashed">
                                          {element.material_cost_formula && (
                                            <div className="mt-1 flex flex-col">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold">
                                                    Material Cost Formula:
                                                  </span>
                                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                    {replaceVariableIdsWithNames(
                                                      element.material_cost_formula,
                                                      variables,
                                                      element.material_formula_variables ||
                                                        []
                                                    )}
                                                  </code>
                                                </div>                                                {(element.material_cost !== undefined || elementCosts[element.id]?.materialCost !== null) && (
                                                  <div className="flex items-center gap-2">
                                                    {updatingElementCosts.has(element.id) ? (
                                                      <div className="flex items-center gap-1 text-xs font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Calculating...
                                                      </div>
                                                    ) : (
                                                      <div className="text-xs font-medium bg-primary/10 px-2 py-0.5 rounded text-primary">
                                                        = $
                                                        {Number(
                                                          elementCosts[element.id]?.materialCost ?? element.material_cost ?? 0
                                                        ).toFixed(2)}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          {element.labor_cost_formula && (
                                            <div className="mt-2 flex flex-col">
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-semibold">
                                                    Labor Cost Formula:
                                                  </span>
                                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                                    {replaceVariableIdsWithNames(
                                                      element.labor_cost_formula,
                                                      variables,
                                                      element.labor_formula_variables ||
                                                        []
                                                                                                       )}
                                                  </code>
                                                </div>                                                {(element.labor_cost !== undefined || elementCosts[element.id]?.laborCost !== null) && (
                                                  <div className="flex items-center gap-2">
                                                    {updatingElementCosts.has(element.id) ? (
                                                      <div className="flex items-center gap-1 text-xs font-medium bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                        Calculating...
                                                      </div>
                                                    ) : (
                                                      <div className="text-xs font-medium bg-primary/10 px-2 py-0.5 rounded text-primary">
                                                        = $
                                                        {Number(
                                                          elementCosts[element.id]?.laborCost ?? element.labor_cost ?? 0
                                                        ).toFixed(2)}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}

                                          <div className="mt-2 flex flex-col">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-semibold">
                                                  Markup:
                                                </span>
                                                {editingMarkupElementId === element.id ? (
                                                  <div className="flex">
                                                    <Input 
                                                      type="number"
                                                      value={inlineMarkupValue}
                                                      onChange={(e) => setInlineMarkupValue(Number(e.target.value))}
                                                      onFocus={(e) => e.target.select()}
                                                      onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                          saveElementMarkup(element.id, trade.id, inlineMarkupValue);
                                                        } else if (e.key === 'Escape') {
                                                          cancelEditingMarkup();
                                                        }
                                                      }}
                                                      onBlur={() => saveElementMarkup(element.id, trade.id, inlineMarkupValue)}
                                                      className="h-6 text-xs py-0 w-16"
                                                      autoFocus
                                                      min={0}
                                                      max={100}
                                                    />
                                                    <span className="text-xs ml-1 flex items-center">%</span>
                                                  </div>
                                                ) : (
                                                  <code 
                                                    className="text-xs bg-muted px-1 py-0.5 rounded cursor-pointer hover:bg-primary/10"
                                                    onClick={() => startEditingElementMarkup(element)}
                                                  >
                                                    {element.markup !== undefined && element.markup !== null ? 
                                                      `${element.markup}%` : 
                                                      '0%'}
                                                  </code>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="absolute -top-2 -right-2 flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-primary hover:text-primary/80"
                                          onClick={() =>
                                            handleOpenEditDialog(element)
                                          }
                                        >
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="11"
                                            height="11"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2-2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                          </svg>
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-destructive hover:text-destructive/80"
                                          onClick={() => handleRemoveElement(element.id, trade.id)}
                                        >
                                          <X className="h-2.5 w-2.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground mt-3 border-t pt-2">
                              No elements in this trade
                            </div>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-destructive hover:text-destructive/80"
                            onClick={() => handleRemoveTrade(trade.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
                      <p className="text-sm">No trades defined</p>
                      <p className="text-xs">
                        Trades help organize elements by category
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TradesAndElementsStep;