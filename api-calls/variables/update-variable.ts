

import { VariableUpdateRequest } from "@/types/variables/dto";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function updateVariable(
  variableId: string,
  variable: VariableUpdateRequest
) {
  try {
    const TOKEN = Cookies.get('auth-token');
    const payload: Record<string, any> = {};
    if (variable.name !== undefined) payload.name = variable.name;
    if (variable.description !== undefined) payload.description = variable.description;
    if (variable.formula !== undefined) payload.formula = variable.formula;
    if (variable.value !== undefined) payload.value = variable.value;
    if (variable.is_global !== undefined) payload.is_global = variable.is_global;
    if (variable.variable_type !== undefined) payload.variable_type = variable.variable_type;
    
    const response = await fetch(
      `${API_URL}/v1/variables/update/${variableId}/`,
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
      throw new Error(
        errorData.detail || `Failed to update variable: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating variable:", error);
    throw error;
  }
}
