"use client";

import React from "react";
import { Badge } from "@/components/shared";
import { TemplateViewProps } from "@/types/templates/dto";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { FileText } from "lucide-react";
import { TemplateDropdownMenu } from "./template-dropdown-menu";

// Consistent default image across the application
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b";

interface TemplateListProps extends TemplateViewProps {
  onDeleteTemplate: (templateId: string) => void;
  isDeleting?: boolean;
}

export function TemplateList({ templates, onDeleteTemplate, isDeleting }: TemplateListProps) {
  const handleDelete = (templateId: string) => {
    onDeleteTemplate(templateId);
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" strokeWidth={1} />
        <h3 className="text-lg font-medium">No templates found</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          You haven't created any templates yet or none match your search.
        </p>
        <Link
          href="/templates/create"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90"
        >
          Create Your First Template
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border overflow-hidden shadow-sm">
        {templates.map((template, index) => (
          <div
            key={template.id}
            className={cn(
              "relative flex p-5 transition-colors hover:bg-accent/30",
              index !== templates.length - 1 && "border-b",
              index % 2 === 0 ? "bg-background" : "bg-muted/20"
            )}
          >
            <Link href={`/templates/${template.id}`} className="flex gap-5 flex-1 pr-10">
              <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0 border">
                <Image
                  src={template.image || DEFAULT_IMAGE}
                  alt={`${template.name} thumbnail`}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium mb-1">{template.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-2">
                  {template.trades?.slice(0, 3).map((trade) => (
                    <Badge key={trade.id} variant="secondary" className="text-xs">
                      {trade.name}
                    </Badge>
                  ))}
                  {template.trades && template.trades.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{template.trades.length - 3} more
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {template.variables?.slice(0, 3).map((variable) => (
                    <Badge key={variable.id} variant="outline" className="text-xs">
                      {variable.name}
                    </Badge>
                  ))}
                  {template.variables && template.variables.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{template.variables.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(template.updated_at), "MM/dd/yyyy")}
              </div>
            </Link>

            {/* Positioned dropdown menu */}
            <div className="absolute top-4 right-4">
              <TemplateDropdownMenu
                templateId={template.id}
                onDelete={handleDelete}
                isDeleting={isDeleting}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
