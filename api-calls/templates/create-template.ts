

import { TemplateCreateRequest } from "@/types/templates/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function createTemplate(template: TemplateCreateRequest) {
  try {
    const TOKEN = Cookies.get("auth-token");
    const payload: Record<string, any> = {};

    if (template.name) payload.name = template.name;
    if (template.description) payload.description = template.description;
    if (template.image) payload.image = template.image; // Include image field
    if (template.status) payload.status = template.status;
    if (template.origin) payload.origin = template.origin;
    if (template.source_id) payload.source_id = template.source_id;
    if (template.trades) payload.trades = template.trades;
    if (template.variables) payload.variables = template.variables;
    if (template.is_public !== undefined) payload.is_public = template.is_public;
    
    const response = await fetch(`${API_URL}/v1/templates/create/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to create template')
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating template:', error)
    throw error
  }
}
