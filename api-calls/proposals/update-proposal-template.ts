

import { TemplateUpdateRequest } from "@/types/templates/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function updateProposalTemplate(
  templateId: string,
  template: TemplateUpdateRequest
) {
  try {
    const TOKEN = Cookies.get('auth-token');
    const payload: Record<string, any> = {};
    if (template.name !== undefined) payload.name = template.name;
    if (template.description !== undefined) payload.description = template.description;
    if (template.status !== undefined) payload.status = template.status;
    if (template.origin !== undefined) payload.origin = template.origin;
    if (template.is_public !== undefined) payload.is_public = template.is_public;
    if (template.source_id !== undefined) payload.source_id = template.source_id;
    if (template.trades !== undefined) payload.trades = template.trades;
    if (template.variables !== undefined) payload.variables = template.variables;

    const response = await fetch(
      `${API_URL}/v1/proposals/update-template/${templateId}/`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update template");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating template:", error);
    throw error;
  }
}
