"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
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
  ImageUpload,
} from "@/components/shared";
import { toast } from "sonner";
import {
  X,
  BracesIcon,
  Variable,
  Search,
  Loader2,
  PlusCircle,
  ImageIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllVariables } from "@/api-calls/variables/get-all-variables";
import { getAllVariableTypes } from "@/api-calls/variable-types/get-all-variable-types";
import { updateTrade } from "@/api-calls/trades/update-trade";
import { getAllTrades } from "@/api-calls/trades/get-all-trades";
import { getAllElements } from "@/api-calls/elements/get-all-elements";
import { createVariable } from "@/api-calls/variables/create-variable";
import { createTrade } from "@/api-calls/trades/create-trade";
import { createElement } from "@/api-calls/elements/create-element";
import { updateElement } from "@/api-calls/elements/update-element";
import { VariableResponse } from "@/types/variables/dto";
import { ElementResponse } from "@/types/elements/dto";
import { TradeResponse } from "@/types/trades/dto";
import { useFormula } from "./hooks/use-formula";
import { ElementDialog } from "./components/element-dialog";
import {
  Dialog as ConfirmDialog,
  DialogContent as ConfirmDialogContent,
  DialogHeader as ConfirmDialogHeader,
  DialogTitle as ConfirmDialogTitle,
  DialogFooter as ConfirmDialogFooter,
} from "@/components/shared";
import { getVariables } from "@/query-options/variables";
import { getTrades } from "@/query-options/trades";
import { getElements } from "@/query-options/elements";
import { ProductResponse } from "@/types/products/dto";
import { cn } from "@/lib/utils";

interface TradesAndElementsStepProps {
  data: {
    trades: TradeResponse[];
    variables: VariableResponse[];
  };
  updateTrades: (trades: TradeResponse[]) => void;
  updateVariables?: (variables: VariableResponse[]) => void;
}

const TradesAndElementsStep: React.FC<TradesAndElementsStepProps> = ({
  data,
  updateTrades,
  updateVariables = () => {},
}) => {
  // =========== STATE MANAGEMENT ===========

  // Variable-related state
  const [newVarName, setNewVarName] = useState("");
  const [newVarDefaultValue, setNewVarDefaultValue] = useState(0);
  const [newVarDescription, setNewVarDescription] = useState("");
  const [newVarDefaultVariableType, setNewVarDefaultVariableType] =
    useState("");
  const [formulaFieldSource, setFormulaFieldSource] = useState<string | null>(
    null
  );
  const [pendingVariableName, setPendingVariableName] = useState("");
  const variables = data.variables || [];
  const [pendingVariableCallback, setPendingVariableCallback] = useState<
    ((newVariable: VariableResponse) => void) | null
  >(null);

  // Trade-related state
  const [tradeSearchQuery, setTradeSearchQuery] = useState("");
  const [isTradeSearchOpen, setIsTradeSearchOpen] = useState(false);
  const [newTradeName, setNewTradeName] = useState("");
  const [newTradeDescription, setNewTradeDescription] = useState("");
  const [newTradeImage, setNewTradeImage] = useState("");
  const trades = data.trades || [];
  const [tradeSkeletons, setTradeSkeletons] = useState<Record<string, boolean>>(
    {}
  );

  // Element-related state
  const [elementSearchQuery, setElementSearchQuery] = useState("");
  const [isElementSearchOpen, setIsElementSearchOpen] = useState(false);
  const [elementSearchQueries, setElementSearchQueries] = useState<
    Record<string, string>
  >({});
  const [showAddElementDialog, setShowAddElementDialog] = useState(false);
  const [showEditElementDialog, setShowEditElementDialog] = useState(false);
  const [currentTradeId, setCurrentTradeId] = useState<string | null>(null);
  const [currentElementId, setCurrentElementId] = useState<string | null>(null);
  const [elementToEdit, setElementToEdit] = useState<ElementResponse | null>(
    null
  );
  const [newElementName, setNewElementName] = useState("");

  // Store a local copy of variables to prevent issues with autocomplete
  const [localVariables, setLocalVariables] = useState<VariableResponse[]>([]);

  // Update local variables when data.variables changes
  useEffect(() => {
    if (data.variables && data.variables.length > 0) {
      setLocalVariables(data.variables);
    }
  }, [data.variables]);

  // Use our formula hook for formula management
  const { replaceVariableNamesWithIds, replaceVariableIdsWithNames } =
    useFormula();

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddTradeDialog, setShowAddTradeDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add with other states
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  // API Queries
  const { data: tradesData, isLoading: tradesLoading } = useQuery(
    getTrades(1, 10, tradeSearchQuery)
  );
  const { data: elementsData, isLoading: elementsLoading } = useQuery(
    getElements(1, 10, elementSearchQuery)
  );
  const { data: variablesData, isLoading: variablesLoading } = useQuery(
    getVariables(1, 10, searchQuery)
  );

  const { data: apiVariableTypes = [], isLoading: isLoadingVariableTypes } =
    useQuery({
      queryKey: ["variable-types"],
      queryFn: () => getAllVariableTypes(),
    });

  // =========== MUTATIONS ===========

  const queryClient = useQueryClient();

  // Variable mutation
  const { mutate: createVariableMutation } = useMutation({
    mutationFn: createVariable,
    onSuccess: (response) => {
      if (response && response.data) {
        const createdVariable = response.data;

        // Update both local and parent variables
        const updatedVariables = [...localVariables, createdVariable];
        setLocalVariables(updatedVariables);
        updateVariables(updatedVariables);

        // Call the pending callback if it exists, with proper error handling
        try {
          if (pendingVariableCallback) {
            console.log(
              "Calling pendingVariableCallback with variable:",
              createdVariable
            );
            pendingVariableCallback(createdVariable);
            setPendingVariableCallback(null);
          }
        } catch (error) {
          console.error("Error in pendingVariableCallback:", error);
        }

        toast.success("Variable created successfully", {
          position: "top-center",
          description: `"${createdVariable.name}" has been added to your template.`,
        });

        // Invalidate the variables query to refresh the data
        queryClient.invalidateQueries({ queryKey: ["variables"] });

        // Close dialog and reset form state
        setShowAddDialog(false);
        setNewVarName("");
        setNewVarDescription("");
        setNewVarDefaultValue(0);
        setNewVarDefaultVariableType("");
        setIsSubmitting(false);
        setSearchQuery("");
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
      // Clear the callback in case of error
      setPendingVariableCallback(null);
    },
  });

  // Trade mutation
  const { mutate: createTradeMutation, isPending: isCreatingTrade } =
    useMutation({
      mutationFn: createTrade,
      onSuccess: (response) => {
        if (response && response.data) {
          const createdTrade = response.data;
          console.log("Trade created successfully with data:", createdTrade);
          
          // Make sure the image is preserved in the created trade object
          if (newTradeImage && !createdTrade.image) {
            createdTrade.image = newTradeImage;
          }
          
          updateTrades([...trades, createdTrade]);
          toast.success("Trade created successfully", {
            position: "top-center",
            description: `"${createdTrade.name}" has been added to your template.`,
          });
          setShowAddTradeDialog(false);
          setNewTradeName("");
          setNewTradeDescription("");
          setNewTradeImage("");
          setTradeSearchQuery("");
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

  // Trade update mutation to connect elements to trades
  const { mutate: updateTradeMutation } = useMutation({
    mutationFn: ({
      tradeId,
      data,
    }: {
      tradeId: string;
      data: { elements: string[] };
    }) => updateTrade(tradeId, data),
    onSuccess: () => {
      // No need to update UI state again since we already did it in createElementMutation
    },
    onError: (error) => {
      toast.error("Failed to connect element to trade", {
        position: "top-center",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    },
  });

  // Element update mutation
  const { mutate: updateElementMutation, isPending: isUpdatingElement } =
    useMutation({
      mutationFn: ({ elementId, data }: { elementId: string; data: any }) =>
        updateElement(elementId, data),
      onSuccess: (response) => {
        if (response && response.data) {
          const updatedElement = response.data;

          // Update the element in all trades where it exists
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

          toast.success("Element updated successfully", {
            position: "top-center",
            description: `"${updatedElement.name}" has been updated.`,
          });

          setShowEditElementDialog(false);
          setCurrentElementId(null);
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

  // Element creation mutation
  const { mutate: createElementMutation, isPending: isCreatingElement } =
    useMutation({
      mutationFn: createElement,
      onSuccess: (response) => {
        if (response && response.data) {
          const createdElement = response.data;

          // Find the trade to add this element to
          const updatedTrades = trades.map((trade) => {
            if (trade.id === currentTradeId) {
              // Add the element to this trade
              return {
                ...trade,
                elements: [...(trade.elements || []), createdElement],
              };
            }
            return trade;
          });

          // Update the UI state first
          updateTrades(updatedTrades);

          // Then update the backend to connect the element to the trade using React Query mutation
          if (currentTradeId) {
            // Find the current trade that we're adding the element to
            const currentTrade = trades.find(
              (trade) => trade.id === currentTradeId
            );
            if (currentTrade) {
              // Get all elements including the new one
              const updatedElements = [
                ...(currentTrade.elements || []),
                createdElement,
              ].map((elem) => elem.id);

              // Use the updateTradeMutation to connect element to trade
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

          // Reset form and close dialog
          setShowAddElementDialog(false);
          setElementSearchQuery("");
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

  // =========== FILTERED DATA ===========

  const filteredVariables =
    searchQuery === ""
      ? []
      : Array.isArray(variablesData?.data)
      ? (variablesData.data as VariableResponse[]).filter(
          (variable) =>
            variable.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
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
            !trades.some((t) => t.id === trade.id) &&
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
            (e) => e.id === element.id
          );

          return matchesQuery && !isAlreadyInTrade;
        })
      : [];

  // =========== EVENT HANDLERS ===========

  const handleSelectVariable = (variable: VariableResponse) => {
    // Make sure we work with local variables to prevent state loss
    const newVar: VariableResponse = {
      id: variable.id.toString(),
      name: variable.name,
      description: variable.description,
      value: variable.value,
      is_global: variable.is_global,
      variable_type: variable.variable_type,
      created_at: variable.created_at,
      updated_at: variable.updated_at,
      created_by: variable.created_by,
      updated_by: variable.updated_by,
    };

    if (!localVariables.some((v) => v.id === newVar.id)) {
      const updatedVariables = [...localVariables, newVar];
      setLocalVariables(updatedVariables);
      updateVariables(updatedVariables);
    }

    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleAddVariable = () => {
    if (!validateVariableForm()) return;

    const variableData = {
      name: newVarName.trim(),
      description: newVarDescription.trim() || undefined,
      value: newVarDefaultValue,
      is_global: false,
      variable_type: newVarDefaultVariableType,
    };
    setIsSubmitting(true);
    createVariableMutation(variableData);
  };

  const handleRemoveVariable = (variableId: string) => {
    const usedInElements = findElementsUsingVariable(variableId);
    if (usedInElements.length > 0) {
      setVariableToRemove(
        localVariables.find((v) => v.id === variableId) || null
      );
      setElementsUsingVariable(usedInElements);
      setShowRemoveVariableConfirm(true);
    } else {
      const updatedVariables = localVariables.filter(
        (v) => v.id !== variableId
      );
      setLocalVariables(updatedVariables);
      updateVariables(updatedVariables);
    }
  };

  // Add this helper function to extract variable names from formulas
  const extractVariableNamesFromFormula = (formula: string): string[] => {
    if (!formula) return [];
    const variableNameRegex = /\{([^}]+)\}/g;
    const matches = formula.match(variableNameRegex);
    if (!matches) return [];
    return matches.map((match) => match.substring(1, match.length - 1));
  };

  const handleSelectTrade = (trade: TradeResponse) => {
    const newTrade: TradeResponse = {
      id: trade.id.toString(),
      name: trade.name,
      description: trade.description,
      origin: trade.origin,
      image: trade.image || "",
      elements: trade.elements,
      created_at: trade.created_at,
      updated_at: trade.updated_at,
      created_by: trade.created_by,
      updated_by: trade.updated_by,
    };

    if (!trades.some((t) => t.id === newTrade.id)) {
      updateTrades([...trades, newTrade]);

      // Auto-import variables from element formulas
      if (newTrade.elements && newTrade.elements.length > 0) {
        // Show skeleton while we process
        setTradeSkeletons((prev) => ({ ...prev, [newTrade.id]: true }));

        // Collect all variable names from element formulas
        const variablesToAdd: VariableResponse[] = [];

        newTrade.elements.forEach((element) => {
          // Extract variable names from material formula
          if (element.material_cost_formula) {
            const materialFormulaVariableNames = extractVariableNamesFromFormula(
              replaceVariableIdsWithNames(
                element.material_cost_formula,
                [], // Empty array because we're looking for names already in the formula
                element.material_formula_variables || []
              )
            );

            materialFormulaVariableNames.forEach((varName) => {
              // Find in available variables but not in local variables
              const availableVariable = variablesData?.data?.find(
                (v: VariableResponse) =>
                  v.name === varName &&
                  !localVariables.some((localVar) => localVar.name === varName)
              );

              if (
                availableVariable &&
                !variablesToAdd.some((v) => v.id === availableVariable.id)
              ) {
                variablesToAdd.push(availableVariable);
              }
            });
          }

          // Extract variable names from labor formula
          if (element.labor_cost_formula) {
            const laborFormulaVariableNames = extractVariableNamesFromFormula(
              replaceVariableIdsWithNames(
                element.labor_cost_formula,
                [], // Empty array because we're looking for names already in the formula
                element.labor_formula_variables || []
              )
            );

            laborFormulaVariableNames.forEach((varName) => {
              // Find in available variables but not in local variables
              const availableVariable = variablesData?.data?.find(
                (v: VariableResponse) =>
                  v.name === varName &&
                  !localVariables.some((localVar) => localVar.name === varName)
              );

              if (
                availableVariable &&
                !variablesToAdd.some((v) => v.id === availableVariable.id)
              ) {
                variablesToAdd.push(availableVariable);
              }
            });
          }
        });

        // Add the variables to local variables
        if (variablesToAdd.length > 0) {
          const updatedVariables = [...localVariables, ...variablesToAdd];
          setLocalVariables(updatedVariables);
          updateVariables(updatedVariables);

          toast.success(`${variablesToAdd.length} variables automatically added`, {
            position: "top-center",
            description: `Required variables for formulas have been imported.`,
          });
        }

        // Hide skeleton after processing
        setTimeout(() => {
          setTradeSkeletons((prev) => ({ ...prev, [newTrade.id]: false }));
        }, 1000);
      }
    }

    setIsTradeSearchOpen(false);
    setTradeSearchQuery("");
  };

  const handleRemoveTrade = (tradeId: string) => {
    updateTrades(trades.filter((t) => t.id !== tradeId));
  };  const handleAddTrade = () => {
    if (!validateTradeForm()) return;
    
    // Log the image data for debugging
    console.log("Adding trade with image:", newTradeImage);
    
    const tradeData = {
      name: newTradeName.trim(),
      description: newTradeDescription.trim() || undefined,
      image: newTradeImage,  // Send empty string for removal, don't convert to undefined
    };
    
    createTradeMutation(tradeData);
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

  const handleOpenAddElementDialog = (tradeId: string) => {
    setCurrentTradeId(tradeId);
    setElementToEdit(null);
    setNewElementName(elementSearchQueries[tradeId] || "");
    setShowAddElementDialog(true);
  };

  const handleOpenEditDialog = (element: ElementResponse) => {
    setElementToEdit(element);
    setCurrentElementId(element.id);
    setShowEditElementDialog(true);
  };  const handleAddElement = (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
    materialFormulaProducts?: Record<string, any>[];
    laborFormulaProducts?: Record<string, any>[];
  }) => {
    if (!data.name.trim() || !currentTradeId) return;

    // Replace variable names with IDs in material formula
    let materialFormula = data.materialFormula.trim()
      ? replaceVariableNamesWithIds(data.materialFormula.trim(), localVariables)
      : undefined;

    // Replace variable names with IDs in labor formula
    let laborFormula = data.laborFormula.trim()
      ? replaceVariableNamesWithIds(data.laborFormula.trim(), localVariables)      : undefined;

    const elementData = {
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      image: data.image, // Pass image directly, including empty strings
      material_cost_formula: materialFormula,
      labor_cost_formula: laborFormula,
    };

    console.log("Creating element with data:", elementData);
    
    createElementMutation(elementData);

    setElementSearchQueries((prev) => ({
      ...prev,
      [currentTradeId]: "",
    }));
    setElementSearchQuery("");
  };  const handleUpdateElement = (data: {
    name: string;
    description: string;
    image?: string;
    materialFormula: string;
    laborFormula: string;
  }) => {
    if (!data.name.trim() || !currentElementId) return;

    const materialFormula = data.materialFormula.trim()
      ? replaceVariableNamesWithIds(data.materialFormula.trim(), variables)
      : undefined;

    const laborFormula = data.laborFormula.trim()
      ? replaceVariableNamesWithIds(data.laborFormula.trim(), variables)
      : undefined;

    const elementData = {
      name: data.name.trim(),
      description: data.description.trim() || undefined,
      image: data.image, // Pass the image value directly, including empty strings
      material_cost_formula: materialFormula,
      labor_cost_formula: laborFormula,
      markup: 1,
    };

    console.log("Updating element with data:", elementData);
    
    updateElementMutation({
      elementId: currentElementId,
      data: elementData,
    });
  };

  // Confirm remove
  const confirmRemoveVariable = () => {
    if (variableToRemove) {
      const updatedVariables = localVariables.filter(
        (v) => v.id !== variableToRemove.id
      );
      setLocalVariables(updatedVariables);
      updateVariables(updatedVariables);
      setShowRemoveVariableConfirm(false);
      setVariableToRemove(null);
      setElementsUsingVariable([]);
    }
  };

  // Cancel remove
  const cancelRemoveVariable = () => {
    setShowRemoveVariableConfirm(false);
    setVariableToRemove(null);
    setElementsUsingVariable([]);
  };

  // Add state for edit variable dialog
  const [showEditVariableDialog, setShowEditVariableDialog] = useState(false);
  const [variableToEdit, setVariableToEdit] = useState<VariableResponse | null>(null);

  // Handler to open edit dialog and prefill form
  const handleOpenEditVariableDialog = (variable: VariableResponse) => {
    setVariableToEdit(variable);
    setNewVarName(variable.name);
    setNewVarDescription(variable.description || "");
    setNewVarDefaultValue(variable.value ?? 0);
    setNewVarDefaultVariableType(variable.variable_type?.id?.toString() || "");
    setShowEditVariableDialog(true);
  };

  // Handler to submit edit
  const handleEditVariable = () => {
    if (!validateVariableForm() || !variableToEdit) return;
    const updatedVariable: VariableResponse = {
      ...variableToEdit,
      name: newVarName.trim(),
      description: newVarDescription.trim() || undefined,
      value: newVarDefaultValue,
      variable_type: {
        ...variableToEdit.variable_type,
        id: newVarDefaultVariableType,
        name: variableToEdit.variable_type?.name || "",
        category: variableToEdit.variable_type?.category || "",
        unit: variableToEdit.variable_type?.unit || "",
        is_built_in: variableToEdit.variable_type?.is_built_in ?? false,
        created_at: variableToEdit.variable_type?.created_at || "",
        updated_at: variableToEdit.variable_type?.updated_at || "",
        created_by: variableToEdit.variable_type?.created_by,
        updated_by: variableToEdit.variable_type?.updated_by,
      },
    };
    const updatedVariables = localVariables.map((v) =>
      v.id === variableToEdit.id ? updatedVariable : v
    );
    setLocalVariables(updatedVariables);
    updateVariables(updatedVariables);
    setShowEditVariableDialog(false);
    setVariableToEdit(null);
    setNewVarName("");
    setNewVarDescription("");
    setNewVarDefaultValue(0);
    setNewVarDefaultVariableType("");
  };

  // Add state for edit trade dialog
  const [showEditTradeDialog, setShowEditTradeDialog] = useState(false);
  const [tradeToEdit, setTradeToEdit] = useState<TradeResponse | null>(null);

  // Handler to open edit trade dialog and prefill form
  const handleOpenEditTradeDialog = (trade: TradeResponse) => {
    setTradeToEdit(trade);
    setNewTradeName(trade.name);
    setNewTradeDescription(trade.description || "");
    setNewTradeImage(trade.image || "");
  setShowEditTradeDialog(true);
  };

  // Handler to submit trade edit with proper API call
  const handleEditTrade = () => {
    if (!validateTradeForm() || !tradeToEdit) return;
    
    console.log("Editing trade with image:", newTradeImage);
    
    // Prepare the update data for API call including existing elements
    const updateData = {
      name: newTradeName.trim(),
      description: newTradeDescription.trim() || undefined,
      image: newTradeImage,  // Send empty string for removal, don't convert to undefined
      elements: tradeToEdit.elements?.map(e => e.id) || [],
    };
    
    // Update local state first for immediate UI feedback
    const updatedTrade: TradeResponse = {
      ...tradeToEdit,
      name: newTradeName.trim(),
      description: newTradeDescription.trim() || undefined,
      image: newTradeImage,  // Send empty string for removal, don't convert to undefined
    };
    
    const updatedTrades = trades.map((t) =>
      t.id === tradeToEdit.id ? updatedTrade : t
    );
    updateTrades(updatedTrades);
    
    // Call the backend update mutation with proper structure
    updateTradeMutation({
      tradeId: tradeToEdit.id,
      data: updateData
    });
    
    setShowEditTradeDialog(false);
    setTradeToEdit(null);
    setNewTradeName("");
    setNewTradeDescription("");
    setNewTradeImage("");
  };

  // =========== VALIDATION STATE/FORMS ===========
  const [variableErrors, setVariableErrors] = useState({
    name: "",
    variable_type: "",
  });

  const [variableTouched, setVariableTouched] = useState({
    name: false,
    variable_type: false,
  });

  const [tradeErrors, setTradeErrors] = useState({
    name: "",
  });

  const [tradeTouched, setTradeTouched] = useState({
    name: false,
  });

  const [showRemoveVariableConfirm, setShowRemoveVariableConfirm] =
    useState(false);
  const [variableToRemove, setVariableToRemove] =
    useState<VariableResponse | null>(null);
  const [elementsUsingVariable, setElementsUsingVariable] = useState<
    ElementResponse[]
  >([]);
  const [showMissingVariableDialog, setShowMissingVariableDialog] =
    useState(false);
  const [missingVariable, setMissingVariable] = useState<string | null>(null);

  // Add validation functions
  const validateVariableForm = () => {
    const newErrors = { name: "", variable_type: "" };

    // Exclude the variable being edited from the duplicate name check
    const duplicate = variables.some((v) =>
      v.name.toLowerCase() === newVarName.toLowerCase() &&
      (!variableToEdit || v.id !== variableToEdit.id)
    );

    if (!newVarName.trim()) {
      newErrors.name = "Variable name is required";
    } else if (newVarName.length > 50) {
      newErrors.name = "Variable name must be less than 50 characters";
    } else if (duplicate) {
      newErrors.name = "Variable with this name already exists";
    }

    if (!newVarDefaultVariableType) {
      newErrors.variable_type = "Variable type is required";
    }

    setVariableErrors(newErrors);
    return !newErrors.name && !newErrors.variable_type;
  };

  const handleVariableBlur = (field: any) => {
    setVariableTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateTradeForm = () => {
    const newErrors = { name: "" };

    // Exclude the trade being edited from the duplicate name check
    const duplicate = trades.some((t) =>
      t.name.toLowerCase() === newTradeName.toLowerCase() &&
      (!tradeToEdit || t.id !== tradeToEdit.id)
    );

    if (!newTradeName.trim()) {
      newErrors.name = "Trade name is required";
    } else if (newTradeName.length > 50) {
      newErrors.name = "Trade name must be less than 50 characters";
    } else if (duplicate) {
      newErrors.name = "Trade with this name already exists";
    }

    setTradeErrors(newErrors);
    return !newErrors.name;
  };

  const handleTradeBlur = (field: any) => {
    setTradeTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Helper: Find elements using a variable
  const findElementsUsingVariable = (variableId: string) => {
    const usedIn: ElementResponse[] = [];
    trades.forEach((trade) => {
      (trade.elements || []).forEach((element) => {
        // Check both material and labor formulas for variable usage
        const materialVars = element.material_formula_variables || [];
        const laborVars = element.labor_formula_variables || [];
        if (
          materialVars.some((v) => v.id === variableId) ||
          laborVars.some((v) => v.id === variableId)
        ) {
          usedIn.push(element);
        }
      });
    });
    return usedIn;
  };

  // Add this helper function
  const hasExactMatch = (query: string, trades: TradeResponse[]) => {
    return trades.some(
      (trade) => trade.name.toLowerCase() === query.toLowerCase()
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Template Variables & Trades</h2>
        <p className="text-muted-foreground mb-6">
          Define variables for your template and organize elements by trade.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Variables Section */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <Variable className="mr-2 h-5 w-5" />
                <span>Template Variables</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  {/* Search */}
                  <div className="relative w-full mb-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search variables..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        // Always show suggestions if there's content, regardless of results
                        if (e.target.value.trim()) {
                          setIsSearchOpen(true);
                        } else {
                          setIsSearchOpen(false);
                        }
                      }}
                      onFocus={() => {
                        // Always show suggestions on focus if there's content
                        if (searchQuery.trim()) {
                          setIsSearchOpen(true);
                        }
                      }}
                      onBlur={() => {
                        // Use setTimeout to allow clicks on the dropdown to register first
                        setTimeout(() => setIsSearchOpen(false), 200);
                      }}
                      onClick={() => {
                        // Also show on click if there's content
                        if (searchQuery.trim()) {
                          setIsSearchOpen(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Tab" && filteredVariables.length > 0) {
                          e.preventDefault();
                          handleSelectVariable(filteredVariables[0]);
                        } else if (e.key === "Enter") {
                          if (
                            filteredVariables.length === 0 ||
                            !searchQuery.trim()
                          ) {
                            setIsSearchOpen(false);
                            setShowAddDialog(true);
                            setNewVarName(searchQuery.trim());
                          } else if (filteredVariables.length === 1) {
                            handleSelectVariable(filteredVariables[0]);
                          }
                        }
                      }}
                      className="w-full pl-8 pr-10"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                        tabIndex={-1}
                        aria-label="Clear variable search"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                    {variablesLoading && (
                      <div className="absolute right-2 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Variable search results dropdown */}
                  {searchQuery.trim() && isSearchOpen && (
                    <div className="absolute z-10 w-full border rounded-md bg-background shadow-md">
                      <div className="p-2">
                        <p className="text-xs text-muted-foreground mb-1 px-2">
                          Variables
                        </p>
                        {filteredVariables.length > 0 ? (
                          filteredVariables
                            .filter(
                              (variable) => variable.origin === "original"
                            )
                            .map((variable) => (
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
                              <span className="text-muted-foreground">
                                Variable already added
                              </span>
                            ) : (
                              <div>
                                <span className="text-muted-foreground">
                                  "{searchQuery}" doesn't exist.
                                </span>
                                <p className="text-xs mt-1 text-primary">
                                  Press Enter to create this variable
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}                  {/* Add variable dialog */}
                  <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogContent className="sm:max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center">
                          <BracesIcon className="mr-2 h-4 w-4" />
                          Add Template Variable
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="var-name">
                            Variable Name{" "}
                            <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="var-name"
                              placeholder="Wall Length"
                              value={newVarName}
                              onChange={(e) => setNewVarName(e.target.value)}
                              onBlur={() => handleVariableBlur("name")}
                              className={
                                variableErrors.name && variableTouched.name
                                  ? "border-red-500 pr-10"
                                  : "pr-10"
                              }
                            />
                            {newVarName && (
                              <button
                                type="button"
                                onClick={() => setNewVarName("")}
                                className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                                tabIndex={-1}
                                aria-label="Clear variable name"
                              >
                                <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                              </button>
                            )}
                          </div>
                          {variableErrors.name && variableTouched.name && (
                            <p className="text-xs text-red-500">
                              {variableErrors.name}
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="var-type">
                            Variable Type{" "}
                            <span className="text-red-500">*</span>
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
                                value={newVarDefaultVariableType}
                                onValueChange={setNewVarDefaultVariableType}
                              >
                                <SelectTrigger
                                  className={`w-full ${
                                    variableErrors.variable_type &&
                                    variableTouched.variable_type
                                      ? "border-red-500"
                                      : ""
                                  }`}
                                >
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
                              {variableErrors.variable_type &&
                                variableTouched.variable_type && (
                                  <p className="text-xs text-red-500">
                                    {variableErrors.variable_type}
                                  </p>
                                )}
                            </>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="var-description">
                            Description
                            <span className="text-gray-500">
                              &#40;Optional&#41;
                            </span>
                          </Label>
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
                            if (!validateVariableForm()) return;

                            setIsSubmitting(true);
                            const variableData = {
                              name: newVarName.trim(),
                              description:
                                newVarDescription.trim() || undefined,
                              value: newVarDefaultValue,
                              is_global: false,
                              variable_type: newVarDefaultVariableType,
                            };
                            createVariableMutation(variableData);
                          }}
                          disabled={isSubmitting}
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

                {/* Variables List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">
                    Variables ({variables.length})
                  </h3>
                  <ScrollArea className="h-[300px] pr-4 -mr-4">
                    {variables.length > 0 ? (
                      <div className="space-y-2">
                        {variables.map((variable) => (
                          <div
                            key={variable.id}
                            className="border rounded-md p-3 bg-muted/30 relative group overflow-visible"
                          >
                            {/* Edit and Remove buttons in the absolute top right corner, matching elements */}
                            <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-primary hover:text-primary/80"
                                onClick={() => handleOpenEditVariableDialog(variable)}
                                aria-label="Edit variable"
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
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-destructive hover:text-destructive/80"
                                onClick={() => handleRemoveVariable(variable.id)}
                                aria-label="Remove variable"
                              >
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-sm flex items-center">
                                {variable.name}
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

        {/* Trades and Elements Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <BracesIcon className="mr-2 h-5 w-5" />
                <span>Template Trades</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  {/* Search */}
                  <div className="relative w-full mb-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search trades..."
                      value={tradeSearchQuery}
                      onChange={(e) => {
                        setTradeSearchQuery(e.target.value);
                        setSelectedSuggestionIndex(-1); // Reset selection
                        if (e.target.value.trim()) {
                          setIsTradeSearchOpen(true);
                        } else {
                          setIsTradeSearchOpen(false);
                        }
                      }}
                      onFocus={() => {
                        // Always show suggestions on focus if there's content
                        if (tradeSearchQuery.trim()) {
                          setIsTradeSearchOpen(true);
                        }
                      }}
                      onBlur={() => {
                        // Use setTimeout to allow clicks on the dropdown to register first
                        setTimeout(() => setIsTradeSearchOpen(false), 200);
                      }}
                      onClick={() => {
                        // Also show on click if there's content
                        if (tradeSearchQuery.trim()) {
                          setIsTradeSearchOpen(true);
                        }
                      }}
                      onKeyDown={(e) => {
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
                      className="w-full pl-8 pr-10"
                    />
                    {tradeSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTradeSearchQuery("")}
                        className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                        tabIndex={-1}
                        aria-label="Clear trade search"
                      >
                        <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                    {tradesLoading && (
                      <div className="absolute right-2 top-2.5">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  {/* Trade search results dropdown */}
                  {tradeSearchQuery.trim() && isTradeSearchOpen && (
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
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Dialog for adding a new trade */}                  <Dialog
                    open={showAddTradeDialog}
                    onOpenChange={setShowAddTradeDialog}
                  >
                    <DialogContent className="sm:max-w-4xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center">
                          <BracesIcon className="mr-2 h-4 w-4" />
                          Add New Trade
                        </DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="trade-name">
                            Trade Name <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              id="trade-name"
                              placeholder="Framing"
                              value={newTradeName}
                              onChange={(e) => setNewTradeName(e.target.value)}
                              onBlur={() => handleTradeBlur("name")}
                              className={
                                tradeErrors.name && tradeTouched.name
                                  ? "border-red-500 pr-10"
                                  : "pr-10"
                              }
                            />
                            {newTradeName && (
                              <button
                                type="button"
                                onClick={() => setNewTradeName("")}
                                className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                                tabIndex={-1}
                                aria-label="Clear trade name"
                              >
                                <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                              </button>
                            )}
                          </div>
                          {tradeErrors.name && tradeTouched.name && (
                            <p className="text-xs text-red-500">
                              {tradeErrors.name}
                            </p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="trade-description">
                            Description
                            <span className="text-gray-500">
                              &#40;Optional&#41;
                            </span>
                          </Label>
                          <Textarea
                            id="trade-description"
                            placeholder="Description of what this trade covers"
                            value={newTradeDescription}
                            onChange={(e) =>
                              setNewTradeDescription(e.target.value)
                            }
                            className="min-h-[80px]"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="trade-image">
                            Trade Image
                            <span className="text-gray-500">&#40;Optional&#41;</span>
                          </Label>                          <ImageUpload
                            value={newTradeImage}
                            onChange={(value) => {
                              console.log("Image selected:", value);
                              setNewTradeImage(value || "");
                            }}
                            placeholder="Click or drag to upload a trade image"
                            height={160}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setShowAddTradeDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleAddTrade}
                          disabled={isCreatingTrade}
                        >
                          {isCreatingTrade ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            "Add Trade"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Trades List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">
                    Trades ({trades.length})
                  </h3>
                  {trades.length > 0 ? (
                    <div className="space-y-2">
                      {trades.map((trade) => (
                        <div
                          key={trade.id}
                          className="border rounded-md p-3 bg-muted/30 relative group"
                        >
                          {tradeSkeletons[trade.id] ? (
                            // Skeleton UI
                            <div className="animate-pulse space-y-2">
                              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                              <div className="h-3 bg-muted rounded w-1/4 mb-2" />
                              <div className="h-8 bg-muted rounded w-full" />
                            </div>                              ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm flex items-center gap-2">
                                  {trade.image ? (
                                    <div className="relative w-10 h-10 rounded-md overflow-hidden">
                                      <Image 
                                        src={trade.image}
                                        alt={trade.name}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded-md bg-muted/30 flex items-center justify-center">
                                      <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                                    </div>
                                  )}
                                  {trade.name}
                                </div>
                              </div>
                              {trade.description && (
                                <div className="text-xs mt-1 mb-2 line-clamp-1">
                                  {trade.description}
                                </div>
                              )}

                              <div className="mt-3 border-t pt-2">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                                    Elements
                                  </div>
                                </div>

                                <div className="relative mb-2">
                                  <div className="relative w-full mb-1">
                                    <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                                    <Input
                                      placeholder="Search elements..."
                                      value={
                                        elementSearchQueries[trade.id] || ""
                                      }
                                      onChange={(e) => {
                                        setCurrentTradeId(trade.id);
                                        setElementSearchQueries((prev) => ({
                                          ...prev,
                                          [trade.id]: e.target.value,
                                        }));
                                        setElementSearchQuery(e.target.value);

                                        // Always show dropdown when there's content, regardless of results
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

                                        // Always show dropdown when there's content, regardless of results
                                        if (tradeQuery.trim()) {
                                          setIsElementSearchOpen(true);
                                        }
                                      }}
                                      onBlur={() => {
                                        // Use setTimeout to allow clicks on the dropdown to register first
                                        setTimeout(
                                          () => setIsElementSearchOpen(false),
                                          200
                                        );
                                      }}
                                      onClick={() => {
                                        // Update necessary state and always show dropdown when there's content
                                        setCurrentTradeId(trade.id);
                                        const tradeQuery =
                                          elementSearchQueries[trade.id] || "";
                                        setElementSearchQuery(tradeQuery);

                                        if (tradeQuery.trim()) {
                                          setIsElementSearchOpen(true);
                                        }
                                      }}
                                      onKeyDown={(e) => {
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
                                            elementSearchQueries[trade.id] ||
                                            "";
                                          if (
                                            filteredElements.length === 0 ||
                                            !tradeQuery.trim()
                                          ) {
                                            setIsElementSearchOpen(false);
                                            handleOpenAddElementDialog(
                                              trade.id
                                            );
                                          } else if (
                                            filteredElements.length === 1
                                          ) {
                                            handleSelectElement(
                                              filteredElements[0],
                                              trade.id
                                            );
                                          }
                                        }
                                      }}
                                      className="w-full pl-7 pr-10 h-8 text-xs"
                                    />
                                    {elementSearchQueries[trade.id] && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setElementSearchQueries((prev) => ({
                                            ...prev,
                                            [trade.id]: "",
                                          }));
                                          setElementSearchQuery("");
                                        }}
                                        className="absolute right-2 top-2 flex items-center focus:outline-none"
                                        tabIndex={-1}
                                        aria-label="Clear element search"
                                      >
                                        <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                                      </button>
                                    )}
                                    {elementsLoading && (
                                      <div className="absolute right-2 top-2">
                                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Element search results */}
                                  {(
                                    elementSearchQueries[trade.id] || ""
                                  ).trim() &&
                                    isElementSearchOpen &&
                                    currentTradeId === trade.id && (
                                      <div className="absolute z-10 w-full border rounded-md bg-background shadow-md">
                                        <div className="p-2">
                                          <p className="text-xs text-muted-foreground mb-1 px-2">
                                            Elements
                                          </p>
                                          {filteredElements.length > 0 ? (
                                            filteredElements
                                              .filter(
                                                (elements) =>
                                                  elements.origin === "original"
                                              )
                                              .map((element) => (
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
                                                    <BracesIcon className="mr-2 h-4 w-4" />
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
                                                    (
                                                      elementSearchQueries[
                                                        trade.id
                                                      ] || ""
                                                    ).toLowerCase()
                                                  )
                                              ) ? (
                                                <span className="text-muted-foreground">
                                                  Element already added to this trade
                                                </span>
                                              ) : (
                                                <div>
                                                  <span className="text-muted-foreground">
                                                    "{elementSearchQueries[trade.id] || ""}" doesn't exist.
                                                  </span>
                                                  <p className="text-xs mt-1 text-primary">
                                                    Press Enter to create this element
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>

                                {/* Elements in trade */}
                                <div className="space-y-2">
                                  {trade.elements &&
                                  trade.elements.length > 0 ? (
                                    trade.elements.map((element) => (
                                      <div
                                        key={element.id}
                                        className="flex flex-col gap-2"
                                      >
                                        <div className="flex items-center gap-3 p-4 rounded border bg-background relative group">
                                          {/* Add element image display */}
                                          {element.image ? (                                            <div className="relative min-w-[44px] w-11 h-11 rounded-md overflow-hidden shrink-0">
                                              <Image 
                                                src={element.image}
                                                alt={element.name}
                                                fill
                                                className="object-cover"
                                              />
                                            </div>
                                          ) : (                                            <div className="min-w-[44px] w-11 h-11 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                                              <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                                            </div>
                                          )}
                                          
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
                                              <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                                                Formulas
                                              </div>
                                              <div className="space-y-1">
                                                {element.material_cost_formula && (
                                                  <div className="text-xs">
                                                    <span className="font-medium">Material:</span>{" "}
                                                    <code className="bg-muted/50 px-1 rounded text-[10px]">
                                                      {replaceVariableIdsWithNames(
                                                        element.material_cost_formula,
                                                        localVariables,
                                                        element.material_formula_variables || []
                                                      )}
                                                    </code>
                                                  </div>
                                                )}
                                                {element.labor_cost_formula && (
                                                  <div className="text-xs">
                                                    <span className="font-medium">Labor:</span>{" "}
                                                    <code className="bg-muted/50 px-1 rounded text-[10px]">
                                                      {replaceVariableIdsWithNames(
                                                        element.labor_cost_formula,
                                                        localVariables,
                                                        element.labor_formula_variables || []
                                                      )}
                                                    </code>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="absolute -top-2 -right-2 flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-primary hover:text-primary/80"
                                              onClick={() => handleOpenEditDialog(element)}
                                              aria-label="Edit element"
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
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                              </svg>
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-destructive hover:text-destructive/80"
                                              onClick={() => handleRemoveElement(element.id, trade.id)}
                                              aria-label="Remove element"
                                            >
                                              <X className="h-2.5 w-2.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-md">
                                      No elements in this trade
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="absolute -top-2 -right-2 flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-primary hover:text-primary/80"
                                  onClick={() => handleOpenEditTradeDialog(trade)}
                                  aria-label="Edit trade"
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
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 bg-muted/80 text-destructive hover:text-destructive/80"
                                  onClick={() => handleRemoveTrade(trade.id)}
                                  aria-label="Remove trade"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </>
                          )}
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

      {/* Element Dialogs using the new components with robust callback */}
      <ElementDialog
        isOpen={showAddElementDialog}
        onOpenChange={setShowAddElementDialog}
        onSubmit={handleAddElement}
        initialName={newElementName}
        variables={localVariables}
        updateVariables={(updatedVariables) => {
          if (typeof updatedVariables === "function") {
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
        onRequestCreateVariable={(variableName, callback) => {
          try {
            console.log(`Request to create variable: ${variableName}`);

            // Set the variable name to create
            setNewVarName(variableName);

            // Store the callback to be called after creation
            const safeCallback = (newVar: VariableResponse) => {
              try {
                if (!newVar) return;
                console.log(
                  `Variable created, running callback for: ${newVar.name}`
                );
                callback(newVar);
              } catch (err) {
                console.error("Error in variable creation callback:", err);
              }
            };
            setPendingVariableCallback(() => safeCallback);

            // Show the add dialog (without closing the element dialog)
            setShowAddDialog(true);
          } catch (err) {
            console.error("Error setting up variable creation:", err);
          }
        }}
      />

      <ElementDialog
        isOpen={showEditElementDialog}
        onOpenChange={setShowEditElementDialog}
        onSubmit={handleUpdateElement}
        elementToEdit={elementToEdit}
        variables={localVariables}
        updateVariables={(updatedVariables) => {
          if (typeof updatedVariables === "function") {
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
        isSubmitting={isUpdatingElement}
        dialogTitle="Edit Element"
        submitButtonText="Update Element"
        onRequestCreateVariable={(variableName, callback) => {
          try {
            console.log(`Request to create variable: ${variableName}`);

            // Set the variable name to create
            setNewVarName(variableName);

            // Store the callback to be called after creation
            const safeCallback = (newVar: VariableResponse) => {
              try {
                if (!newVar) return;
                console.log(
                  `Variable created, running callback for: ${newVar.name}`
                );
                callback(newVar);
              } catch (err) {
                console.error("Error in variable creation callback:", err);
              }
            };
            setPendingVariableCallback(() => safeCallback);

            // Show the add dialog (without closing the element dialog)
            setShowAddDialog(true);
          } catch (err) {
            console.error("Error setting up variable creation:", err);
          }
        }}
      />      <Dialog open={showEditVariableDialog} onOpenChange={setShowEditVariableDialog}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <BracesIcon className="mr-2 h-4 w-4" />
              Edit Template Variable
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-var-name">
                Variable Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="edit-var-name"
                  placeholder="Wall Length"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  onBlur={() => handleVariableBlur("name")}
                  className={
                    variableErrors.name && variableTouched.name
                      ? "border-red-500 pr-10"
                      : "pr-10"
                  }
                />
                {newVarName && (
                  <button
                    type="button"
                    onClick={() => setNewVarName("")}
                    className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                    tabIndex={-1}
                    aria-label="Clear variable name"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </button>
                )}
              </div>
              {variableErrors.name && variableTouched.name && (
                <p className="text-xs text-red-500">{variableErrors.name}</p>
              )}
            </div>
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
                    value={newVarDefaultVariableType}
                    onValueChange={setNewVarDefaultVariableType}
                  >
                    <SelectTrigger
                      className={`w-full ${
                        variableErrors.variable_type && variableTouched.variable_type
                          ? "border-red-500"
                          : ""
                      }`}
                    >
                      <SelectValue placeholder="Select a variable type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray((apiVariableTypes as any)?.data) ? (
                        (apiVariableTypes as any).data.map((type: any) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="default">Default Type</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {variableErrors.variable_type && variableTouched.variable_type && (
                    <p className="text-xs text-red-500">{variableErrors.variable_type}</p>
                  )}
                </>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-var-description">
                Description <span className="text-gray-500">&#40;Optional&#41;</span>
              </Label>
              <Textarea
                id="edit-var-description"
                placeholder="What this variable represents (optional)"
                value={newVarDescription}
                onChange={(e) => setNewVarDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditVariableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVariable} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>      <Dialog open={showEditTradeDialog} onOpenChange={setShowEditTradeDialog}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <BracesIcon className="mr-2 h-4 w-4" />
              Edit Trade
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-trade-name">
                Trade Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="edit-trade-name"
                  placeholder="Framing"
                  value={newTradeName}
                  onChange={(e) => setNewTradeName(e.target.value)}
                  onBlur={() => handleTradeBlur("name")}
                  className={
                    tradeErrors.name && tradeTouched.name
                      ? "border-red-500 pr-10"
                      : "pr-10"
                  }
                />
                {newTradeName && (
                  <button
                    type="button"
                    onClick={() => setNewTradeName("")}
                    className="absolute right-2 top-2.5 flex items-center focus:outline-none"
                    tabIndex={-1}
                    aria-label="Clear trade name"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </button>
                )}
              </div>
              {tradeErrors.name && tradeTouched.name && (
                <p className="text-xs text-red-500">
                  {tradeErrors.name}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-trade-description">
                Description <span className="text-gray-500">&#40;Optional&#41;</span>
              </Label>
              <Textarea
                id="edit-trade-description"
                placeholder="Description of what this trade covers"
                value={newTradeDescription}
                onChange={(e) => setNewTradeDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-trade-image">
                Trade Image <span className="text-gray-500">&#40;Optional&#41;</span>
              </Label>              <ImageUpload
                value={newTradeImage || ""}
                onChange={(value) => {
                  console.log("Edit trade image selected:", value);
                  setNewTradeImage(value || "");
                }}
                placeholder="Click or drag to upload a trade image"
                height={160}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditTradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTrade}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog for removing variables that are used in elements */}
      <ConfirmDialog 
        open={showRemoveVariableConfirm} 
        onOpenChange={setShowRemoveVariableConfirm}
      >
        <ConfirmDialogContent>
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Remove Variable</ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to remove the variable 
              <strong className="mx-1">{variableToRemove?.name}</strong>?
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This variable is used in {elementsUsingVariable.length} element{elementsUsingVariable.length !== 1 ? 's' : ''}:
            </p>
            <ul className="mt-2 text-sm list-disc pl-5">
              {elementsUsingVariable.map((element) => (
                <li key={element.id}>{element.name}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-destructive font-medium">
              Removing this variable may cause formula calculations to break.
            </p>
          </div>
          <ConfirmDialogFooter>
            <Button variant="outline" onClick={cancelRemoveVariable}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoveVariable}>
              Remove Variable
            </Button>
          </ConfirmDialogFooter>
        </ConfirmDialogContent>
      </ConfirmDialog>
    </div>
  );
};

export default TradesAndElementsStep;
