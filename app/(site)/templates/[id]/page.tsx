"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { TemplateDetailedLoader } from "@/components/features/template-page/loader-detailed";
import { VariableResponse } from "@/types/variables/dto";
import { TradeResponse } from "@/types/trades/dto";
import { ElementResponse } from "@/types/elements/dto";
import { getTemplate } from "@/query-options/templates";
import { AlertError } from "@/components/features/alert-error/alert-error";
import { replaceVariableIdsWithNames } from "@/helpers/replace-variable-ids-with-names";
import { Button } from "@/components/shared";
import { Pencil, ImageIcon } from "lucide-react";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b";

export default function TemplatedById() {
  const { id } = useParams();
  // Explicitly cast id to string to avoid type issues
  const templateId = Array.isArray(id) ? id[0] : (id as string);
  
  // State to track which variable types are expanded
  const [expandedTypes, setExpandedTypes] = useState<Record<string, boolean>>({});

  const {
    data: template,
    isLoading,
    isError,
  } = useQuery(getTemplate(templateId));

  if (isLoading) {
    return <TemplateDetailedLoader />;
  }

  if (isError) {
    return <AlertError resource="template" />;
  }
console.log("Template data:", template);
  return (
    <div className="p-0 mx-auto">
      <div className="w-full max-w-8xl relative left-1/2 right-1/2 -translate-x-1/2 h-48 md:h-64 mb-4">
        <Image
          src={template.image || DEFAULT_IMAGE}
          alt={template?.name || "Template Image"}
          fill
          className="w-full h-full object-cover object-center rounded-2xl shadow"
          priority
        />
      </div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-4xl font-bold tracking-tight leading-tight">
          {template?.name}
        </h2>
        <Link href={`/templates/${templateId}/edit`}>
            <Button variant="outline" size="sm" className="flex items-center gap-1 ml-4 px-12">
            <Pencil className="h-4 w-4" />
            Edit
            </Button>
        </Link>
      </div>
      <p className="text-lg text-muted-foreground mb-2">
        {template?.description}
      </p>
      {template?.variables.length > 0 && (
        <div className="mt-8 w-full">
          <h3 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Variables
          </h3>
          {(() => {
            // Group variables by variable_type name
            const groupedVariables: Record<string, VariableResponse[]> = {};
            template.variables.forEach((variable: VariableResponse) => {
              const typeName = variable.variable_type?.name || 'Other';
              if (!groupedVariables[typeName]) {
                groupedVariables[typeName] = [];
              }
              groupedVariables[typeName].push(variable);
            });

            // Return the grouped variables UI in horizontal layout with limited display
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(groupedVariables).map(([typeName, variables]) => {
                  const isExpanded = expandedTypes[typeName] || false;
                  const visibleVariables = isExpanded ? variables : variables.slice(0, 3);
                  
                  return (
                    <div key={typeName}>
                      <h4 className="text-sm font-semibold mb-3 text-foreground">
                        {typeName}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {visibleVariables.map((variable: VariableResponse) => (
                          <span
                            key={variable.id}
                            className="rounded-full bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground border transition-colors hover:bg-muted"
                          >
                            {variable.name}
                          </span>
                        ))}
                        {variables.length > 3 && !isExpanded && (
                          <button
                            onClick={() => setExpandedTypes(prev => ({ ...prev, [typeName]: true }))}
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 transition-colors hover:bg-primary/20 cursor-pointer"
                          >
                            +{variables.length - 3} more
                          </button>
                        )}
                        {isExpanded && variables.length > 3 && (
                          <button
                            onClick={() => setExpandedTypes(prev => ({ ...prev, [typeName]: false }))}
                            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20 transition-colors hover:bg-primary/20 cursor-pointer"
                          >
                            Show less
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
      {template.trades.length > 0 && (
        <div className="mt-8 w-full">
          <h3 className="text-lg font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
            Trades
          </h3>
          <div className="flex flex-col gap-4">
            {template.trades.map((trade: TradeResponse) => (
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
                      {trade.description}
                    </p>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                    Elements
                  </div>
                  {trade.elements?.map((element: ElementResponse) => (
                    <div className="flex flex-col mt-1" key={element.id}>
                      <div className="flex items-start p-4 rounded-lg border bg-background hover:shadow-sm transition-all">
                        {/* Element Image */}
                        {element.image ? (
                          <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 mr-3">
                            <Image 
                              src={element.image}
                              alt={element.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-muted/30 flex items-center justify-center shrink-0 mr-3">
                            <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                        
                        {/* Element Details */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-sm">
                              {element.name}
                            </h5>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            {element.description}
                          </p>
                          <div className="grid grid-cols-2 gap-3 mt-1">
                            <div className="p-2 rounded-md bg-muted/40 border-l-2 border-primary/40">
                              <div className="text-xs font-medium text-muted-foreground">Material Formula</div>
                              <div className="text-sm mt-1 font-mono tracking-tighter leading-none">{element.material_cost_formula ? replaceVariableIdsWithNames(
                                element.material_cost_formula,
                                template.variables,
                                element.material_formula_variables || []
                              ) : ''}</div>
                            </div>
                            <div className="p-2 rounded-md bg-muted/40 border-l-2 border-primary/70">
                              <div className="text-xs font-medium text-muted-foreground">Labor Formula</div>
                              <div className="text-sm mt-1 font-mono tracking-tighter leading-none">{element.labor_cost_formula ? replaceVariableIdsWithNames(
                                element.labor_cost_formula,
                                template.variables,
                                element.labor_formula_variables || []
                              ) : ''}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
