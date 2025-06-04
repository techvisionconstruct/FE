"use client";

import { TemplateList } from "@/components/features/template-page/template-list-view";
import { TemplateGridView } from "@/components/features/template-page/template-grid-view";
import { TemplateLoader } from "@/components/features/template-page/loader";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Input,
  Button,
} from "@/components/shared";
import { LayoutGrid, List, Search, Plus, HelpCircle } from "lucide-react";
import Link from "next/link";
import { TemplateTour } from "@/components/features/tour-guide/template-tour";
import { deleteTemplate } from "@/api-calls/templates/delete-template";
import { getTemplates } from "@/query-options/templates";
import { AlertError } from "@/components/features/alert-error/alert-error";
import { toast } from "sonner";

export default function TemplatesPage() {
  const [tab, setTab] = useState("grid");
  const [search, setSearch] = useState("");
  const [isTourRunning, setIsTourRunning] = useState(false);

  const queryClient = useQueryClient();

  // Override staleTime for this specific page to get fresh data
  const { data: templates, isError, isPending } = useQuery({
    ...getTemplates(),
    staleTime: 0, // Always fetch fresh data on this page
    // Or use a very short staleTime:
    // staleTime: 10 * 1000, // 10 seconds
  });
  const { mutate: deleteTemplateMutation, isPending: isDeleting } = useMutation(
    {
      mutationFn: (templateId: string) => deleteTemplate(templateId),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["template"] });
        toast.success("Template deleted successfully");
      },
      onError: (error: any) => {
        console.error("Error deleting template:", error);
        const errorMessage =
          error?.message || "Failed to delete template. Please try again.";
        toast.error(errorMessage);
      },
    }
  );

  const startTour = () => {
    setIsTourRunning(true);
  };

  if (isPending) {
    return <TemplateLoader />;
  }

  if (isError) {
    return <AlertError resource="templates" />;
  }

  const templateData = templates?.data || [];

  return (
    <div id="content">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold">Template Library</div>
        <Link
          href="/templates/create"
          id="new-template"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Create Template
          <Plus className="h-4 w-4" />
        </Link>
      </div>
      <div className="text-sm text-muted-foreground">
        Your personal library of ready-to-use templates — built once, used
        anytime. Streamline your workflow with ease.
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between my-4">
        <div className="relative flex-1 max-w-md w-full">
          <Input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
          <span className="absolute left-2 top-2.5 text-muted-foreground pointer-events-none">
            <Search className="h-4 w-4 ml-1" />
          </span>
        </div>
        <Tabs value={tab} onValueChange={setTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="grid">
              <LayoutGrid className="h-5 w-5" strokeWidth={1.5} />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-5 w-5" strokeWidth={1.5} />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>{" "}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsContent value="grid">
          <TemplateGridView
            templates={templateData}
            onDeleteTemplate={deleteTemplateMutation}
            isDeleting={isDeleting}
          />
        </TabsContent>
        <TabsContent value="list">
          <TemplateList
            templates={templateData}
            onDeleteTemplate={deleteTemplateMutation}
            isDeleting={isDeleting}
          />
        </TabsContent>
      </Tabs>
      {/* ================ Template Tour Guide ================ */}
      <TemplateTour isRunning={isTourRunning} setIsRunning={setIsTourRunning} />
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={startTour}
          variant="secondary"
          className="rounded-full w-12 h-12 shadow-lg bg-white text-gray-800 hover:bg-gray-100 border border-gray-200 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:text-gray-200"
          aria-label="Start tour guide"
        >
          <HelpCircle size={24} />
        </Button>
      </div>
    </div>
  );
}
