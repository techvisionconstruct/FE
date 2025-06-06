"use client";

import React from "react";
import { Badge } from "@/components/shared";
import Image from "next/image";
import { TemplateCreateRequest } from "@/types/templates/dto";
import { TradeResponse } from "@/types/trades/dto";
import { VariableResponse } from "@/types/variables/dto";
import { ImageIcon } from "lucide-react"; // Changed from @heroicons/react/outline to lucide-react
import { useFormula } from "./hooks/use-formula";

interface PreviewStepProps {
  data: TemplateCreateRequest;
  tradeObjects?: TradeResponse[];
  variableObjects?: VariableResponse[];
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  data,
  tradeObjects = [],
  variableObjects = [],
}) => {
  const { replaceIdsWithNamesInFormula } = useFormula();

  const DEFAULT_IMAGE =
    "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b";

  return (
    <div className="p-0 mx-auto">
      <div className="w-full max-w-8xl relative left-1/2 right-1/2 -translate-x-1/2 h-48 md:h-64 mb-4 rounded-2xl shadow">
        {data.image ? (
          <div className="relative w-full h-full">
            <Image
              src={data.image}
              alt={data.name || "Template Preview"}
              fill
              className="object-cover object-center rounded-2xl"
              priority
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center rounded-2xl">
            <div className="text-3xl font-bold text-center text-primary/70">
              Template Preview
            </div>
          </div>
        )}
      </div>
      <h2 className="text-4xl font-bold mb-2 tracking-tight leading-tight">
        {data.name || "Untitled Template"}
      </h2>
      <p className="text-lg text-muted-foreground mb-2">
        {data.description || "No description provided"}
      </p>

      <div className="flex flex-wrap gap-2 mt-3 mb-6">
        <Badge variant="outline" className="capitalize">
          Status: {data.status || "draft"}
        </Badge>
        <Badge variant="outline">{data.is_public ? "Public" : "Private"}</Badge>
      </div>

      {variableObjects.length > 0 && (
        <div className="mt-8 w-full">
          <h3 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Variables
          </h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {variableObjects.map((variable) => (
              <span
                key={variable.id}
                className="inline-block rounded bg-muted px-3 py-1 text-xs font-medium text-muted-foreground border"
              >
                {variable.name}
                {variable.value !== undefined && `: ${variable.value}`}
                {variable.variable_type && (
                  <span className="text-[10px] text-gray-400 ml-1">
                    ({variable.variable_type.name})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {tradeObjects.length > 0 && (
        <div className="mt-8 w-full">
          <h3 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Trades
          </h3>
          <div className="flex flex-col gap-4">
            {tradeObjects.map((trade) => (
              <div
                key={trade.id}
                className="rounded-lg border border-border bg-muted/40 px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  {trade.image ? (
                    <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0">
                      <Image
                        src={trade.image}
                        alt={trade.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium text-base">{trade.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {trade.description || "No description"}
                    </p>
                  </div>
                </div>

                {trade.elements && trade.elements.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                      Elements
                    </div>
                    {trade.elements.map((element) => (
                      <div className="flex flex-col mt-1" key={element.id}>
                        <div className="flex items-center gap-3 p-4 rounded border bg-background">
                          {element.image ? (
                            <div className="relative min-w-[40px] w-10 h-10 rounded-md overflow-hidden shrink-0">
                              <Image
                                src={element.image}
                                alt={element.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="min-w-[40px] w-10 h-10 rounded-md bg-muted/30 flex items-center justify-center shrink-0">
                              <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {element.name}
                            </div>
                            {element.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
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
                                    <span className="font-medium">
                                      Material:
                                    </span>{" "}
                                    <code className="bg-muted/50 px-1 rounded text-[10px]">
                                      {replaceIdsWithNamesInFormula(
                                        element.material_cost_formula,
                                        variableObjects,
                                        element.material_formula_variables ||
                                          [],
                                        undefined // No products data available in this component
                                      )}
                                    </code>
                                  </div>
                                )}
                                {element.labor_cost_formula && (
                                  <div className="text-xs">
                                    <span className="font-medium">Labor:</span>{" "}
                                    <code className="bg-muted/50 px-1 rounded text-[10px]">
                                      {replaceIdsWithNamesInFormula(
                                        element.labor_cost_formula,
                                        variableObjects,
                                        element.labor_formula_variables || [],
                                        undefined // No products data available in this component
                                      )}
                                    </code>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewStep;
